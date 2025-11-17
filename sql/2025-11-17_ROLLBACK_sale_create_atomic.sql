-- ROLLBACK: Restore sale_create_atomic to working version (2025-11-11)
-- This version uses TEXT for p_user_id and lowercase column names (no quoted identifiers)

-- Drop all versions
DROP FUNCTION IF EXISTS public.sale_create_atomic CASCADE;

-- Restore working version
CREATE OR REPLACE FUNCTION public.sale_create_atomic(
  p_sale_id TEXT,
  p_items JSONB,
  p_discount NUMERIC,
  p_customer JSONB,
  p_payment_method TEXT,
  p_user_id TEXT,
  p_user_name TEXT,
  p_branch_id TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subtotal NUMERIC := 0;
  v_total NUMERIC := 0;
  v_item JSONB;
  v_index INT := 0;
  v_items_count INT := jsonb_array_length(p_items);
  v_part_id TEXT;
  v_part_name TEXT;
  v_quantity INT;
  v_price NUMERIC;
  v_current_stock INT;
  v_sale_row JSONB;
  v_cash_tx_id TEXT := gen_random_uuid()::text;
  v_inventory_tx_count INT := 0;
  v_insufficient JSONB := '[]'::jsonb;
BEGIN
  -- Authorization & branch scope guard (RLS bypass prevention)
  -- Function runs SECURITY DEFINER so we must enforce role explicitly
  IF NOT public.mc_is_manager_or_owner() THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;
  -- Ensure caller cannot operate on a different branch than their own
  IF p_branch_id IS DISTINCT FROM public.mc_current_branch() THEN
    RAISE EXCEPTION 'BRANCH_MISMATCH';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR v_items_count = 0 THEN
    RAISE EXCEPTION 'EMPTY_ITEMS';
  END IF;
  IF p_payment_method NOT IN ('cash','bank') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_METHOD';
  END IF;

  -- Calculate subtotal
  FOR v_index IN 0..(v_items_count - 1) LOOP
    v_item := p_items->v_index;
    v_part_id := (v_item->>'partId');
    v_part_name := (v_item->>'partName');
    v_quantity := COALESCE((v_item->>'quantity')::int,0);
    v_price := COALESCE((v_item->>'sellingPrice')::numeric,0);
    IF v_part_id IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'INVALID_ITEM';
    END IF;
    v_subtotal := v_subtotal + (v_price * v_quantity);
  END LOOP;

  v_total := GREATEST(0, v_subtotal - COALESCE(p_discount,0));

  -- Validate and decrement stock
  FOR v_index IN 0..(v_items_count - 1) LOOP
    v_item := p_items->v_index;
    v_part_id := (v_item->>'partId');
    v_part_name := (v_item->>'partName');
    v_quantity := COALESCE((v_item->>'quantity')::int,0);

    SELECT COALESCE((stock->>p_branch_id)::int,0) INTO v_current_stock FROM parts WHERE id = v_part_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'PART_NOT_FOUND';
    END IF;
    IF v_current_stock < v_quantity THEN
      v_insufficient := v_insufficient || jsonb_build_object(
        'partId', v_part_id,
        'partName', v_part_name,
        'requested', v_quantity,
        'available', v_current_stock
      );
      CONTINUE; -- collect all then raise after loop
    END IF;
    -- Decrement stock JSONB
    UPDATE parts SET stock = jsonb_set(stock, ARRAY[p_branch_id], to_jsonb(v_current_stock - v_quantity), true) WHERE id = v_part_id;

    -- Insert inventory_transactions (Xuất kho) with cost snapshot (average cost)
    INSERT INTO inventory_transactions(id, type, partId, partName, quantity, date, unitPrice, totalPrice, branchId, notes, saleId)
    VALUES (
      gen_random_uuid()::text,
      'Xuất kho',
      v_part_id,
      v_part_name,
      v_quantity,
      NOW(),
      public.mc_avg_cost(v_part_id, p_branch_id),
      public.mc_avg_cost(v_part_id, p_branch_id) * v_quantity,
      p_branch_id,
      'Bán hàng',
      p_sale_id
    );
    v_inventory_tx_count := v_inventory_tx_count + 1;
  END LOOP;

  -- If any insufficient collected, raise with details prefix for client mapping
  IF jsonb_array_length(v_insufficient) > 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_STOCK:%', v_insufficient::text;
  END IF;

  -- Insert sale row
  INSERT INTO sales(id, date, items, subtotal, discount, total, customer, paymentMethod, userId, branchId)
  VALUES (p_sale_id, NOW(), p_items, v_subtotal, p_discount, v_total, p_customer, p_payment_method, p_user_id, p_branch_id);

  -- Cash transaction (income)
  INSERT INTO cash_transactions(id, category, amount, date, description, branchId, paymentSource, reference)
  VALUES (v_cash_tx_id, 'sale_income', v_total, NOW(), 'Thu từ hóa đơn '||p_sale_id, p_branch_id, p_payment_method, p_sale_id);

  -- Prepare return JSON
  SELECT jsonb_build_object(
    'sale', to_jsonb(s.*),
    'cashTransactionId', v_cash_tx_id,
    'inventoryTxCount', v_inventory_tx_count
  ) INTO v_sale_row
  FROM sales s WHERE s.id = p_sale_id;

  -- Insert audit log (best-effort within transaction)
  BEGIN
    INSERT INTO audit_logs(id, user_id, action, table_name, record_id, old_data, new_data, ip_address, user_agent, created_at)
    VALUES (
      gen_random_uuid()::text,
      COALESCE(p_user_id, null),
      'sale.create',
      'sales',
      p_sale_id,
      NULL,
      v_sale_row->'sale',
      NULL,
      NULL,
      NOW()
    );
  EXCEPTION WHEN OTHERS THEN
    -- swallow audit errors
    NULL;
  END;

  RETURN v_sale_row;
  EXCEPTION
  WHEN OTHERS THEN
    -- Any error causes full rollback due to exception propagation; keep original error text
    RAISE;
END;
$$;

COMMENT ON FUNCTION public.sale_create_atomic IS 'Tạo hóa đơn và cập nhật tồn kho + giao dịch tiền mặt trong 1 transaction (atomic).';

-- Grant execute to authenticated role
GRANT EXECUTE ON FUNCTION public.sale_create_atomic TO authenticated;
