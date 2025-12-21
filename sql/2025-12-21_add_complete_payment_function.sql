-- Add missing work_order_complete_payment function
-- This function handles payment completion and stock deduction

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
  v_total_paid NUMERIC;
  v_remaining NUMERIC;
  v_new_status TEXT;
  v_user_branch TEXT;
  v_should_deduct_inventory BOOLEAN;
BEGIN
  -- Get user's branch
  SELECT branch_id INTO v_user_branch
  FROM public.profiles
  WHERE id = auth.uid();
  
  IF v_user_branch IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  -- Get order
  SELECT * INTO v_order FROM work_orders WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND';
  END IF;

  IF v_order.branchId IS DISTINCT FROM v_user_branch THEN
    RAISE EXCEPTION 'BRANCH_MISMATCH';
  END IF;

  -- Calculate new totals
  v_total_paid := COALESCE(v_order.totalPaid, 0) + p_payment_amount;
  v_remaining := v_order.total - v_total_paid;

  -- Determine new payment status
  IF v_remaining <= 0 THEN
    v_new_status := 'paid';
    v_remaining := 0;
  ELSIF v_total_paid > 0 THEN
    v_new_status := 'partial';
  ELSE
    v_new_status := 'unpaid';
  END IF;

  -- Only deduct inventory if: (1) Fully paid AND (2) Not deducted before
  v_should_deduct_inventory := (v_new_status = 'paid' AND COALESCE(v_order.inventory_deducted, FALSE) = FALSE);

  -- Create payment transaction
  IF p_payment_amount > 0 AND p_payment_method IS NOT NULL THEN
    v_payment_tx_id := gen_random_uuid()::text;
    INSERT INTO cash_transactions(
      id, type, category, amount, date, description, branchid, paymentsource, reference
    )
    VALUES (
      v_payment_tx_id,
      'income',
      'service_income',
      p_payment_amount,
      NOW(),
      'Thanh toán sửa chữa ' || p_order_id,
      v_order.branchid,
      p_payment_method,
      p_order_id
    );
  END IF;

  -- Deduct inventory when fully paid
  IF v_should_deduct_inventory AND v_order.partsUsed IS NOT NULL THEN
    FOR v_part IN SELECT * FROM jsonb_array_elements(v_order.partsUsed)
    LOOP
      v_part_id := (v_part->>'partId');
      v_part_name := (v_part->>'partName');
      v_quantity := COALESCE((v_part->>'quantity')::int, 0);

      IF v_part_id IS NULL OR v_quantity <= 0 THEN
        CONTINUE;
      END IF;

      -- Get current stock and reserved
      SELECT 
        COALESCE((stock->>v_order.branchid)::int, 0),
        COALESCE((reserved->>v_order.branchid)::int, 0)  -- ✅ FIXED: Use 'reserved' not 'reservedstock'
      INTO v_current_stock, v_current_reserved
      FROM parts WHERE id = v_part_id FOR UPDATE;

      IF NOT FOUND THEN
        CONTINUE;
      END IF;

      -- 1. Decrease reserved
      UPDATE parts
      SET reserved = jsonb_set(  -- ✅ FIXED: Use 'reserved' not 'reservedstock'
        COALESCE(reserved, '{}'::jsonb),
        ARRAY[v_order.branchid],
        to_jsonb(GREATEST(0, v_current_reserved - v_quantity))
      )
      WHERE id = v_part_id;

      -- 2. Decrease actual stock
      UPDATE parts
      SET stock = jsonb_set(
        stock,
        ARRAY[v_order.branchid],
        to_jsonb(GREATEST(0, v_current_stock - v_quantity))
      )
      WHERE id = v_part_id;

      -- 3. Create inventory transaction
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
        COALESCE((v_part->>'price')::numeric, 0),
        COALESCE((v_part->>'price')::numeric, 0) * v_quantity,
        v_order.branchid,
        'Xuất kho khi thanh toán phiếu ' || p_order_id,
        p_order_id
      );
    END LOOP;
  END IF;

  -- Update work order
  UPDATE work_orders
  SET
    paymentstatus = v_new_status,
    totalpaid = v_total_paid,
    remainingamount = v_remaining,
    additionalpayment = COALESCE(additionalpayment, 0) + p_payment_amount,
    cashtransactionid = COALESCE(v_payment_tx_id, cashtransactionid),
    paymentdate = CASE WHEN v_payment_tx_id IS NOT NULL THEN NOW() ELSE paymentdate END,
    paymentmethod = COALESCE(p_payment_method, paymentmethod),
    inventory_deducted = CASE WHEN v_should_deduct_inventory THEN TRUE ELSE inventory_deducted END
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'orderId', p_order_id,
    'paymentStatus', v_new_status,
    'totalPaid', v_total_paid,
    'remainingAmount', v_remaining,
    'inventoryDeducted', v_should_deduct_inventory,
    'paymentTransactionId', v_payment_tx_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.work_order_complete_payment TO authenticated;
COMMENT ON FUNCTION public.work_order_complete_payment 
IS 'Thanh toán phiếu sửa chữa - FIXED: Sử dụng column reserved thay vì reservedstock';

SELECT 'work_order_complete_payment function created successfully!' AS result;
