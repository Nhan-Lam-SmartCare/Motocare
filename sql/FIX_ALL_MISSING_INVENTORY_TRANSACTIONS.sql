-- FIX ALL WORK ORDERS WITH inventory_deducted=true BUT NO inventory_transactions
-- Tìm và fix tất cả phiếu có cờ đã trừ kho nhưng không có bản ghi xuất kho thực tế
-- Date: 2026-01-27

DO $$
DECLARE
  v_order RECORD;
  v_part JSONB;
  v_part_id TEXT;
  v_part_name TEXT;
  v_quantity INT;
  v_current_stock INT;
  v_branch_id TEXT;
  v_total_orders INT := 0;
  v_total_parts_processed INT := 0;
  v_total_transactions_created INT := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'BẮT ĐẦU FIX INVENTORY TRANSACTIONS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- Step 1: Đếm số phiếu cần fix
  SELECT COUNT(*) INTO v_total_orders
  FROM work_orders wo
  WHERE wo.paymentstatus = 'paid'
    AND wo.inventory_deducted = true
    AND wo.partsused IS NOT NULL
    AND jsonb_array_length(wo.partsused) > 0
    AND NOT EXISTS (
      SELECT 1 FROM inventory_transactions it 
      WHERE it."workOrderId" = wo.id AND it.type = 'Xuất kho'
    );
  
  RAISE NOTICE 'Tìm thấy % phiếu cần fix', v_total_orders;
  RAISE NOTICE '';
  
  -- Step 2: Loop qua từng phiếu và fix
  FOR v_order IN 
    SELECT wo.id, wo.branchid, wo.partsused, wo.creationdate
    FROM work_orders wo
    WHERE wo.paymentstatus = 'paid'
      AND wo.inventory_deducted = true
      AND wo.partsused IS NOT NULL
      AND jsonb_array_length(wo.partsused) > 0
      AND NOT EXISTS (
        SELECT 1 FROM inventory_transactions it 
        WHERE it."workOrderId" = wo.id AND it.type = 'Xuất kho'
      )
    ORDER BY wo.creationdate ASC
  LOOP
    RAISE NOTICE '----------------------------------------';
    RAISE NOTICE 'Đang xử lý phiếu: %', v_order.id;
    RAISE NOTICE 'Ngày tạo: %', v_order.creationdate;
    RAISE NOTICE 'Chi nhánh: %', v_order.branchid;
    
    v_branch_id := v_order.branchid;
    
    -- Loop qua từng linh kiện trong phiếu
    FOR v_part IN SELECT * FROM jsonb_array_elements(v_order.partsused)
    LOOP
      v_part_id := v_part->>'partId';
      v_part_name := COALESCE(v_part->>'name', v_part->>'partName', 'Unknown');
      v_quantity := (v_part->>'quantity')::int;
      
      -- Lấy tồn kho hiện tại
      SELECT COALESCE((stock->>v_branch_id)::int, 0) INTO v_current_stock
      FROM parts
      WHERE id = v_part_id;
      
      IF v_current_stock IS NULL THEN
        RAISE NOTICE '  ⚠️  Không tìm thấy linh kiện: % (ID: %)', v_part_name, v_part_id;
        CONTINUE;
      END IF;
      
      -- Trừ kho (không cho phép âm)
      UPDATE parts
      SET stock = jsonb_set(
        stock,
        ARRAY[v_branch_id],
        to_jsonb(GREATEST(0, v_current_stock - v_quantity))
      )
      WHERE id = v_part_id;
      
      -- Tạo bản ghi xuất kho
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
        v_order.creationdate,
        COALESCE((v_part->>'price')::numeric, 0),
        COALESCE((v_part->>'price')::numeric, 0) * v_quantity,
        v_branch_id,
        '[AUTO-FIX] Xuất kho cho phiếu ' || v_order.id,
        v_order.id
      );
      
      v_total_parts_processed := v_total_parts_processed + 1;
      v_total_transactions_created := v_total_transactions_created + 1;
      
      RAISE NOTICE '  ✓ Trừ kho: % × % (Tồn: % → %)', 
        v_part_name, v_quantity, v_current_stock, GREATEST(0, v_current_stock - v_quantity);
    END LOOP;
    
    RAISE NOTICE '  ✓ Hoàn thành phiếu %', v_order.id;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'KẾT QUẢ FIX';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tổng phiếu đã fix: %', v_total_orders;
  RAISE NOTICE 'Tổng linh kiện đã xử lý: %', v_total_parts_processed;
  RAISE NOTICE 'Tổng bản ghi xuất kho đã tạo: %', v_total_transactions_created;
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ HOÀN THÀNH FIX TẤT CẢ PHIẾU!';
  
END $$;

-- Kiểm tra kết quả sau khi chạy
SELECT 
  'Số phiếu còn lỗi sau khi fix:' as thong_tin,
  COUNT(*) as so_luong
FROM work_orders wo
WHERE wo.paymentstatus = 'paid'
  AND wo.inventory_deducted = true
  AND wo.partsused IS NOT NULL
  AND jsonb_array_length(wo.partsused) > 0
  AND NOT EXISTS (
    SELECT 1 FROM inventory_transactions it 
    WHERE it."workOrderId" = wo.id AND it.type = 'Xuất kho'
  );
