-- Hotfix: make work_order_complete_payment resilient against duplicate submit/retry
-- Date: 2026-03-23
-- Goal:
-- 1) Ignore duplicate payment calls within a short window
-- 2) Reject payment amount larger than remaining amount
-- 3) Keep inventory deduction logic intact and one-time

CREATE OR REPLACE FUNCTION public.work_order_complete_payment(
  p_order_id TEXT,
  p_payment_method TEXT,
  p_payment_amount NUMERIC,
  p_user_id TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_part JSONB;
  v_part_id TEXT;
  v_part_name TEXT;
  v_quantity INT;
  v_current_stock INT;
  v_current_reserved INT;
  v_payment_tx_id TEXT;
  v_new_total_paid NUMERIC;
  v_new_remaining NUMERIC;
  v_new_payment_status TEXT;
  v_result JSONB;
  v_insufficient JSONB := '[]'::jsonb;
  v_duplicate_payment_tx_id TEXT;
  v_remaining_before NUMERIC;
BEGIN
  -- Authorization check
  IF NOT public.mc_is_manager_or_owner() THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  -- Get existing order with row lock to serialize concurrent payments
  SELECT * INTO v_order
  FROM work_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND';
  END IF;

  -- Branch scope guard
  IF v_order.branchid IS DISTINCT FROM public.mc_current_branch() THEN
    RAISE EXCEPTION 'BRANCH_MISMATCH';
  END IF;

  -- Check if already refunded
  IF v_order.refunded = TRUE THEN
    RAISE EXCEPTION 'ORDER_REFUNDED';
  END IF;

  -- Ignore duplicate retries/taps: same order + method + amount in recent window
  IF p_payment_amount > 0 AND p_payment_method IS NOT NULL THEN
    SELECT ct.id
    INTO v_duplicate_payment_tx_id
    FROM cash_transactions ct
    WHERE ct.reference = p_order_id
      AND ct.category = 'service_income'
      AND ct.amount = p_payment_amount
      AND COALESCE(ct."paymentSource", '') = p_payment_method
      AND ct.date >= NOW() - INTERVAL '20 seconds'
    ORDER BY ct.date DESC
    LIMIT 1;

    IF v_duplicate_payment_tx_id IS NOT NULL THEN
      SELECT jsonb_build_object(
        'workOrder', to_jsonb(w.*),
        'paymentTransactionId', v_duplicate_payment_tx_id,
        'newPaymentStatus', w.paymentstatus,
        'inventoryDeducted', COALESCE(w.inventory_deducted, FALSE),
        'duplicatePaymentIgnored', TRUE
      ) INTO v_result
      FROM work_orders w
      WHERE w.id = p_order_id;

      RETURN v_result;
    END IF;
  END IF;

  -- Validate non-negative payment
  IF p_payment_amount < 0 THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_AMOUNT';
  END IF;

  -- Prevent over-collection
  v_remaining_before := GREATEST(0, COALESCE(v_order.remainingamount, v_order.total - COALESCE(v_order.totalpaid, 0)));
  IF p_payment_amount > v_remaining_before THEN
    RAISE EXCEPTION 'PAYMENT_EXCEEDS_REMAINING';
  END IF;

  -- Calculate new payment totals
  v_new_total_paid := COALESCE(v_order.totalpaid, 0) + p_payment_amount;
  v_new_remaining := v_order.total - v_new_total_paid;

  -- Determine new payment status
  IF v_new_remaining <= 0 THEN
    v_new_payment_status := 'paid';
  ELSIF v_new_total_paid > 0 THEN
    v_new_payment_status := 'partial';
  ELSE
    v_new_payment_status := 'unpaid';
  END IF;

  -- If becoming fully paid and inventory not yet deducted, deduct now
  IF v_new_payment_status = 'paid' AND COALESCE(v_order.inventory_deducted, FALSE) = FALSE THEN
    IF v_order.partsused IS NOT NULL THEN
      FOR v_part IN SELECT * FROM jsonb_array_elements(v_order.partsused)
      LOOP
        v_part_id := (v_part->>'partId');
        v_part_name := (v_part->>'partName');
        v_quantity := COALESCE((v_part->>'quantity')::int, 0);

        IF v_quantity > 0 THEN
          SELECT
            COALESCE((stock->>v_order.branchid)::int, 0),
            COALESCE((reservedstock->>v_order.branchid)::int, 0)
          INTO v_current_stock, v_current_reserved
          FROM parts WHERE id = v_part_id FOR UPDATE;

          IF NOT FOUND THEN
            RAISE EXCEPTION 'PART_NOT_FOUND: %', v_part_id;
          END IF;

          IF v_current_stock < v_quantity THEN
            v_insufficient := v_insufficient || jsonb_build_object(
              'partId', v_part_id,
              'partName', v_part_name,
              'requested', v_quantity,
              'available', v_current_stock
            );
            CONTINUE;
          END IF;

          UPDATE parts
          SET reservedstock = jsonb_set(
            COALESCE(reservedstock, '{}'::jsonb),
            ARRAY[v_order.branchid],
            to_jsonb(GREATEST(0, v_current_reserved - v_quantity)),
            true
          )
          WHERE id = v_part_id;

          UPDATE parts
          SET stock = jsonb_set(
            stock,
            ARRAY[v_order.branchid],
            to_jsonb(v_current_stock - v_quantity),
            true
          )
          WHERE id = v_part_id;

          INSERT INTO inventory_transactions(
            id, type, "partId", "partName", quantity, date, "unitPrice", "totalPrice",
            "branchId", notes, "workOrderId"
          )
          VALUES (
            gen_random_uuid()::text,
            'Xuất kho',
            v_part_id,
            v_part_name,
            v_quantity,
            NOW(),
            public.mc_avg_cost(v_part_id, v_order.branchid),
            public.mc_avg_cost(v_part_id, v_order.branchid) * v_quantity,
            v_order.branchid,
            'Xuất kho khi thanh toán phiếu sửa',
            p_order_id
          );
        END IF;
      END LOOP;

      IF jsonb_array_length(v_insufficient) > 0 THEN
        RAISE EXCEPTION 'INSUFFICIENT_STOCK:%', v_insufficient::text;
      END IF;
    END IF;
  END IF;

  -- Create payment transaction only when amount > 0
  IF p_payment_amount > 0 AND p_payment_method IS NOT NULL THEN
    v_payment_tx_id := gen_random_uuid()::text;
    INSERT INTO cash_transactions(
      id, category, amount, date, description, "branchId", "paymentSource", reference
    )
    VALUES (
      v_payment_tx_id,
      'service_income',
      p_payment_amount,
      NOW(),
      'Thanh toán phiếu sửa chữa ' || p_order_id,
      v_order.branchid,
      p_payment_method,
      p_order_id
    );
  END IF;

  UPDATE work_orders
  SET
    paymentstatus = v_new_payment_status,
    paymentmethod = COALESCE(p_payment_method, paymentmethod),
    totalpaid = v_new_total_paid,
    remainingamount = GREATEST(0, v_new_remaining),
    additionalpayment = COALESCE(additionalpayment, 0) + p_payment_amount,
    cashtransactionid = COALESCE(v_payment_tx_id, cashtransactionid),
    paymentdate = CASE WHEN v_payment_tx_id IS NOT NULL THEN NOW() ELSE paymentdate END,
    inventory_deducted = CASE WHEN v_new_payment_status = 'paid' THEN TRUE ELSE inventory_deducted END
  WHERE id = p_order_id;

  SELECT jsonb_build_object(
    'workOrder', to_jsonb(w.*),
    'paymentTransactionId', v_payment_tx_id,
    'newPaymentStatus', v_new_payment_status,
    'inventoryDeducted', (v_new_payment_status = 'paid')
  ) INTO v_result
  FROM work_orders w WHERE w.id = p_order_id;

  BEGIN
    INSERT INTO audit_logs(
      id, user_id, action, table_name, record_id, old_data, new_data, created_at
    )
    VALUES (
      gen_random_uuid()::text,
      COALESCE(p_user_id, NULL),
      'work_order.payment',
      'work_orders',
      p_order_id,
      jsonb_build_object('totalPaid', v_order.totalpaid, 'paymentStatus', v_order.paymentstatus),
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

COMMENT ON FUNCTION public.work_order_complete_payment IS 'Thanh toán phiếu sửa chữa (idempotent): chống duplicate submit và không cho thu vượt số còn lại.';
GRANT EXECUTE ON FUNCTION public.work_order_complete_payment TO authenticated;
