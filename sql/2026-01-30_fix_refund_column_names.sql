-- Fix work_order_refund_atomic: Handle mixed column naming
-- Problem: work_orders uses lowercase, but inventory_transactions uses camelCase with quotes
-- This version uses explicit column references

DROP FUNCTION IF EXISTS public.work_order_refund_atomic;

CREATE OR REPLACE FUNCTION public.work_order_refund_atomic(
  p_order_id TEXT,
  p_refund_reason TEXT,
  p_user_id TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_row RECORD;
  v_part JSONB;
  v_part_id TEXT;
  v_part_name TEXT;
  v_quantity INT;
  v_current_stock INT;
  v_current_reserved INT;
  v_refund_tx_id TEXT;
  v_total_refund NUMERIC := 0;
  v_result JSONB;
  v_branch_id TEXT;
BEGIN
  -- Authorization check
  IF NOT public.mc_is_manager_or_owner() THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  -- Get existing order (all column names are lowercase in PostgreSQL)
  SELECT * INTO v_order_row
  FROM work_orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND';
  END IF;

  -- Check if already refunded
  IF v_order_row.refunded = TRUE THEN
    RAISE EXCEPTION 'ALREADY_REFUNDED';
  END IF;

  -- Get branch ID (lowercase column name)
  v_branch_id := v_order_row.branchid;

  -- Branch scope guard
  IF v_branch_id IS DISTINCT FROM public.mc_current_branch() THEN
    RAISE EXCEPTION 'BRANCH_MISMATCH';
  END IF;

  -- 🔹 STEP 1: Handle inventory based on whether it was deducted
  IF v_order_row.partsused IS NOT NULL THEN
    FOR v_part IN SELECT * FROM jsonb_array_elements(v_order_row.partsused)
    LOOP
      v_part_id := (v_part->>'partId');
      v_part_name := (v_part->>'partName');
      v_quantity := COALESCE((v_part->>'quantity')::int, 0);

      IF v_quantity > 0 THEN
        -- Get current stock and reserved with row lock
        SELECT 
          COALESCE((stock->>v_branch_id)::int, 0),
          COALESCE((reservedstock->>v_branch_id)::int, 0)
        INTO v_current_stock, v_current_reserved
        FROM parts WHERE id = v_part_id FOR UPDATE;

        IF FOUND THEN
          IF COALESCE(v_order_row.inventory_deducted, FALSE) THEN
            -- Inventory was deducted: restore actual stock
            UPDATE parts
            SET stock = jsonb_set(
              stock, 
              ARRAY[v_branch_id], 
              to_jsonb(v_current_stock + v_quantity), 
              true
            )
            WHERE id = v_part_id;

            -- Create inventory transaction (Nhập kho - refund)
            -- Use lowercase column names
            INSERT INTO inventory_transactions(
              id, type, partid, partname, quantity, date, unitprice, totalprice,
              branchid, notes, workorderid
            )
            VALUES (
              gen_random_uuid()::text,
              'Nhập kho',
              v_part_id,
              v_part_name,
              v_quantity,
              NOW(),
              public.mc_avg_cost(v_part_id, v_branch_id),
              public.mc_avg_cost(v_part_id, v_branch_id) * v_quantity,
              v_branch_id,
              'Hoàn trả do hủy phiếu: ' || COALESCE(p_refund_reason, 'Không rõ'),
              p_order_id
            );
          ELSE
            -- Inventory not deducted: just release reservation
            UPDATE parts
            SET reservedstock = jsonb_set(
              COALESCE(reservedstock, '{}'::jsonb),
              ARRAY[v_branch_id],
              to_jsonb(GREATEST(0, v_current_reserved - v_quantity)),
              true
            )
            WHERE id = v_part_id;
          END IF;
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- 🔹 STEP 2: Calculate total refund amount
  v_total_refund := COALESCE(v_order_row.totalpaid, 0);

  -- Create refund cash transaction if customer paid anything
  IF v_total_refund > 0 AND v_order_row.paymentmethod IS NOT NULL THEN
    v_refund_tx_id := gen_random_uuid()::text;
    
    -- cash_transactions uses lowercase column names
    INSERT INTO cash_transactions(
      id, category, amount, date, description, branchid, paymentsource, reference
    )
    VALUES (
      v_refund_tx_id,
      'refund',
      -v_total_refund, -- Negative amount for refund
      NOW(),
      'Hoàn tiền hủy phiếu ' || p_order_id || ' - ' || COALESCE(p_refund_reason, ''),
      v_branch_id,
      v_order_row.paymentmethod,
      p_order_id
    );
  END IF;

  -- Mark order as refunded (work_orders uses lowercase)
  UPDATE work_orders
  SET
    refunded = TRUE,
    refunded_at = NOW(),
    refund_transaction_id = v_refund_tx_id,
    refund_reason = p_refund_reason,
    status = 'Đã hủy',
    paymentstatus = 'refunded'
  WHERE id = p_order_id;

  -- Prepare return JSON
  SELECT jsonb_build_object(
    'workOrder', to_jsonb(w.*),
    'refund_transaction_id', v_refund_tx_id,
    'refundAmount', v_total_refund,
    'inventoryRestored', COALESCE(v_order_row.inventory_deducted, FALSE),
    'reservationsReleased', NOT COALESCE(v_order_row.inventory_deducted, FALSE)
  ) INTO v_result
  FROM work_orders w WHERE w.id = p_order_id;

  -- Audit log (best-effort)
  BEGIN
    INSERT INTO audit_logs(
      id, user_id, action, table_name, record_id, old_data, new_data, created_at
    )
    VALUES (
      gen_random_uuid()::text,
      COALESCE(p_user_id, NULL),
      'work_order.refund',
      'work_orders',
      p_order_id,
      to_jsonb(v_order_row),
      v_result->'workOrder',
      NOW()
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

COMMENT ON FUNCTION public.work_order_refund_atomic IS 'Hoàn tiền và giải phóng tồn kho cho phiếu sửa chữa bị hủy (atomic). Fixed mixed column names.';

GRANT EXECUTE ON FUNCTION public.work_order_refund_atomic TO authenticated;
