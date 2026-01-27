-- ĐỒNG BỘ LẠI STOCK TỪ INVENTORY_TRANSACTIONS
-- Tính toán lại tồn kho dựa trên tổng nhập - tổng xuất từ bảng inventory_transactions
-- Date: 2026-01-27

DO $$
DECLARE
  v_part RECORD;
  v_old_stock INT;
  v_new_stock INT;
  v_total_updated INT := 0;
  v_total_parts INT := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'BẮT ĐẦU ĐỒNG BỘ TỒN KHO';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- Đếm tổng số linh kiện cần đồng bộ
  SELECT COUNT(*) INTO v_total_parts
  FROM parts p
  WHERE (p.stock->>'CN1')::int != 
    ((SELECT COALESCE(SUM(quantity), 0) FROM inventory_transactions WHERE "partId" = p.id AND type = 'Nhập kho') -
     (SELECT COALESCE(SUM(quantity), 0) FROM inventory_transactions WHERE "partId" = p.id AND type = 'Xuất kho'));
  
  RAISE NOTICE 'Tìm thấy % linh kiện cần đồng bộ', v_total_parts;
  RAISE NOTICE '';
  
  -- Loop qua từng linh kiện bị lệch
  FOR v_part IN 
    SELECT 
      p.id,
      p.name,
      p.sku,
      (p.stock->>'CN1')::int as stock_hien_tai,
      (SELECT COALESCE(SUM(quantity), 0) FROM inventory_transactions WHERE "partId" = p.id AND type = 'Nhập kho') -
      (SELECT COALESCE(SUM(quantity), 0) FROM inventory_transactions WHERE "partId" = p.id AND type = 'Xuất kho') as ton_ly_thuyet
    FROM parts p
    WHERE (p.stock->>'CN1')::int != 
      ((SELECT COALESCE(SUM(quantity), 0) FROM inventory_transactions WHERE "partId" = p.id AND type = 'Nhập kho') -
       (SELECT COALESCE(SUM(quantity), 0) FROM inventory_transactions WHERE "partId" = p.id AND type = 'Xuất kho'))
    ORDER BY p.name
  LOOP
    v_old_stock := v_part.stock_hien_tai;
    v_new_stock := v_part.ton_ly_thuyet;
    
    -- Cập nhật stock
    UPDATE parts
    SET stock = jsonb_set(
      stock,
      ARRAY['CN1'],
      to_jsonb(v_new_stock)
    )
    WHERE id = v_part.id;
    
    v_total_updated := v_total_updated + 1;
    
    RAISE NOTICE '% [%] ✓ % → % (chênh: %)',
      LPAD(v_total_updated::text, 3, ' '),
      CASE 
        WHEN v_new_stock > v_old_stock THEN '+'
        WHEN v_new_stock < v_old_stock THEN '-'
        ELSE '='
      END,
      v_old_stock,
      v_new_stock,
      (v_new_stock - v_old_stock);
    
    RAISE NOTICE '    % [%]', v_part.name, COALESCE(v_part.sku, 'N/A');
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'KẾT QUẢ ĐỒNG BỘ';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tổng linh kiện đã cập nhật: %', v_total_updated;
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ HOÀN THÀNH ĐỒNG BỘ TỒN KHO!';
  
END $$;

-- Kiểm tra kết quả sau khi đồng bộ
SELECT 
  'Số linh kiện còn lệch sau khi đồng bộ:' as thong_tin,
  COUNT(*) as so_luong
FROM parts p
WHERE (p.stock->>'CN1')::int != 
  ((SELECT COALESCE(SUM(quantity), 0) FROM inventory_transactions WHERE "partId" = p.id AND type = 'Nhập kho') -
   (SELECT COALESCE(SUM(quantity), 0) FROM inventory_transactions WHERE "partId" = p.id AND type = 'Xuất kho'));

-- Hiển thị top 10 linh kiện có tồn cao nhất sau đồng bộ
SELECT 
  name,
  sku,
  (stock->>'CN1')::int as ton_kho_sau_dong_bo
FROM parts
ORDER BY (stock->>'CN1')::int DESC
LIMIT 10;
