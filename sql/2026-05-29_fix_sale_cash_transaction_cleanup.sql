-- Fix sale cash transaction linkage and cleanup
-- Date: 2026-05-29
-- Purpose:
-- - Store the generated cash transaction id on sales.cashtransactionid.
-- - Store saleid on cash_transactions for reliable reverse lookup.
-- - Delete linked sale cash transactions when deleting a sale, including legacy rows.

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS cashtransactionid TEXT;

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS note TEXT;

ALTER TABLE public.cash_transactions
  ADD COLUMN IF NOT EXISTS saleid TEXT;

CREATE INDEX IF NOT EXISTS idx_cash_transactions_saleid
  ON public.cash_transactions(saleid);

WITH linked_cash_transactions AS (
  SELECT DISTINCT ON (s.id)
    s.id AS sale_id,
    ct.id AS cash_tx_id
  FROM public.sales s
  JOIN public.cash_transactions ct
    ON ct.id = s.cashtransactionid
    OR ct.saleid = s.id
    OR ct.reference IN (s.id, COALESCE(s.sale_code, s.id))
    OR (
      ct.category = 'sale_income'
      AND (
        ct.description ILIKE '%' || s.id || '%'
        OR (s.sale_code IS NOT NULL AND ct.description ILIKE '%' || s.sale_code || '%')
      )
    )
  WHERE s.cashtransactionid IS NULL
  ORDER BY s.id, ct.date DESC NULLS LAST, ct.id DESC
)
UPDATE public.sales s
SET cashtransactionid = linked_cash_transactions.cash_tx_id
FROM linked_cash_transactions
WHERE s.id = linked_cash_transactions.sale_id
  AND s.cashtransactionid IS NULL;

DROP FUNCTION IF EXISTS public.sale_create_atomic(TEXT, JSONB, NUMERIC, JSONB, TEXT, UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.sale_create_atomic(TEXT, JSONB, NUMERIC, JSONB, TEXT, UUID, TEXT, TEXT, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.sale_create_atomic(
  p_sale_id TEXT,
  p_items JSONB,
  p_discount NUMERIC,
  p_customer JSONB,
  p_payment_method TEXT,
  p_user_id UUID DEFAULT NULL,
  p_user_name TEXT DEFAULT NULL,
  p_branch_id TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL
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
  v_current_reserved INT;
  v_available_stock INT;
  v_cash_tx_id TEXT := gen_random_uuid()::text;
  v_inventory_tx_count INT := 0;
  v_insufficient JSONB := '[]'::jsonb;
  v_sale_code TEXT;
  v_is_quick_service BOOLEAN;
BEGIN
  IF NOT public.mc_is_manager_or_owner() THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;
  IF p_branch_id IS DISTINCT FROM public.mc_current_branch() THEN
    RAISE EXCEPTION 'BRANCH_MISMATCH';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR v_items_count = 0 THEN
    RAISE EXCEPTION 'EMPTY_ITEMS';
  END IF;
  IF p_payment_method NOT IN ('cash','bank') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_METHOD';
  END IF;

  FOR v_index IN 0..(v_items_count - 1) LOOP
    v_item := p_items->v_index;
    v_part_id := (v_item->>'partId');
    v_part_name := COALESCE((v_item->>'partName'), (v_item->>'name'));
    v_quantity := COALESCE((v_item->>'quantity')::int, 0);
    v_price := COALESCE((v_item->>'sellingPrice')::numeric, (v_item->>'price')::numeric, 0);

    IF v_part_id IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'INVALID_ITEM';
    END IF;
    v_subtotal := v_subtotal + (v_price * v_quantity);
  END LOOP;

  v_total := GREATEST(0, v_subtotal - COALESCE(p_discount, 0));

  FOR v_index IN 0..(v_items_count - 1) LOOP
    v_item := p_items->v_index;
    v_part_id := (v_item->>'partId');
    v_part_name := COALESCE((v_item->>'partName'), (v_item->>'name'));
    v_quantity := COALESCE((v_item->>'quantity')::int, 0);

    v_is_quick_service := (v_part_id LIKE 'quick_service_%') OR COALESCE((v_item->>'isService')::boolean, false);
    IF v_is_quick_service THEN
      CONTINUE;
    END IF;

    SELECT
      COALESCE((stock->>p_branch_id)::int, 0),
      COALESCE((reservedstock->>p_branch_id)::int, 0)
    INTO v_current_stock, v_current_reserved
    FROM parts
    WHERE id = v_part_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'PART_NOT_FOUND';
    END IF;

    v_available_stock := v_current_stock - v_current_reserved;

    IF v_available_stock < v_quantity THEN
      v_insufficient := v_insufficient || jsonb_build_array(jsonb_build_object(
        'partId', v_part_id,
        'partName', v_part_name,
        'available', v_available_stock,
        'requested', v_quantity
      ));
      CONTINUE;
    END IF;

    UPDATE parts
    SET stock = jsonb_set(stock, ARRAY[p_branch_id], to_jsonb(v_current_stock - v_quantity), true)
    WHERE id = v_part_id;

    INSERT INTO inventory_transactions(id, type, "partId", "partName", quantity, date, "unitPrice", "totalPrice", "branchId", notes, "saleId")
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

  IF jsonb_array_length(v_insufficient) > 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_STOCK:%', v_insufficient::text;
  END IF;

  INSERT INTO sales(
    id, date, items, subtotal, discount, total, customer, paymentmethod,
    userid, username, branchid, note, cashtransactionid
  )
  VALUES (
    p_sale_id, NOW(), p_items, v_subtotal, p_discount, v_total, p_customer,
    p_payment_method, p_user_id, p_user_name, p_branch_id,
    NULLIF(TRIM(COALESCE(p_note, '')), ''), v_cash_tx_id
  )
  RETURNING sale_code INTO v_sale_code;

  INSERT INTO cash_transactions(id, type, category, amount, date, description, branchid, paymentsource, reference, saleid)
  VALUES (
    v_cash_tx_id,
    'income',
    'sale_income',
    v_total,
    NOW(),
    'Thu từ hóa đơn ' || COALESCE(v_sale_code, p_sale_id),
    p_branch_id,
    p_payment_method,
    COALESCE(v_sale_code, p_sale_id),
    p_sale_id
  );

  RETURN jsonb_build_object(
    'sale', (SELECT row_to_json(s) FROM sales s WHERE s.id = p_sale_id),
    'cashTransactionId', v_cash_tx_id,
    'inventoryTxCount', v_inventory_tx_count
  );
END;
$$;

COMMENT ON FUNCTION public.sale_create_atomic IS 'Tạo hóa đơn và cập nhật tồn kho + giao dịch tiền mặt trong 1 transaction. Lưu cashtransactionid/saleid để xóa hóa đơn dọn phiếu thu chính xác.';

GRANT EXECUTE ON FUNCTION public.sale_create_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION public.sale_create_atomic TO service_role;

DROP FUNCTION IF EXISTS public.sale_delete_atomic(TEXT);

CREATE OR REPLACE FUNCTION public.sale_delete_atomic(p_sale_id TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sale RECORD;
  v_item JSONB;
  v_part_id TEXT;
  v_branch_id TEXT;
  v_quantity INT;
  v_restored_count INT := 0;
  v_deleted_cash_count INT := 0;
BEGIN
  SELECT * INTO v_sale FROM public.sales WHERE id = p_sale_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SALE_NOT_FOUND:%', p_sale_id;
  END IF;

  v_branch_id := COALESCE(v_sale.branchid, 'CN1');

  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(v_sale.items, '[]'::jsonb))
  LOOP
    v_part_id := v_item->>'partId';
    v_quantity := COALESCE((v_item->>'quantity')::int, 0);

    IF v_part_id IS NOT NULL
      AND v_part_id <> ''
      AND v_part_id NOT LIKE 'quick_service_%'
      AND NOT COALESCE((v_item->>'isService')::boolean, false)
      AND v_quantity > 0
    THEN
      UPDATE public.parts
      SET stock = jsonb_set(
        COALESCE(stock, '{}'::jsonb),
        ARRAY[v_branch_id],
        to_jsonb(COALESCE((stock->>v_branch_id)::int, 0) + v_quantity),
        true
      )
      WHERE id = v_part_id;

      INSERT INTO public.inventory_transactions(
        id, type, "partId", "partName", quantity, "branchId", notes, date
      )
      VALUES (
        gen_random_uuid()::text,
        'Nhập kho',
        v_part_id,
        COALESCE(v_item->>'partName', v_item->>'name'),
        v_quantity,
        v_branch_id,
        'Hoàn kho - xóa hóa đơn ' || COALESCE(v_sale.sale_code, p_sale_id),
        NOW()
      );

      v_restored_count := v_restored_count + 1;
    END IF;
  END LOOP;

  DELETE FROM public.cash_transactions
  WHERE id = v_sale.cashtransactionid
     OR saleid = p_sale_id
     OR reference IN (p_sale_id, COALESCE(v_sale.sale_code, p_sale_id))
     OR (
       category = 'sale_income'
       AND (
         description ILIKE '%' || p_sale_id || '%'
         OR (v_sale.sale_code IS NOT NULL AND description ILIKE '%' || v_sale.sale_code || '%')
       )
     );
  GET DIAGNOSTICS v_deleted_cash_count = ROW_COUNT;

  DELETE FROM public.sales WHERE id = p_sale_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Đã xóa hóa đơn, hoàn kho và xóa phiếu thu liên quan',
    'restoredItems', v_restored_count,
    'deletedCashTransactions', v_deleted_cash_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sale_delete_atomic(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sale_delete_atomic(TEXT) TO service_role;
