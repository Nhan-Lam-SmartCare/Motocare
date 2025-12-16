-- Migration: Fix cash transaction amounts to reflect actual collected amount (after discount)
-- Date: 2025-12-16
-- Issue: Cash transactions were recording pre-discount amounts instead of actual collected amounts
-- Example: Order total 1,380k with 20% discount = 1,104k actual, but cash_transaction showed 1,380k

-- =============================================================================
-- PART 0: Drop existing functions to avoid signature conflicts
-- =============================================================================

DROP FUNCTION IF EXISTS public.work_order_create_atomic;
DROP FUNCTION IF EXISTS public.work_order_update_atomic;

-- =============================================================================
-- PART 1: Fix work_order_create_atomic
-- =============================================================================

CREATE OR REPLACE FUNCTION public.work_order_create_atomic(
  p_order_id TEXT,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_vehicle_model TEXT,
  p_license_plate TEXT,
  p_issue_description TEXT,
  p_technician_name TEXT,
  p_status TEXT,
  p_labor_cost NUMERIC,
  p_discount NUMERIC,
  p_parts_used JSONB,
  p_additional_services JSONB,
  p_total NUMERIC,
  p_branch_id TEXT,
  p_payment_status TEXT,
  p_payment_method TEXT,
  p_deposit_amount NUMERIC,
  p_additional_payment NUMERIC,
  p_user_id TEXT,
  p_vehicle_id TEXT DEFAULT NULL,
  p_current_km INTEGER DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_part JSONB;
  v_index INT := 0;
  v_parts_count INT := COALESCE(jsonb_array_length(p_parts_used), 0);
  v_part_id TEXT;
  v_part_name TEXT;
  v_quantity INT;
  v_current_stock INT;
  v_current_reserved INT;
  v_available INT;
  v_deposit_tx_id TEXT;
  v_payment_tx_id TEXT;
  v_warnings JSONB := '[]'::jsonb;
  v_creation_date TIMESTAMP := NOW();
  v_user_branch TEXT;
  v_actual_additional_payment NUMERIC;
BEGIN
  -- Get user's branch from profile
  SELECT branch_id INTO v_user_branch
  FROM public.profiles
  WHERE id = auth.uid();
  
  -- Authorization: User must be authenticated and have a branch
  IF v_user_branch IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: User has no branch assigned';
  END IF;
  
  -- Branch scope guard
  IF p_branch_id IS DISTINCT FROM v_user_branch THEN
    RAISE EXCEPTION 'BRANCH_MISMATCH: Cannot create work order for different branch';
  END IF;

  -- Validate payment status
  IF p_payment_status NOT IN ('unpaid', 'paid', 'partial') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_STATUS: Must be unpaid, paid, or partial';
  END IF;

  -- 🔹 Calculate actual additional payment (after discount)
  -- p_total already includes discount
  -- Actual additional payment = total - deposit
  v_actual_additional_payment := GREATEST(p_total - COALESCE(p_deposit_amount, 0), 0);

  -- Reserve stock for each part (not deduct yet)
  IF v_parts_count > 0 THEN
    WHILE v_index < v_parts_count LOOP
      v_part := p_parts_used->v_index;
      v_part_id := v_part->>'partId';
      v_part_name := v_part->>'partName';
      v_quantity := COALESCE((v_part->>'quantity')::INT, 0);

      IF v_quantity > 0 THEN
        SELECT 
          COALESCE((stock->>p_branch_id)::INT, 0),
          COALESCE((reserved->>p_branch_id)::INT, 0)
        INTO v_current_stock, v_current_reserved
        FROM parts
        WHERE id = v_part_id;

        v_available := v_current_stock - v_current_reserved;

        IF v_available < v_quantity THEN
          v_warnings := v_warnings || jsonb_build_object(
            'partId', v_part_id,
            'partName', v_part_name,
            'requested', v_quantity,
            'available', v_available
          );
        END IF;

        UPDATE parts
        SET reserved = jsonb_set(
          COALESCE(reserved, '{}'::jsonb),
          ARRAY[p_branch_id],
          to_jsonb(COALESCE((reserved->>p_branch_id)::INT, 0) + v_quantity)
        )
        WHERE id = v_part_id;
      END IF;

      v_index := v_index + 1;
    END LOOP;
  END IF;

  -- Insert work order with currentKm
  INSERT INTO work_orders(
    id, customerName, customerPhone, vehicleId, vehicleModel, licensePlate,
    currentKm, issueDescription, technicianName, status, laborCost, discount,
    partsUsed, additionalServices, total, branchId, paymentStatus,
    paymentMethod, depositAmount, additionalPayment, totalPaid,
    remainingAmount, creationDate
  )
  VALUES (
    p_order_id, p_customer_name, p_customer_phone, p_vehicle_id, p_vehicle_model, p_license_plate,
    p_current_km, p_issue_description, p_technician_name, p_status, p_labor_cost, p_discount,
    p_parts_used, p_additional_services, p_total, p_branch_id, p_payment_status,
    p_payment_method, 
    CASE WHEN p_deposit_amount > 0 THEN p_deposit_amount ELSE NULL END,
    CASE WHEN p_additional_payment > 0 THEN p_additional_payment ELSE NULL END,
    COALESCE(p_deposit_amount, 0) + COALESCE(p_additional_payment, 0),
    p_total - (COALESCE(p_deposit_amount, 0) + COALESCE(p_additional_payment, 0)),
    v_creation_date
  );

  -- Create deposit transaction
  IF p_deposit_amount > 0 AND p_payment_method IS NOT NULL THEN
    v_deposit_tx_id := gen_random_uuid()::text;
    INSERT INTO cash_transactions(
      id, type, category, amount, date, description, branchId, paymentSource, reference
    )
    VALUES (
      v_deposit_tx_id, 'income', 'service_deposit', p_deposit_amount, v_creation_date,
      'Đặt cọc sửa chữa ' || p_order_id, p_branch_id, p_payment_method, p_order_id
    );

    UPDATE work_orders 
    SET depositTransactionId = v_deposit_tx_id, depositDate = v_creation_date
    WHERE id = p_order_id;
  END IF;

  -- 🔹 FIX: Create payment transaction with ACTUAL amount (after discount)
  IF p_additional_payment > 0 AND p_payment_method IS NOT NULL THEN
    v_payment_tx_id := gen_random_uuid()::text;
    INSERT INTO cash_transactions(
      id, type, category, amount, date, description, branchId, paymentSource, reference
    )
    VALUES (
      v_payment_tx_id, 'income', 'service_income', 
      v_actual_additional_payment,  -- ✅ Use actual amount after discount
      v_creation_date,
      'Thu tiền sửa chữa ' || p_order_id, p_branch_id, p_payment_method, p_order_id
    );

    UPDATE work_orders 
    SET cashTransactionId = v_payment_tx_id, paymentDate = v_creation_date
    WHERE id = p_order_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'orderId', p_order_id,
    'depositTransactionId', v_deposit_tx_id,
    'paymentTransactionId', v_payment_tx_id,
    'warnings', v_warnings
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.work_order_create_atomic TO authenticated;
COMMENT ON FUNCTION public.work_order_create_atomic IS 'Tạo phiếu sửa chữa - FIXED: Ghi nhận số tiền thực thu (đã trừ giảm giá)';

-- =============================================================================
-- PART 2: Fix work_order_update_atomic
-- =============================================================================

CREATE OR REPLACE FUNCTION public.work_order_update_atomic(
  p_order_id TEXT,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_vehicle_model TEXT,
  p_license_plate TEXT,
  p_issue_description TEXT,
  p_technician_name TEXT,
  p_status TEXT,
  p_labor_cost NUMERIC,
  p_discount NUMERIC,
  p_parts_used JSONB,
  p_additional_services JSONB,
  p_total NUMERIC,
  p_payment_status TEXT,
  p_payment_method TEXT,
  p_deposit_amount NUMERIC,
  p_additional_payment NUMERIC,
  p_vehicle_id TEXT DEFAULT NULL,
  p_current_km INTEGER DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_status TEXT;
  v_old_payment_status TEXT;
  v_old_parts JSONB;
  v_old_deposit NUMERIC;
  v_old_additional NUMERIC;
  v_branch_id TEXT;
  v_part JSONB;
  v_old_part JSONB;
  v_index INT;
  v_parts_count INT;
  v_old_parts_count INT;
  v_part_id TEXT;
  v_part_name TEXT;
  v_quantity INT;
  v_old_quantity INT;
  v_quantity_diff INT;
  v_current_stock INT;
  v_current_reserved INT;
  v_available INT;
  v_inventory_deducted BOOLEAN;
  v_deposit_tx_id TEXT;
  v_payment_tx_id TEXT;
  v_insufficient JSONB := '[]'::jsonb;
  v_warnings JSONB := '[]'::jsonb;
  v_actual_additional_payment_diff NUMERIC;
  v_old_total NUMERIC;
BEGIN
  -- Get existing order data
  SELECT status, paymentStatus, partsUsed, depositAmount, additionalPayment, branchId, total
  INTO v_old_status, v_old_payment_status, v_old_parts, v_old_deposit, v_old_additional, v_branch_id, v_old_total
  FROM work_orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'WORK_ORDER_NOT_FOUND';
  END IF;

  -- 🔹 Calculate actual additional payment difference (after discount)
  -- Old actual payment = old_total - old_deposit
  -- New actual payment = p_total - p_deposit_amount
  -- Difference = new - old
  v_actual_additional_payment_diff := 
    (p_total - COALESCE(p_deposit_amount, 0)) - 
    (COALESCE(v_old_total, 0) - COALESCE(v_old_deposit, 0));

  -- Determine if inventory should be deducted
  v_inventory_deducted := (p_payment_status = 'paid' AND v_old_payment_status != 'paid');

  v_parts_count := COALESCE(jsonb_array_length(p_parts_used), 0);
  v_old_parts_count := COALESCE(jsonb_array_length(v_old_parts), 0);

  -- Handle part changes
  FOR v_index IN 0..(GREATEST(v_parts_count, v_old_parts_count) - 1) LOOP
    IF v_index < v_parts_count THEN
      v_part := p_parts_used->v_index;
      v_part_id := v_part->>'partId';
      v_part_name := v_part->>'partName';
      v_quantity := COALESCE((v_part->>'quantity')::INT, 0);
    ELSE
      v_part := NULL;
      v_part_id := NULL;
      v_part_name := NULL;
      v_quantity := 0;
    END IF;

    IF v_index < v_old_parts_count THEN
      v_old_part := v_old_parts->v_index;
      IF (v_old_part->>'partId') = v_part_id THEN
        v_old_quantity := COALESCE((v_old_part->>'quantity')::INT, 0);
      ELSE
        v_old_quantity := 0;
      END IF;
    ELSE
      v_old_quantity := 0;
    END IF;

    v_quantity_diff := v_quantity - v_old_quantity;

    IF v_quantity_diff != 0 AND v_part_id IS NOT NULL THEN
      SELECT 
        COALESCE((stock->>v_branch_id)::INT, 0),
        COALESCE((reserved->>v_branch_id)::INT, 0)
      INTO v_current_stock, v_current_reserved
      FROM parts
      WHERE id = v_part_id;

      v_available := v_current_stock - v_current_reserved;

      IF v_inventory_deducted THEN
        IF v_available < v_quantity_diff THEN
          v_insufficient := v_insufficient || jsonb_build_object(
            'partId', v_part_id,
            'partName', v_part_name,
            'requested', v_quantity_diff,
            'available', v_available,
            'shortage', v_quantity_diff - v_available
          );
          CONTINUE;
        END IF;

        UPDATE parts
        SET stock = jsonb_set(stock, ARRAY[v_branch_id], to_jsonb(v_current_stock - v_quantity_diff), true)
        WHERE id = v_part_id;

        INSERT INTO inventory_transactions(
          id, type, partId, partName, quantity, date, unitPrice, totalPrice,
          branchId, notes, workOrderId
        )
        VALUES (
          gen_random_uuid()::text, 'Xuất kho', v_part_id, v_part_name, v_quantity_diff,
          NOW(), public.mc_avg_cost(v_part_id, v_branch_id),
          public.mc_avg_cost(v_part_id, v_branch_id) * v_quantity_diff,
          v_branch_id, 'Thêm vào phiếu sửa (đã thanh toán)', p_order_id
        );
      ELSE
        IF v_available < v_quantity_diff THEN
          v_warnings := v_warnings || jsonb_build_object(
            'partId', v_part_id,
            'partName', v_part_name,
            'requested', v_quantity_diff,
            'available', v_available,
            'shortage', v_quantity_diff - v_available
          );
        END IF;

        UPDATE parts
        SET reserved = jsonb_set(
          COALESCE(reserved, '{}'::jsonb),
          ARRAY[v_branch_id],
          to_jsonb(v_current_reserved + v_quantity_diff),
          true
        )
        WHERE id = v_part_id;
      END IF;
    END IF;
  END LOOP;

  IF v_inventory_deducted AND jsonb_array_length(v_insufficient) > 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_STOCK:%', v_insufficient::text;
  END IF;

  -- Handle deposit change
  IF p_deposit_amount > COALESCE(v_old_deposit, 0) AND p_payment_method IS NOT NULL THEN
    v_deposit_tx_id := gen_random_uuid()::text;
    INSERT INTO cash_transactions(
      id, type, category, amount, date, description, branchId, paymentSource, reference
    )
    VALUES (
      v_deposit_tx_id, 'income', 'service_deposit',
      p_deposit_amount - COALESCE(v_old_deposit, 0),
      NOW(), 'Đặt cọc bổ sung ' || p_order_id, v_branch_id, p_payment_method, p_order_id
    );
  END IF;

  -- 🔹 FIX: Handle additional payment change with ACTUAL amount (after discount)
  IF v_actual_additional_payment_diff > 0 AND p_payment_method IS NOT NULL THEN
    v_payment_tx_id := gen_random_uuid()::text;
    INSERT INTO cash_transactions(
      id, type, category, amount, date, description, branchId, paymentSource, reference
    )
    VALUES (
      v_payment_tx_id, 'income', 'service_income',
      v_actual_additional_payment_diff,  -- ✅ Use actual difference after discount
      NOW(), 'Thu tiền bổ sung ' || p_order_id, v_branch_id, p_payment_method, p_order_id
    );
  END IF;

  -- Update work order
  UPDATE work_orders
  SET
    customerName = p_customer_name,
    customerPhone = p_customer_phone,
    vehicleId = p_vehicle_id,
    vehicleModel = p_vehicle_model,
    licensePlate = p_license_plate,
    currentKm = p_current_km,
    issueDescription = p_issue_description,
    technicianName = p_technician_name,
    status = p_status,
    laborCost = p_labor_cost,
    discount = p_discount,
    partsUsed = p_parts_used,
    additionalServices = p_additional_services,
    total = p_total,
    paymentStatus = p_payment_status,
    paymentMethod = p_payment_method,
    depositAmount = CASE WHEN p_deposit_amount > 0 THEN p_deposit_amount ELSE NULL END,
    additionalPayment = CASE WHEN p_additional_payment > 0 THEN p_additional_payment ELSE NULL END,
    totalPaid = COALESCE(p_deposit_amount, 0) + COALESCE(p_additional_payment, 0),
    remainingAmount = p_total - (COALESCE(p_deposit_amount, 0) + COALESCE(p_additional_payment, 0)),
    depositTransactionId = COALESCE(v_deposit_tx_id, depositTransactionId),
    depositDate = CASE WHEN v_deposit_tx_id IS NOT NULL THEN NOW() ELSE depositDate END,
    cashTransactionId = COALESCE(v_payment_tx_id, cashTransactionId),
    paymentDate = CASE WHEN v_payment_tx_id IS NOT NULL THEN NOW() ELSE paymentDate END
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'orderId', p_order_id,
    'depositTransactionId', v_deposit_tx_id,
    'paymentTransactionId', v_payment_tx_id,
    'warnings', v_warnings
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.work_order_update_atomic TO authenticated;
COMMENT ON FUNCTION public.work_order_update_atomic IS 'Cập nhật phiếu sửa chữa - FIXED: Ghi nhận số tiền thực thu (đã trừ giảm giá)';

-- =============================================================================
-- NOTES
-- =============================================================================
-- This migration fixes the issue where cash_transactions were recording
-- pre-discount amounts instead of actual collected amounts.
-- 
-- Before: Order 1,380k with 20% discount → cash_transaction: 1,380k ❌
-- After:  Order 1,380k with 20% discount → cash_transaction: 1,104k ✅
-- 
-- The fix calculates v_actual_additional_payment = p_total - p_deposit_amount
-- since p_total already includes the discount applied.
