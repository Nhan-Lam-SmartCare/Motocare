-- ============================================================================
-- KIỂM TRA TỔNG THỂ PHẦN KHO - AUDIT & FIX
-- Ngày: 2026-02-06
-- Mục đích: Sửa TẤT CẢ lỗi phát hiện trong luồng kho
-- ============================================================================
--
-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║                  BÁO CÁO SAU CHẨN ĐOÁN PRODUCTION                      ║
-- ╠═══════════════════════════════════════════════════════════════════════════╣
-- ║                                                                         ║
-- ║  KẾT QUẢ CHẨN ĐOÁN:                                                    ║
-- ║  - Trigger trg_inventory_tx_after_insert: CÒN ACTIVE ⚠️                ║
-- ║  - Cả 2 cột reserved VÀ reservedstock đều tồn tại ⚠️                  ║
-- ║  - Function adjust_part_stock: Còn tồn tại ⚠️                          ║
-- ║                                                                         ║
-- ║  🔴 LỖI NGHIÊM TRỌNG - DOUBLE DEDUCTION:                              ║
-- ║                                                                         ║
-- ║  1. sale_create_atomic: TRỪ KHO 2 LẦN!                                ║
-- ║     - Lần 1: UPDATE parts SET stock = ... (thủ công trong function)    ║
-- ║     - Lần 2: INSERT inventory_transactions → trigger tự động trừ      ║
-- ║     → Mỗi lần bán hàng, stock bị trừ GẤP ĐÔI!                        ║
-- ║                                                                         ║
-- ║  2. work_order_complete_payment: TRỪ KHO 2 LẦN!                       ║
-- ║     - Cùng cơ chế: thủ công + trigger                                 ║
-- ║     → Mỗi phiếu sửa chữa thanh toán, stock bị trừ GẤP ĐÔI!          ║
-- ║                                                                         ║
-- ║  3. sale_delete_atomic: HOÀN KHO 2 LẦN!                               ║
-- ║     - UPDATE stock thủ công + INSERT "Nhập kho" → trigger cộng thêm   ║
-- ║     → Xóa hóa đơn, stock được hoàn GẤP ĐÔI!                          ║
-- ║                                                                         ║
-- ║  4. work_order_refund_atomic: HOÀN KHO 2 LẦN!                         ║
-- ║     - Tương tự: thủ công + trigger                                     ║
-- ║                                                                         ║
-- ║  5. Cột reserved vs reservedstock KHÔNG NHẤT QUÁN:                     ║
-- ║     - work_order_create/update/complete dùng 'reserved'                ║
-- ║     - work_order_refund + trigger bảo vệ dùng 'reservedstock'          ║
-- ║     - CẢ HAI cột tồn tại → dữ liệu bị chia ra 2 nơi                 ║
-- ║                                                                         ║
-- ║  ✅ ĐÚNG (Correct):                                                     ║
-- ║  - receipt_create_atomic: Chỉ insert tx → trigger cộng → OK (1 lần)   ║
-- ║  - inventory_transfer_atomic: Chỉ insert tx → trigger → OK (1 lần)    ║
-- ║                                                                         ║
-- ║  GIẢI PHÁP: Xóa trigger, để các function atomic tự quản lý stock      ║
-- ║  - receipt_create_atomic + transfer_atomic: THÊM manual stock update   ║
-- ║  - sale/work_order functions: GIỮ NGUYÊN (đã có manual update)          ║
-- ║  - Thống nhất cột reservedstock                                         ║
-- ║  - Đồng bộ lại stock từ inventory_transactions                         ║
-- ║                                                                         ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝


-- ============================================================================
-- BƯỚC 1: XÓA TRIGGER ĐỂ NGĂN DOUBLE DEDUCTION (QUAN TRỌNG NHẤT!)
-- ============================================================================
-- Đây là bước CỐT LÕI. Trigger này tự động cộng/trừ stock mỗi khi
-- INSERT vào inventory_transactions, nhưng nhiều function atomic ĐÃ tự 
-- cập nhật stock → gây ra trừ/cộng 2 lần.

-- Xóa trigger ngay lập tức
DROP TRIGGER IF EXISTS trg_inventory_tx_after_insert ON public.inventory_transactions CASCADE;
DROP TRIGGER IF EXISTS trg_adjust_stock_on_inventory_tx ON public.inventory_transactions CASCADE;
DROP TRIGGER IF EXISTS adjust_stock_trigger ON public.inventory_transactions CASCADE;

-- Xóa function adjust_part_stock (không còn cần thiết)
DROP FUNCTION IF EXISTS public.adjust_part_stock(TEXT, TEXT, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.adjust_part_stock(TEXT, TEXT, INTEGER) CASCADE;

-- Xóa function inventory_tx_after_insert
DROP FUNCTION IF EXISTS public.inventory_tx_after_insert() CASCADE;

-- Verify trigger đã bị xóa
DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers
  WHERE event_object_table = 'inventory_transactions'
    AND trigger_schema = 'public';
  
  IF trigger_count = 0 THEN
    RAISE NOTICE '✅ Bước 1 OK: Tất cả trigger đã bị xóa khỏi inventory_transactions';
  ELSE
    RAISE WARNING '⚠️ Còn % trigger trên inventory_transactions!', trigger_count;
  END IF;
END $$;


-- ============================================================================
-- BƯỚC 2: Fix receipt_create_atomic - THÊM cập nhật stock thủ công
-- ============================================================================
-- Trước đây: Chỉ insert inventory_transactions, dựa vào trigger (giờ đã xóa)
-- Sau fix: Tự cập nhật stock + insert inventory_transactions

DROP FUNCTION IF EXISTS public.receipt_create_atomic CASCADE;

CREATE OR REPLACE FUNCTION public.receipt_create_atomic(
  p_items JSONB,
  p_supplier_id TEXT,
  p_branch_id TEXT,
  p_user_id TEXT,
  p_notes TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item JSONB;
  v_part_id TEXT;
  v_part_name TEXT;
  v_quantity INT;
  v_import_price NUMERIC;
  v_selling_price NUMERIC;
  v_wholesale_price NUMERIC;
  v_current_stock INT;
  v_new_stock INT;
  v_total_price NUMERIC;
  v_tx_count INT := 0;
  v_date TIMESTAMPTZ := NOW();
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_part_id := v_item->>'partId';
    v_part_name := v_item->>'partName';
    v_quantity := (v_item->>'quantity')::INT;
    v_import_price := COALESCE((v_item->>'importPrice')::NUMERIC, 0);
    v_selling_price := (v_item->>'sellingPrice')::NUMERIC;
    v_wholesale_price := (v_item->>'wholesalePrice')::NUMERIC;
    v_total_price := v_quantity * v_import_price;

    IF v_part_id IS NULL OR v_quantity <= 0 THEN
      CONTINUE;
    END IF;

    -- 1. Lock row và lấy stock hiện tại
    SELECT COALESCE((stock->>p_branch_id)::int, 0)
    INTO v_current_stock
    FROM public.parts
    WHERE id = v_part_id
    FOR UPDATE;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    v_new_stock := v_current_stock + v_quantity;

    -- 2. ✅ NEW: Cập nhật stock TRỰC TIẾP (thay cho trigger đã bị xóa)
    UPDATE public.parts
    SET stock = jsonb_set(
      COALESCE(stock, '{}'::jsonb),
      ARRAY[p_branch_id],
      to_jsonb(v_new_stock),
      true
    )
    WHERE id = v_part_id;

    -- 3. Insert lịch sử nhập kho
    INSERT INTO public.inventory_transactions (
      id, type, "partId", "partName", quantity, date,
      "unitPrice", "totalPrice", "branchId", notes
    ) VALUES (
      gen_random_uuid()::text,
      'Nhập kho',
      v_part_id,
      v_part_name,
      v_quantity,
      v_date,
      v_import_price,
      v_total_price,
      p_branch_id,
      p_notes
    );

    -- 4. Update giá nhập, giá bán lẻ, giá sỉ
    UPDATE public.parts
    SET
      "costPrice" = jsonb_set(COALESCE("costPrice", '{}'::jsonb), ARRAY[p_branch_id], to_jsonb(v_import_price)),
      "retailPrice" = jsonb_set(COALESCE("retailPrice", '{}'::jsonb), ARRAY[p_branch_id], to_jsonb(v_selling_price)),
      "wholesalePrice" = jsonb_set(COALESCE("wholesalePrice", '{}'::jsonb), ARRAY[p_branch_id], to_jsonb(COALESCE(v_wholesale_price, 0)))
    WHERE id = v_part_id;

    v_tx_count := v_tx_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Nhập kho thành công',
    'txCount', v_tx_count
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.receipt_create_atomic TO authenticated;
COMMENT ON FUNCTION public.receipt_create_atomic IS 
  '2026-02-06: Nhập kho atomic - Cập nhật stock trực tiếp (không dựa vào trigger)';

DO $$ BEGIN RAISE NOTICE '✅ Bước 2 OK: receipt_create_atomic đã cập nhật'; END $$;


-- ============================================================================
-- BƯỚC 3: Fix inventory_transfer_atomic - THÊM cập nhật stock thủ công
-- ============================================================================
-- Trước đây: Chỉ insert 2 tx rows, dựa vào trigger
-- Sau fix: Tự cập nhật stock + insert tx

CREATE OR REPLACE FUNCTION public.inventory_transfer_atomic(
  p_part_id TEXT,
  p_part_name TEXT,
  p_quantity INT,
  p_from_branch TEXT,
  p_to_branch TEXT,
  p_notes TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_from INT;
  v_current_to INT;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'INVALID_QUANTITY';
  END IF;
  IF p_from_branch = p_to_branch THEN
    RAISE EXCEPTION 'INVALID_BRANCHES';
  END IF;

  -- Lock row
  SELECT COALESCE((stock->>p_from_branch)::int, 0)
  INTO v_current_from
  FROM public.parts WHERE id = p_part_id FOR UPDATE;

  IF NOT FOUND THEN 
    RAISE EXCEPTION 'PART_NOT_FOUND'; 
  END IF;

  IF v_current_from < p_quantity THEN 
    RAISE EXCEPTION 'INSUFFICIENT_STOCK'; 
  END IF;

  SELECT COALESCE((stock->>p_to_branch)::int, 0)
  INTO v_current_to
  FROM public.parts WHERE id = p_part_id;

  -- ✅ NEW: Giảm stock chi nhánh nguồn
  UPDATE public.parts
  SET stock = jsonb_set(
    stock, ARRAY[p_from_branch],
    to_jsonb(GREATEST(0, v_current_from - p_quantity)), true
  )
  WHERE id = p_part_id;

  -- ✅ NEW: Tăng stock chi nhánh đích
  UPDATE public.parts
  SET stock = jsonb_set(
    stock, ARRAY[p_to_branch],
    to_jsonb(v_current_to + p_quantity), true
  )
  WHERE id = p_part_id;

  -- Ghi lịch sử xuất kho từ nguồn
  INSERT INTO public.inventory_transactions(
    id, type, "partId", "partName", quantity, date, "unitPrice", "totalPrice", "branchId", notes
  )
  VALUES (
    gen_random_uuid()::text, 'Xuất kho', p_part_id, p_part_name, p_quantity, NOW(), 
    NULL, 0, p_from_branch, COALESCE(p_notes, 'Chuyển kho ra → ' || p_to_branch)
  );

  -- Ghi lịch sử nhập kho vào đích
  INSERT INTO public.inventory_transactions(
    id, type, "partId", "partName", quantity, date, "unitPrice", "totalPrice", "branchId", notes
  )
  VALUES (
    gen_random_uuid()::text, 'Nhập kho', p_part_id, p_part_name, p_quantity, NOW(), 
    NULL, 0, p_to_branch, COALESCE(p_notes, 'Chuyển kho vào ← ' || p_from_branch)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.inventory_transfer_atomic TO authenticated;
COMMENT ON FUNCTION public.inventory_transfer_atomic IS 
  '2026-02-06: Chuyển kho atomic - Cập nhật stock trực tiếp (không dựa vào trigger)';

DO $$ BEGIN RAISE NOTICE '✅ Bước 3 OK: inventory_transfer_atomic đã cập nhật'; END $$;


-- ============================================================================
-- BƯỚC 4: Thống nhất cột reserved → reservedstock
-- ============================================================================
-- Có CẢ HAI cột tồn tại: reserved + reservedstock
-- Một số function dùng reserved, một số dùng reservedstock
-- Giải pháp: Merge data từ reserved → reservedstock, rồi reset reserved

DO $$
DECLARE
  v_migrated INT := 0;
BEGIN
  RAISE NOTICE '📋 Bước 4: Thống nhất cột reserved → reservedstock...';

  -- Merge: với mỗi branch, lấy giá trị MAX từ 2 cột
  UPDATE parts
  SET reservedstock = (
    SELECT COALESCE(
      jsonb_object_agg(
        key,
        GREATEST(
          COALESCE((reservedstock->>key)::int, 0),
          COALESCE((reserved->>key)::int, 0)
        )
      ),
      '{}'::jsonb
    )
    FROM (
      SELECT DISTINCT key 
      FROM (
        SELECT key FROM jsonb_each_text(COALESCE(stock, '{}'::jsonb))
        UNION
        SELECT key FROM jsonb_each_text(COALESCE(reserved, '{}'::jsonb))
        UNION
        SELECT key FROM jsonb_each_text(COALESCE(reservedstock, '{}'::jsonb))
      ) all_keys
    ) keys
  )
  WHERE (reserved IS NOT NULL AND reserved != '{}'::jsonb)
     OR (reservedstock IS NOT NULL AND reservedstock != '{}'::jsonb);

  GET DIAGNOSTICS v_migrated = ROW_COUNT;
  RAISE NOTICE '  ✅ Đã merge % parts', v_migrated;

  -- Reset cột reserved về rỗng (giữ cột tránh breaking change cho code cũ)
  UPDATE parts SET reserved = '{}'::jsonb 
  WHERE reserved IS NOT NULL AND reserved != '{}'::jsonb;

  RAISE NOTICE '  ✅ Đã reset cột reserved về rỗng';
END $$;


-- ============================================================================
-- BƯỚC 5: sale_create_atomic - KHÔNG CẦN SỬA
-- ============================================================================
-- Trước: manual stock UPDATE + trigger = trừ 2 lần ← LỖI!
-- Sau khi xóa trigger (Bước 1): chỉ còn manual update = trừ 1 lần → ĐÚNG ✅

DO $$ BEGIN RAISE NOTICE '✅ Bước 5 OK: sale_create_atomic đã đúng (trigger đã xóa → chỉ trừ 1 lần)'; END $$;


-- ============================================================================
-- BƯỚC 6: Fix work_order_complete_payment - thống nhất dùng reservedstock
-- ============================================================================
-- Sau khi xóa trigger: stock deduction = 1 lần → OK
-- Chỉ cần sửa cột reserved → reservedstock

DROP FUNCTION IF EXISTS public.work_order_complete_payment(TEXT, TEXT, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS public.work_order_complete_payment(TEXT, NUMERIC, TEXT, TEXT);

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
  v_insufficient JSONB := '[]'::jsonb;
BEGIN
  -- Get user's branch
  SELECT branch_id INTO v_user_branch
  FROM public.profiles
  WHERE id = auth.uid();
  
  IF v_user_branch IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  -- Get order with lock
  SELECT * INTO v_order FROM work_orders WHERE id = p_order_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND';
  END IF;

  IF v_order.branchid IS DISTINCT FROM v_user_branch THEN
    RAISE EXCEPTION 'BRANCH_MISMATCH';
  END IF;

  IF v_order.refunded = TRUE THEN
    RAISE EXCEPTION 'ORDER_REFUNDED';
  END IF;

  -- Calculate new totals
  v_total_paid := COALESCE(v_order.totalpaid, 0) + p_payment_amount;
  v_remaining := v_order.total - v_total_paid;

  IF v_remaining <= 0 THEN
    v_new_status := 'paid';
    v_remaining := 0;
  ELSIF v_total_paid > 0 THEN
    v_new_status := 'partial';
  ELSE
    v_new_status := 'unpaid';
  END IF;

  -- CHỈ TRỪ KHO NẾU: (1) Thanh toán đủ VÀ (2) Chưa trừ kho trước đó
  v_should_deduct_inventory := (v_new_status = 'paid' AND COALESCE(v_order.inventory_deducted, FALSE) = FALSE);

  -- Tạo giao dịch thanh toán
  IF p_payment_amount > 0 AND p_payment_method IS NOT NULL THEN
    v_payment_tx_id := gen_random_uuid()::text;
    INSERT INTO cash_transactions(
      id, type, category, amount, date, description, branchid, paymentsource, reference
    )
    VALUES (
      v_payment_tx_id, 'income', 'service_income', p_payment_amount, NOW(),
      'Thanh toán sửa chữa ' || p_order_id,
      v_order.branchid, p_payment_method, p_order_id
    );
  END IF;

  -- Trừ kho khi thanh toán đủ
  IF v_should_deduct_inventory AND v_order.partsused IS NOT NULL THEN
    FOR v_part IN SELECT * FROM jsonb_array_elements(v_order.partsused)
    LOOP
      v_part_id := (v_part->>'partId');
      v_part_name := (v_part->>'partName');
      v_quantity := COALESCE((v_part->>'quantity')::int, 0);

      IF v_part_id IS NULL OR v_quantity <= 0 THEN
        CONTINUE;
      END IF;

      -- ✅ FIX: Dùng reservedstock (không phải reserved)
      SELECT 
        COALESCE((stock->>v_order.branchid)::int, 0),
        COALESCE((reservedstock->>v_order.branchid)::int, 0)
      INTO v_current_stock, v_current_reserved
      FROM parts WHERE id = v_part_id FOR UPDATE;

      IF NOT FOUND THEN
        CONTINUE;
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

      -- ✅ FIX: Giảm reservedstock (không phải reserved)
      UPDATE parts
      SET reservedstock = jsonb_set(
        COALESCE(reservedstock, '{}'::jsonb),
        ARRAY[v_order.branchid],
        to_jsonb(GREATEST(0, v_current_reserved - v_quantity))
      )
      WHERE id = v_part_id;

      -- Giảm stock thực (trigger đã xóa → chỉ trừ 1 lần)
      UPDATE parts
      SET stock = jsonb_set(
        stock, ARRAY[v_order.branchid],
        to_jsonb(GREATEST(0, v_current_stock - v_quantity))
      )
      WHERE id = v_part_id;

      -- Tạo inventory transaction (Xuất kho) - trigger ĐÃ BỊ XÓA nên không bị double
      INSERT INTO inventory_transactions(
        id, type, "partId", "partName", quantity, date, "unitPrice", "totalPrice",
        "branchId", notes, "workOrderId"
      )
      VALUES (
        gen_random_uuid()::text, 'Xuất kho', v_part_id, v_part_name, v_quantity,
        NOW(),
        COALESCE(public.mc_avg_cost(v_part_id, v_order.branchid), 0),
        COALESCE(public.mc_avg_cost(v_part_id, v_order.branchid), 0) * v_quantity,
        v_order.branchid,
        'Xuất kho thanh toán phiếu sửa chữa ' || p_order_id,
        p_order_id
      );
    END LOOP;

    IF jsonb_array_length(v_insufficient) > 0 THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK:%', v_insufficient::text;
    END IF;
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
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  RETURN jsonb_build_object(
    'workOrder', row_to_json(v_order),
    'paymentTransactionId', v_payment_tx_id,
    'newPaymentStatus', v_new_status,
    'inventoryDeducted', v_should_deduct_inventory
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.work_order_complete_payment TO authenticated;
COMMENT ON FUNCTION public.work_order_complete_payment IS 
  '2026-02-06: Thanh toán phiếu - reservedstock thống nhất, trigger đã xóa chống double';

DO $$ BEGIN RAISE NOTICE '✅ Bước 6 OK: work_order_complete_payment đã cập nhật'; END $$;


-- ============================================================================
-- BƯỚC 7: Fix work_order_create_atomic - thống nhất dùng reservedstock
-- ============================================================================

DROP FUNCTION IF EXISTS public.work_order_create_atomic CASCADE;

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
  -- Get user's branch
  SELECT branch_id INTO v_user_branch
  FROM public.profiles
  WHERE id = auth.uid();
  
  IF v_user_branch IS NULL THEN
    v_user_branch := p_branch_id;
  END IF;
  
  IF p_branch_id IS DISTINCT FROM v_user_branch THEN
    RAISE EXCEPTION 'BRANCH_MISMATCH';
  END IF;

  IF p_payment_status NOT IN ('unpaid', 'paid', 'partial') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_STATUS';
  END IF;

  v_actual_additional_payment := GREATEST(p_total - COALESCE(p_deposit_amount, 0), 0);

  -- Reserve stock (KHÔNG trừ kho - chỉ trừ khi thanh toán qua complete_payment)
  IF v_parts_count > 0 THEN
    WHILE v_index < v_parts_count LOOP
      v_part := p_parts_used->v_index;
      v_part_id := v_part->>'partId';
      v_part_name := v_part->>'partName';
      v_quantity := COALESCE((v_part->>'quantity')::INT, 0);

      IF v_quantity > 0 THEN
        -- ✅ FIX: Dùng reservedstock (không phải reserved)
        SELECT 
          COALESCE((stock->>p_branch_id)::INT, 0),
          COALESCE((reservedstock->>p_branch_id)::INT, 0)
        INTO v_current_stock, v_current_reserved
        FROM parts
        WHERE id = v_part_id;

        IF FOUND THEN
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
          SET reservedstock = jsonb_set(
            COALESCE(reservedstock, '{}'::jsonb),
            ARRAY[p_branch_id],
            to_jsonb(COALESCE((reservedstock->>p_branch_id)::INT, 0) + v_quantity)
          )
          WHERE id = v_part_id;
        END IF;
      END IF;

      v_index := v_index + 1;
    END LOOP;
  END IF;

  -- Insert work order
  INSERT INTO work_orders(
    id, customername, customerphone, vehicleid, vehiclemodel, licenseplate,
    currentkm, issuedescription, technicianname, status, laborcost, discount,
    partsused, additionalservices, total, branchid, paymentstatus,
    paymentmethod, depositamount, additionalpayment, totalpaid,
    remainingamount, creationdate
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

  -- Đặt cọc
  IF p_deposit_amount > 0 AND p_payment_method IS NOT NULL THEN
    v_deposit_tx_id := gen_random_uuid()::text;
    INSERT INTO cash_transactions(
      id, type, category, amount, date, description, branchid, paymentsource, reference
    )
    VALUES (
      v_deposit_tx_id, 'income', 'service_deposit', p_deposit_amount, v_creation_date,
      'Đặt cọc sửa chữa ' || p_order_id, p_branch_id, p_payment_method, p_order_id
    );
    UPDATE work_orders 
    SET deposittransactionid = v_deposit_tx_id, depositdate = v_creation_date
    WHERE id = p_order_id;
  END IF;

  -- Thanh toán
  IF p_additional_payment > 0 AND p_payment_method IS NOT NULL THEN
    v_payment_tx_id := gen_random_uuid()::text;
    INSERT INTO cash_transactions(
      id, type, category, amount, date, description, branchid, paymentsource, reference
    )
    VALUES (
      v_payment_tx_id, 'income', 'service_income', 
      v_actual_additional_payment, v_creation_date,
      'Thu tiền sửa chữa ' || p_order_id, p_branch_id, p_payment_method, p_order_id
    );
    UPDATE work_orders 
    SET cashtransactionid = v_payment_tx_id, paymentdate = v_creation_date
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
COMMENT ON FUNCTION public.work_order_create_atomic IS 
  '2026-02-06: Tạo phiếu sửa chữa - Dùng reservedstock thống nhất';

DO $$ BEGIN RAISE NOTICE '✅ Bước 7 OK: work_order_create_atomic đã cập nhật'; END $$;


-- ============================================================================
-- BƯỚC 8: Fix work_order_update_atomic - thống nhất dùng reservedstock
-- ============================================================================

DROP FUNCTION IF EXISTS public.work_order_update_atomic CASCADE;

CREATE OR REPLACE FUNCTION public.work_order_update_atomic(
  p_order_id text,
  p_customer_name text,
  p_customer_phone text,
  p_vehicle_model text,
  p_license_plate text,
  p_vehicle_id text DEFAULT NULL,
  p_current_km integer DEFAULT NULL,
  p_issue_description text DEFAULT '',
  p_technician_name text DEFAULT '',
  p_status text DEFAULT 'Tiếp nhận',
  p_labor_cost numeric DEFAULT 0,
  p_discount numeric DEFAULT 0,
  p_parts_used jsonb DEFAULT '[]'::jsonb,
  p_additional_services jsonb DEFAULT NULL,
  p_total numeric DEFAULT 0,
  p_payment_status text DEFAULT 'unpaid',
  p_payment_method text DEFAULT NULL,
  p_deposit_amount numeric DEFAULT 0,
  p_additional_payment numeric DEFAULT 0,
  p_user_id text DEFAULT NULL
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
  v_error_msg TEXT;
BEGIN
  SELECT branch_id INTO v_user_branch
  FROM public.profiles
  WHERE id = auth.uid();
  
  IF v_user_branch IS NULL THEN
    SELECT branchid INTO v_branch_id FROM work_orders WHERE id = p_order_id;
    IF v_branch_id IS NULL THEN
      RAISE EXCEPTION 'UNAUTHORIZED';
    END IF;
    v_user_branch := v_branch_id;
  END IF;

  SELECT partsused, branchid, depositamount, additionalpayment, cashtransactionid
  INTO v_old_parts, v_branch_id, v_old_deposit, v_old_additional, v_old_cash_tx_id
  FROM work_orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND: %', p_order_id;
  END IF;

  IF v_branch_id IS DISTINCT FROM v_user_branch THEN
    RAISE EXCEPTION 'BRANCH_MISMATCH';
  END IF;

  IF p_status NOT IN ('Tiếp nhận', 'Đang sửa', 'Đã sửa xong', 'Trả máy') THEN
    RAISE EXCEPTION 'INVALID_STATUS: %', p_status;
  END IF;

  IF p_payment_status NOT IN ('unpaid', 'paid', 'partial') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_STATUS: %', p_payment_status;
  END IF;

  -- STEP 1: Release reserved for removed/reduced parts
  FOR v_old_part IN SELECT * FROM jsonb_array_elements(COALESCE(v_old_parts, '[]'::jsonb))
  LOOP
    v_part_id := (v_old_part->>'partId');
    v_old_quantity := COALESCE((v_old_part->>'quantity')::int, 0);
    
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

    IF v_quantity_diff > 0 THEN
      -- ✅ FIX: Dùng reservedstock (không phải reserved)
      SELECT COALESCE((reservedstock->>v_branch_id)::int, 0) INTO v_current_reserved
      FROM parts WHERE id = v_part_id FOR UPDATE;

      UPDATE parts
      SET reservedstock = jsonb_set(
        COALESCE(reservedstock, '{}'::jsonb),
        ARRAY[v_branch_id],
        to_jsonb(GREATEST(0, v_current_reserved - v_quantity_diff))
      )
      WHERE id = v_part_id;
    END IF;
  END LOOP;

  -- STEP 2: Reserve more for new/increased parts
  FOR v_index IN 0..(v_parts_count - 1) LOOP
    v_new_part := p_parts_used->v_index;
    v_part_id := (v_new_part->>'partId');
    v_part_name := (v_new_part->>'partName');
    v_quantity := COALESCE((v_new_part->>'quantity')::int, 0);

    IF v_part_id IS NULL OR v_quantity <= 0 THEN
      CONTINUE;
    END IF;

    v_old_quantity := 0;
    FOR v_old_part IN SELECT * FROM jsonb_array_elements(COALESCE(v_old_parts, '[]'::jsonb))
    LOOP
      IF (v_old_part->>'partId') = v_part_id THEN
        v_old_quantity := COALESCE((v_old_part->>'quantity')::int, 0);
        EXIT;
      END IF;
    END LOOP;

    v_quantity_diff := v_quantity - v_old_quantity;

    IF v_quantity_diff > 0 THEN
      -- ✅ FIX: Dùng reservedstock (không phải reserved)
      SELECT 
        COALESCE((stock->>v_branch_id)::int, 0),
        COALESCE((reservedstock->>v_branch_id)::int, 0)
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
      SET reservedstock = jsonb_set(
        COALESCE(reservedstock, '{}'::jsonb),
        ARRAY[v_branch_id],
        to_jsonb(v_current_reserved + v_quantity_diff)
      )
      WHERE id = v_part_id;
    END IF;
  END LOOP;

  -- STEP 3: Handle payment changes
  IF p_deposit_amount > COALESCE(v_old_deposit, 0) AND p_payment_method IS NOT NULL THEN
    v_deposit_tx_id := gen_random_uuid()::text;
    INSERT INTO cash_transactions(
      id, type, category, amount, date, description, branchid, paymentsource, reference
    )
    VALUES (
      v_deposit_tx_id, 'income', 'service_deposit',
      p_deposit_amount - COALESCE(v_old_deposit, 0), NOW(),
      'Đặt cọc bổ sung ' || p_order_id, v_branch_id, p_payment_method, p_order_id
    );
  END IF;

  IF p_additional_payment > 0 AND p_payment_method IS NOT NULL THEN
    IF p_additional_payment > COALESCE(v_old_additional, 0)
       OR (COALESCE(v_old_additional, 0) > 0 AND v_old_cash_tx_id IS NULL) THEN
      v_payment_tx_id := gen_random_uuid()::text;
      INSERT INTO cash_transactions(
        id, type, category, amount, date, description, branchid, paymentsource, reference
      )
      VALUES (
        v_payment_tx_id, 'income', 'service_income',
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
        v_branch_id, p_payment_method, p_order_id
      );
    END IF;
  END IF;

  -- STEP 4: Update work order
  UPDATE work_orders
  SET
    customername = COALESCE(p_customer_name, customername),
    customerphone = COALESCE(p_customer_phone, customerphone),
    vehiclemodel = COALESCE(p_vehicle_model, vehiclemodel),
    licenseplate = COALESCE(p_license_plate, licenseplate),
    vehicleid = COALESCE(p_vehicle_id, vehicleid),
    currentkm = COALESCE(p_current_km, currentkm),
    issuedescription = COALESCE(p_issue_description, issuedescription),
    technicianname = COALESCE(p_technician_name, technicianname),
    status = COALESCE(p_status, status),
    laborcost = COALESCE(p_labor_cost, laborcost),
    discount = COALESCE(p_discount, discount),
    partsused = COALESCE(p_parts_used, partsused),
    additionalservices = p_additional_services,
    total = COALESCE(p_total, total),
    paymentstatus = COALESCE(p_payment_status, paymentstatus),
    paymentmethod = COALESCE(p_payment_method, paymentmethod),
    depositamount = CASE WHEN p_deposit_amount > 0 THEN p_deposit_amount ELSE depositamount END,
    additionalpayment = CASE WHEN p_additional_payment > 0 THEN p_additional_payment ELSE additionalpayment END,
    totalpaid = COALESCE(p_deposit_amount, depositamount, 0) + COALESCE(p_additional_payment, additionalpayment, 0),
    remainingamount = COALESCE(p_total, total) - (COALESCE(p_deposit_amount, depositamount, 0) + COALESCE(p_additional_payment, additionalpayment, 0)),
    deposittransactionid = COALESCE(v_deposit_tx_id, deposittransactionid),
    cashtransactionid = COALESCE(v_payment_tx_id, cashtransactionid),
    depositdate = CASE WHEN v_deposit_tx_id IS NOT NULL THEN NOW() ELSE depositdate END,
    paymentdate = CASE WHEN v_payment_tx_id IS NOT NULL THEN NOW() ELSE paymentdate END
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'workOrder', (SELECT row_to_json(work_orders.*) FROM work_orders WHERE id = p_order_id),
    'depositTransactionId', v_deposit_tx_id,
    'paymentTransactionId', v_payment_tx_id,
    'stockWarnings', v_warnings
  );

EXCEPTION
  WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_error_msg = MESSAGE_TEXT;
    RAISE EXCEPTION 'work_order_update_atomic error: %', v_error_msg;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.work_order_update_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION public.work_order_update_atomic TO anon;
GRANT EXECUTE ON FUNCTION public.work_order_update_atomic TO service_role;
COMMENT ON FUNCTION public.work_order_update_atomic IS 
  '2026-02-06: Cập nhật phiếu sửa chữa - Dùng reservedstock thống nhất';

DO $$ BEGIN RAISE NOTICE '✅ Bước 8 OK: work_order_update_atomic đã cập nhật'; END $$;


-- ============================================================================
-- BƯỚC 9: work_order_refund_atomic - ĐÃ ĐÚNG (dùng reservedstock)
-- ============================================================================
-- work_order_refund_atomic (2026-01-30) đã dùng reservedstock → OK
-- Có manual stock restore + INSERT "Nhập kho"
-- Trước: trigger cộng thêm → hoàn 2 lần
-- Sau xóa trigger (Bước 1): chỉ còn manual → OK (1 lần)

DO $$ BEGIN RAISE NOTICE '✅ Bước 9 OK: work_order_refund_atomic đã đúng (dùng reservedstock, trigger đã xóa)'; END $$;


-- ============================================================================
-- BƯỚC 10: sale_delete_atomic - ĐÃ ĐÚNG SAU KHI XÓA TRIGGER
-- ============================================================================
-- sale_delete_atomic: manual stock restore + INSERT "Nhập kho"
-- Trước: trigger cộng thêm → hoàn 2 lần
-- Sau xóa trigger (Bước 1): chỉ còn manual → OK (1 lần)

DO $$ BEGIN RAISE NOTICE '✅ Bước 10 OK: sale_delete_atomic đã đúng (trigger đã xóa)'; END $$;


-- ============================================================================
-- BƯỚC 11: Cập nhật prevent_negative_stock trigger (dùng reservedstock)
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_negative_stock()
RETURNS TRIGGER AS $$
DECLARE
  branch_key TEXT;
  stock_value INT;
  reserved_value INT;
BEGIN
  -- Chặn stock âm
  IF NEW.stock IS NOT NULL THEN
    FOR branch_key, stock_value IN 
      SELECT key, value::int FROM jsonb_each_text(NEW.stock)
    LOOP
      IF stock_value < 0 THEN
        NEW.stock = jsonb_set(NEW.stock, ARRAY[branch_key], '0'::jsonb);
        RAISE WARNING 'Stock for % branch % was negative (%), reset to 0', NEW.name, branch_key, stock_value;
      END IF;
    END LOOP;
  END IF;
  
  -- ✅ FIX: Chặn reservedstock > stock (gây available âm)
  IF NEW.reservedstock IS NOT NULL AND NEW.stock IS NOT NULL THEN
    FOR branch_key IN 
      SELECT key FROM jsonb_each_text(NEW.stock)
    LOOP
      stock_value := COALESCE((NEW.stock->>branch_key)::int, 0);
      reserved_value := COALESCE((NEW.reservedstock->>branch_key)::int, 0);
      
      IF reserved_value > stock_value THEN
        NEW.reservedstock = jsonb_set(
          NEW.reservedstock, ARRAY[branch_key], to_jsonb(stock_value)
        );
      END IF;
      
      IF reserved_value < 0 THEN
        NEW.reservedstock = jsonb_set(NEW.reservedstock, ARRAY[branch_key], '0'::jsonb);
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_negative_stock_trigger ON parts;
CREATE TRIGGER prevent_negative_stock_trigger
  BEFORE INSERT OR UPDATE ON parts
  FOR EACH ROW
  EXECUTE FUNCTION prevent_negative_stock();

DO $$ BEGIN RAISE NOTICE '✅ Bước 11 OK: prevent_negative_stock trigger cập nhật (dùng reservedstock)'; END $$;


-- ============================================================================
-- BƯỚC 12: ĐỒNG BỘ STOCK - Tính lại stock từ inventory_transactions
-- ============================================================================
-- Vì sale_create_atomic và work_order_complete_payment ĐÃ trừ kho 2 lần
-- (manual + trigger) trong suốt thời gian trigger còn active,
-- stock hiện tại KHÔNG CHÍNH XÁC.
-- Cần tính lại stock dựa trên tổng inventory_transactions.

DO $$
DECLARE
  v_part RECORD;
  v_calc_stock INT;
  v_current_stock INT;
  v_diff INT;
  v_fixed_count INT := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📋 Bước 12: Đồng bộ stock từ inventory_transactions...';
  RAISE NOTICE '========================================';

  -- Tính stock chính xác từ tổng inventory_transactions cho mỗi part + branch
  FOR v_part IN 
    SELECT 
      it."partId" as part_id,
      it."branchId" as branch_id,
      p.name as part_name,
      COALESCE((p.stock->>it."branchId")::int, 0) as current_stock,
      SUM(
        CASE 
          WHEN it.type = 'Nhập kho' THEN it.quantity
          WHEN it.type = 'Xuất kho' THEN -it.quantity
          ELSE 0
        END
      )::int as calculated_stock
    FROM inventory_transactions it
    JOIN parts p ON p.id = it."partId"
    WHERE it."partId" IS NOT NULL AND it."branchId" IS NOT NULL
    GROUP BY it."partId", it."branchId", p.name, p.stock
  LOOP
    v_calc_stock := GREATEST(0, v_part.calculated_stock);
    v_current_stock := v_part.current_stock;
    v_diff := v_current_stock - v_calc_stock;

    IF v_diff != 0 THEN
      RAISE NOTICE '  ⚠️ %: branch=%  DB=%, calc=%  (diff=%)',
        v_part.part_name, v_part.branch_id, v_current_stock, v_calc_stock, v_diff;

      UPDATE parts
      SET stock = jsonb_set(
        COALESCE(stock, '{}'::jsonb),
        ARRAY[v_part.branch_id],
        to_jsonb(v_calc_stock),
        true
      )
      WHERE id = v_part.part_id;

      v_fixed_count := v_fixed_count + 1;
    END IF;
  END LOOP;

  IF v_fixed_count = 0 THEN
    RAISE NOTICE '  ✅ Tất cả stock đã khớp với inventory_transactions!';
  ELSE
    RAISE NOTICE '  ✅ Đã sửa % sản phẩm có stock sai (do double deduction)', v_fixed_count;
  END IF;
END $$;


-- ============================================================================
-- BƯỚC 13: VERIFICATION - Chạy kiểm tra sau khi fix
-- ============================================================================

-- 1. Confirm trigger đã bị xóa
SELECT 
  'CHECK 1: Trigger inventory_tx' as test,
  CASE WHEN COUNT(*) = 0 
    THEN '✅ Trigger đã xóa - không còn double deduction' 
    ELSE '❌ Trigger vẫn còn!' 
  END as result
FROM information_schema.triggers
WHERE event_object_table = 'inventory_transactions'
  AND trigger_name = 'trg_inventory_tx_after_insert';

-- 2. Confirm function adjust_part_stock đã xóa
SELECT 
  'CHECK 2: adjust_part_stock' as test,
  CASE WHEN COUNT(*) = 0 
    THEN '✅ Function đã xóa' 
    ELSE '❌ Function vẫn còn!' 
  END as result
FROM pg_proc WHERE proname = 'adjust_part_stock';

-- 3. Kiểm tra stock âm
SELECT 
  'CHECK 3: Stock âm' as test,
  CASE WHEN COUNT(*) = 0 
    THEN '✅ Không có stock âm' 
    ELSE '❌ Có ' || COUNT(*) || ' sản phẩm stock âm!' 
  END as result
FROM parts p, jsonb_each_text(p.stock)
WHERE value::int < 0;

-- 4. Kiểm tra reserved > stock
SELECT 
  'CHECK 4: Reserved > Stock' as test,
  CASE WHEN COUNT(*) = 0 
    THEN '✅ Không có reserved > stock' 
    ELSE '❌ Có ' || COUNT(*) || ' sản phẩm reserved > stock!' 
  END as result
FROM parts p, jsonb_each_text(p.stock) s
WHERE COALESCE((p.reservedstock->>s.key)::int, 0) > s.value::int;

-- 5. Kiểm tra cột reserved đã được reset
SELECT 
  'CHECK 5: Cột reserved cũ' as test,
  CASE WHEN COUNT(*) = 0
    THEN '✅ Cột reserved đã clean (data chuyển sang reservedstock)'
    ELSE '❌ Còn ' || COUNT(*) || ' parts có data trong cột reserved!'
  END as result
FROM parts
WHERE reserved IS NOT NULL AND reserved != '{}'::jsonb;

-- 6. Liệt kê functions đã cập nhật
SELECT 
  proname as function_name,
  COALESCE(obj_description(oid), '-') as version_note
FROM pg_proc
WHERE proname IN (
  'receipt_create_atomic',
  'inventory_transfer_atomic',
  'work_order_complete_payment',
  'work_order_create_atomic',
  'work_order_update_atomic',
  'work_order_refund_atomic',
  'sale_create_atomic',
  'sale_delete_atomic',
  'prevent_negative_stock'
)
ORDER BY proname;

-- 7. Tổng quan stock hiện tại (top 50)
SELECT 
  p.name,
  p.sku,
  s.key as branch,
  s.value::int as stock_in_db,
  COALESCE((p.reservedstock->>s.key)::int, 0) as reserved,
  s.value::int - COALESCE((p.reservedstock->>s.key)::int, 0) as available
FROM parts p, jsonb_each_text(p.stock) s
WHERE s.value::int != 0 OR COALESCE((p.reservedstock->>s.key)::int, 0) != 0
ORDER BY p.name
LIMIT 50;
