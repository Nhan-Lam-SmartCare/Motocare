-- =============================================================================
-- FIX: Force update work_order_update_atomic to handle NULL additionalServices
-- Date: 2026-01-08
-- Issue: additionalServices not updating to NULL when deleted
-- =============================================================================

-- Drop function with all possible signatures to ensure clean slate
DROP FUNCTION IF EXISTS public.work_order_update_atomic CASCADE;

-- Recreate with explicit NULL handling
CREATE OR REPLACE FUNCTION public.work_order_update_atomic(
  p_order_id text,
  p_customer_name text,
  p_customer_phone text,
  p_vehicle_model text,
  p_license_plate text,
  p_vehicle_id text,
  p_current_km integer,
  p_issue_description text,
  p_technician_name text,
  p_status text,
  p_labor_cost numeric,
  p_discount numeric,
  p_parts_used jsonb,
  p_additional_services jsonb,
  p_total numeric,
  p_payment_status text,
  p_payment_method text,
  p_deposit_amount numeric,
  p_additional_payment numeric,
  p_user_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_old_parts JSONB;
  v_new_part JSONB;
  v_old_part JSONB;
  v_part_id TEXT;
  v_part_name TEXT;
  v_quantity INT;
  v_old_quantity INT;
  v_quantity_diff INT;
  v_current_stock INT;
  v_current_reserved INT;
  v_available INT;
  v_branch_id TEXT;
  v_deposit_tx_id TEXT;
  v_payment_tx_id TEXT;
  v_old_deposit NUMERIC;
  v_old_additional NUMERIC;
  v_old_cash_tx_id TEXT;
  v_warnings JSONB := '[]'::jsonb;
  v_index INT := 0;
  v_parts_count INT := COALESCE(jsonb_array_length(p_parts_used), 0);
  v_user_branch TEXT;
BEGIN
  -- Get user's branch from profile
  SELECT branch_id INTO v_user_branch
  FROM public.profiles
  WHERE id = auth.uid();
  
  IF v_user_branch IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: User has no branch assigned';
  END IF;

  -- Get existing order
  SELECT partsUsed, branchId, depositAmount, additionalPayment, cashTransactionId
  INTO v_old_parts, v_branch_id, v_old_deposit, v_old_additional, v_old_cash_tx_id
  FROM work_orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND';
  END IF;

  IF v_branch_id IS DISTINCT FROM v_user_branch THEN
    RAISE EXCEPTION 'BRANCH_MISMATCH';
  END IF;

  IF p_status NOT IN ('Tiếp nhận', 'Đang sửa', 'Đã sửa xong', 'Trả máy') THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;

  IF p_payment_status NOT IN ('unpaid', 'paid', 'partial') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_STATUS';
  END IF;

  -- ==========================================================================
  -- STEP 1: Release reserved for removed/reduced parts
  -- ==========================================================================
  FOR v_old_part IN SELECT * FROM jsonb_array_elements(COALESCE(v_old_parts, '[]'::jsonb))
  LOOP
    v_part_id := (v_old_part->>'partId');
    v_old_quantity := COALESCE((v_old_part->>'quantity')::int, 0);
    
    -- Find if this part still exists in new parts list
    v_new_part := NULL;
    FOR v_index IN 0..(v_parts_count - 1) LOOP
      IF (p_parts_used->v_index->>'partId') = v_part_id THEN
        v_new_part := p_parts_used->v_index;
        EXIT;
      END IF;
    END LOOP;

    IF v_new_part IS NULL THEN
      v_quantity_diff := v_old_quantity;
    ELSE
      v_quantity := COALESCE((v_new_part->>'quantity')::int, 0);
      v_quantity_diff := v_old_quantity - v_quantity;
    END IF;

    -- Release reserved if quantity decreased
    IF v_quantity_diff > 0 THEN
      SELECT COALESCE((reserved->>v_branch_id)::int, 0) INTO v_current_reserved
      FROM parts WHERE id = v_part_id FOR UPDATE;

      UPDATE parts
      SET reserved = jsonb_set(
        COALESCE(reserved, '{}'::jsonb),
        ARRAY[v_branch_id],
        to_jsonb(GREATEST(0, v_current_reserved - v_quantity_diff))
      )
      WHERE id = v_part_id;
    END IF;
  END LOOP;

  -- ==========================================================================
  -- STEP 2: Reserve more for new/increased parts
  -- ==========================================================================
  FOR v_index IN 0..(v_parts_count - 1) LOOP
    v_new_part := p_parts_used->v_index;
    v_part_id := (v_new_part->>'partId');
    v_part_name := (v_new_part->>'partName');
    v_quantity := COALESCE((v_new_part->>'quantity')::int, 0);

    IF v_part_id IS NULL OR v_quantity <= 0 THEN
      CONTINUE;
    END IF;

    -- Find old quantity
    v_old_quantity := 0;
    FOR v_old_part IN SELECT * FROM jsonb_array_elements(COALESCE(v_old_parts, '[]'::jsonb))
    LOOP
      IF (v_old_part->>'partId') = v_part_id THEN
        v_old_quantity := COALESCE((v_old_part->>'quantity')::int, 0);
        EXIT;
      END IF;
    END LOOP;

    v_quantity_diff := v_quantity - v_old_quantity;

    -- Reserve more if quantity increased
    IF v_quantity_diff > 0 THEN
      SELECT 
        COALESCE((stock->>v_branch_id)::int, 0),
        COALESCE((reserved->>v_branch_id)::int, 0)
      INTO v_current_stock, v_current_reserved
      FROM parts WHERE id = v_part_id FOR UPDATE;

      v_available := v_current_stock - v_current_reserved;

      IF v_available < v_quantity_diff THEN
        v_warnings := v_warnings || jsonb_build_object(
          'partId', v_part_id,
          'partName', v_part_name,
          'requested', v_quantity_diff,
          'available', v_available,
          'message', 'Tồn kho không đủ: ' || v_part_name
        );
      END IF;

      UPDATE parts
      SET reserved = jsonb_set(
        COALESCE(reserved, '{}'::jsonb),
        ARRAY[v_branch_id],
        to_jsonb(v_current_reserved + v_quantity_diff)
      )
      WHERE id = v_part_id;
    END IF;
  END LOOP;

  -- ==========================================================================
  -- STEP 3: Handle payment changes
  -- ==========================================================================
  IF p_deposit_amount > COALESCE(v_old_deposit, 0) AND p_payment_method IS NOT NULL THEN
    v_deposit_tx_id := gen_random_uuid()::text;
    INSERT INTO cash_transactions(
      id, type, category, amount, date, description, branchId, paymentSource, reference
    )
    VALUES (
      v_deposit_tx_id,
      'income',
      'service_deposit',
      p_deposit_amount - COALESCE(v_old_deposit, 0),
      NOW(),
      'Đặt cọc bổ sung ' || p_order_id,
      v_branch_id,
      p_payment_method,
      p_order_id
    );
  END IF;

  IF p_additional_payment > 0 AND p_payment_method IS NOT NULL THEN
    IF p_additional_payment > COALESCE(v_old_additional, 0)
       OR (COALESCE(v_old_additional, 0) > 0 AND v_old_cash_tx_id IS NULL) THEN
      v_payment_tx_id := gen_random_uuid()::text;
      INSERT INTO cash_transactions(
        id, type, category, amount, date, description, branchId, paymentSource, reference
      )
      VALUES (
        v_payment_tx_id,
        'income',
        'service_income',
        CASE
          WHEN p_additional_payment > COALESCE(v_old_additional, 0)
            THEN p_additional_payment - COALESCE(v_old_additional, 0)
          ELSE p_additional_payment
        END,
        NOW(),
        CASE
          WHEN p_additional_payment > COALESCE(v_old_additional, 0)
            THEN 'Thu tiền bổ sung ' || p_order_id
          ELSE 'Thu tiền sửa chữa ' || p_order_id
        END,
        v_branch_id,
        p_payment_method,
        p_order_id
      );
    END IF;
  END IF;

  -- ==========================================================================
  -- STEP 4: Update work order
  -- 🔹 FIX: Explicitly handle NULL for additionalServices
  -- ==========================================================================
  UPDATE work_orders
  SET
    customerName = p_customer_name,
    customerPhone = p_customer_phone,
    vehicleModel = p_vehicle_model,
    licensePlate = p_license_plate,
    vehicleId = p_vehicle_id,
    currentKm = p_current_km,
    issueDescription = p_issue_description,
    technicianName = p_technician_name,
    status = p_status,
    laborCost = p_labor_cost,
    discount = p_discount,
    partsUsed = p_parts_used,
    -- 🔹 CRITICAL FIX: Always update additionalServices, even when NULL
    additionalServices = p_additional_services,
    total = p_total,
    paymentStatus = p_payment_status,
    paymentMethod = p_payment_method,
    depositAmount = CASE WHEN p_deposit_amount > 0 THEN p_deposit_amount ELSE depositAmount END,
    additionalPayment = CASE WHEN p_additional_payment > 0 THEN p_additional_payment ELSE additionalPayment END,
    totalPaid = COALESCE(p_deposit_amount, depositAmount, 0) + COALESCE(p_additional_payment, additionalPayment, 0),
    remainingAmount = p_total - (COALESCE(p_deposit_amount, depositAmount, 0) + COALESCE(p_additional_payment, additionalPayment, 0)),
    depositTransactionId = COALESCE(v_deposit_tx_id, depositTransactionId),
    cashTransactionId = COALESCE(v_payment_tx_id, cashTransactionId),
    depositDate = CASE WHEN v_deposit_tx_id IS NOT NULL THEN NOW() ELSE depositDate END,
    paymentDate = CASE WHEN v_payment_tx_id IS NOT NULL THEN NOW() ELSE paymentDate END
  WHERE id = p_order_id;

  -- Return workOrder object
  RETURN jsonb_build_object(
    'workOrder', (SELECT row_to_json(work_orders.*) FROM work_orders WHERE id = p_order_id),
    'depositTransactionId', v_deposit_tx_id,
    'paymentTransactionId', v_payment_tx_id,
    'stockWarnings', v_warnings
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$function$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.work_order_update_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION public.work_order_update_atomic TO anon;
GRANT EXECUTE ON FUNCTION public.work_order_update_atomic TO service_role;

-- Add comment
COMMENT ON FUNCTION public.work_order_update_atomic IS 'Cập nhật phiếu sửa chữa - FIXED: additionalServices can be set to NULL';

-- Verify function was updated
SELECT 
  proname as function_name,
  pronargs as num_args,
  pg_get_functiondef(oid) LIKE '%additionalServices = p_additional_services%' as has_correct_update
FROM pg_proc
WHERE proname = 'work_order_update_atomic';

-- Test query to verify (don't run automatically, just for reference)
-- UPDATE work_orders SET additionalServices = NULL WHERE id = 'SC-20260101-117018';
-- SELECT id, additionalServices FROM work_orders WHERE id = 'SC-20260101-117018';

SELECT '✅ Migration completed successfully! Function work_order_update_atomic has been recreated.' as result;
