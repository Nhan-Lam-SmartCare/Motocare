-- =============================================================================
-- FIX: Ngăn chặn thanh toán 2 lần và đảm bảo trừ kho đúng
-- =============================================================================
-- Vấn đề:
-- 1. Có thể trả máy và thanh toán 2 lần do logic frontend tính totalAdditionalPayment sai
-- 2. Khi tạo phiếu với status "Trả máy" + thanh toán đủ, kho không được trừ
-- 
-- Giải pháp:
-- - Frontend: Đã sửa logic tính totalAdditionalPayment - chỉ lấy giá trị mới
-- - Frontend: Đã thêm logic gọi completeWorkOrderPayment khi paymentStatus = 'paid'
-- - Backend: Thêm cột để track inventory_deducted, tránh trừ kho 2 lần
-- =============================================================================

-- Bước 1: Thêm cột inventory_deducted nếu chưa có
ALTER TABLE public.work_orders 
ADD COLUMN IF NOT EXISTS inventory_deducted BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.work_orders.inventory_deducted IS 'True nếu kho đã được trừ (khi thanh toán đủ)';

-- Bước 2: Cập nhật hàm work_order_complete_payment để check inventory_deducted
CREATE OR REPLACE FUNCTION public.work_order_complete_payment(
  p_order_id TEXT,
  p_payment_amount NUMERIC,
  p_payment_method TEXT,
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

  -- Check if already refunded
  IF v_order.refunded = TRUE THEN
    RAISE EXCEPTION 'ORDER_REFUNDED';
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

  -- 🔹 Chỉ trừ kho NẾU: (1) Thanh toán đủ VÀ (2) Chưa trừ kho trước đó
  v_should_deduct_inventory := (v_new_status = 'paid' AND v_order.inventory_deducted = FALSE);

  -- Create payment transaction (nếu có số tiền thanh toán)
  IF p_payment_amount > 0 AND p_payment_method IS NOT NULL THEN
    v_payment_tx_id := gen_random_uuid()::text;
    INSERT INTO cash_transactions(
      id, type, category, amount, date, description, branchId, paymentSource, reference
    )
    VALUES (
      v_payment_tx_id,
      'income',
      'service_income',
      p_payment_amount,
      NOW(),
      'Thanh toán sửa chữa ' || p_order_id,
      v_order.branchId,
      p_payment_method,
      p_order_id
    );
  END IF;

  -- ==========================================================================
  -- Nếu THANH TOÁN ĐỦ VÀ CHƯA TRỪ KHO: Trừ kho thực + tạo inventory transactions
  -- ==========================================================================
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
        COALESCE((stock->>v_order.branchId)::int, 0),
        COALESCE((reserved->>v_order.branchId)::int, 0)
      INTO v_current_stock, v_current_reserved
      FROM parts WHERE id = v_part_id FOR UPDATE;

      IF NOT FOUND THEN
        CONTINUE; -- Skip if part not found
      END IF;

      -- 1. Giảm reserved
      UPDATE parts
      SET reserved = jsonb_set(
        COALESCE(reserved, '{}'::jsonb),
        ARRAY[v_order.branchId],
        to_jsonb(GREATEST(0, v_current_reserved - v_quantity))
      )
      WHERE id = v_part_id;

      -- 2. Giảm stock thực
      UPDATE parts
      SET stock = jsonb_set(
        stock,
        ARRAY[v_order.branchId],
        to_jsonb(GREATEST(0, v_current_stock - v_quantity))
      )
      WHERE id = v_part_id;

      -- 3. Tạo inventory transaction (Xuất kho)
      INSERT INTO inventory_transactions(
        id, type, partId, partName, quantity, date, unitPrice, totalPrice,
        branchId, notes, workOrderId
      )
      VALUES (
        gen_random_uuid()::text,
        'Xuất kho',
        v_part_id,
        v_part_name,
        v_quantity,
        NOW(),
        public.mc_avg_cost(v_part_id, v_order.branchId),
        public.mc_avg_cost(v_part_id, v_order.branchId) * v_quantity,
        v_order.branchId,
        'Xuất kho khi thanh toán phiếu sửa chữa',
        p_order_id
      );
    END LOOP;
  END IF;

  -- Update work order
  UPDATE work_orders
  SET
    paymentStatus = v_new_status,
    totalPaid = v_total_paid,
    remainingAmount = v_remaining,
    additionalPayment = COALESCE(additionalPayment, 0) + p_payment_amount,
    cashTransactionId = COALESCE(v_payment_tx_id, cashTransactionId),
    paymentDate = CASE WHEN v_payment_tx_id IS NOT NULL THEN NOW() ELSE paymentDate END,
    paymentMethod = COALESCE(p_payment_method, paymentMethod),
    inventory_deducted = CASE WHEN v_should_deduct_inventory THEN TRUE ELSE inventory_deducted END
  WHERE id = p_order_id;

  -- Return workOrder object (matching repository expectations)
  RETURN jsonb_build_object(
    'workOrder', (SELECT row_to_json(work_orders.*) FROM work_orders WHERE id = p_order_id),
    'paymentTransactionId', v_payment_tx_id,
    'inventoryDeducted', v_should_deduct_inventory
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.work_order_complete_payment TO authenticated;
COMMENT ON FUNCTION public.work_order_complete_payment IS 'Thanh toán phiếu sửa chữa - Tự động trừ kho khi thanh toán đủ (chỉ 1 lần)';

-- Bước 3: Đánh dấu các phiếu đã thanh toán đủ là inventory_deducted = TRUE
-- (để tránh trừ kho lại lần nữa cho các phiếu cũ)
UPDATE work_orders
SET inventory_deducted = TRUE
WHERE paymentStatus = 'paid' 
  AND inventory_deducted = FALSE
  AND partsUsed IS NOT NULL
  AND jsonb_array_length(partsUsed) > 0;

-- Log số phiếu đã cập nhật
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM work_orders
  WHERE paymentStatus = 'paid' 
    AND inventory_deducted = TRUE;
  
  RAISE NOTICE 'Đã đánh dấu % phiếu đã thanh toán đủ là inventory_deducted = TRUE', v_count;
END $$;
