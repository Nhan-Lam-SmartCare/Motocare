-- KIỂM TRA TOÀN DIỆN HỆ THỐNG NHẬP/XUẤT KHO
-- Đảm bảo dữ liệu tồn kho đúng với thực tế
-- Date: 2026-01-27

-- ========================================
-- 1. KIỂM TRA PHIẾU SỬA CHỮA ĐÃ THANH TOÁN
-- ========================================

-- 1.1. Tổng quan phiếu sửa chữa
SELECT 
  '1.1. Tổng quan phiếu sửa chữa' as muc_kiem_tra,
  paymentstatus,
  COUNT(*) as so_phieu,
  SUM(CASE WHEN partsused IS NOT NULL AND jsonb_array_length(partsused) > 0 THEN 1 ELSE 0 END) as co_linh_kien,
  SUM(CASE WHEN inventory_deducted = true THEN 1 ELSE 0 END) as da_danh_dau_tru_kho
FROM work_orders
GROUP BY paymentstatus
ORDER BY paymentstatus;

-- 1.2. Phiếu PAID có linh kiện NHƯNG KHÔNG có bản ghi xuất kho (BUG NGHIÊM TRỌNG)
SELECT 
  '1.2. Phiếu paid thiếu xuất kho (BUG)' as muc_kiem_tra,
  COUNT(*) as so_phieu_loi
FROM work_orders wo
WHERE wo.paymentstatus = 'paid'
  AND wo.partsused IS NOT NULL
  AND jsonb_array_length(wo.partsused) > 0
  AND NOT EXISTS (
    SELECT 1 FROM inventory_transactions it 
    WHERE it."workOrderId" = wo.id AND it.type = 'Xuất kho'
  );

-- 1.3. Phiếu PAID có bản ghi xuất kho - PASS
SELECT 
  '1.3. Phiếu paid có đầy đủ xuất kho' as muc_kiem_tra,
  COUNT(DISTINCT wo.id) as so_phieu_dung
FROM work_orders wo
WHERE wo.paymentstatus = 'paid'
  AND wo.partsused IS NOT NULL
  AND jsonb_array_length(wo.partsused) > 0
  AND EXISTS (
    SELECT 1 FROM inventory_transactions it 
    WHERE it."workOrderId" = wo.id AND it.type = 'Xuất kho'
  );

-- ========================================
-- 2. KIỂM TRA TÍNH TOÀN VẸN INVENTORY_TRANSACTIONS
-- ========================================

-- 2.1. Tổng quan giao dịch
SELECT 
  '2.1. Tổng quan giao dịch' as muc_kiem_tra,
  type,
  COUNT(*) as so_giao_dich,
  SUM(quantity) as tong_so_luong,
  COUNT(DISTINCT "partId") as so_linh_kien_lien_quan
FROM inventory_transactions
GROUP BY type
ORDER BY type;

-- 2.2. Giao dịch thiếu thông tin quan trọng (BUG)
SELECT 
  '2.2. Giao dịch thiếu thông tin' as muc_kiem_tra,
  COUNT(*) as so_giao_dich_loi
FROM inventory_transactions
WHERE "partId" IS NULL
   OR "partName" IS NULL
   OR quantity IS NULL
   OR quantity <= 0
   OR type NOT IN ('Nhập kho', 'Xuất kho');

-- 2.3. Giao dịch xuất kho KHÔNG gắn với phiếu sửa chữa (có thể là xuất thủ công)
SELECT 
  '2.3. Xuất kho không gắn phiếu (OK nếu xuất thủ công)' as muc_kiem_tra,
  COUNT(*) as so_giao_dich
FROM inventory_transactions
WHERE type = 'Xuất kho'
  AND "workOrderId" IS NULL;

-- ========================================
-- 3. KIỂM TRA TỒN KHO PARTS
-- ========================================

-- 3.1. Linh kiện có stock KHÁC với (nhập - xuất) (BUG NGHIÊM TRỌNG)
SELECT 
  '3.1. Stock không khớp với nhập-xuất (BUG)' as muc_kiem_tra,
  COUNT(*) as so_linh_kien_loi
FROM parts p
WHERE (p.stock->>'CN1')::int != 
  ((SELECT COALESCE(SUM(quantity), 0) FROM inventory_transactions WHERE "partId" = p.id AND type = 'Nhập kho') -
   (SELECT COALESCE(SUM(quantity), 0) FROM inventory_transactions WHERE "partId" = p.id AND type = 'Xuất kho'));

-- 3.2. Linh kiện có stock ÂM (BUG NGHIÊM TRỌNG)
SELECT 
  '3.2. Stock âm (BUG)' as muc_kiem_tra,
  COUNT(*) as so_linh_kien_bi_am
FROM parts
WHERE (stock->>'CN1')::int < 0;

-- 3.3. Linh kiện có stock NULL hoặc không có key CN1
SELECT 
  '3.3. Stock NULL hoặc thiếu CN1' as muc_kiem_tra,
  COUNT(*) as so_linh_kien_loi
FROM parts
WHERE stock IS NULL
   OR stock->>'CN1' IS NULL;

-- 3.4. Tổng quan tồn kho
SELECT 
  '3.4. Tổng quan tồn kho' as muc_kiem_tra,
  COUNT(*) as tong_so_linh_kien,
  SUM((stock->>'CN1')::int) as tong_ton_kho,
  AVG((stock->>'CN1')::int) as ton_trung_binh,
  MAX((stock->>'CN1')::int) as ton_cao_nhat,
  MIN((stock->>'CN1')::int) as ton_thap_nhat
FROM parts
WHERE stock->>'CN1' IS NOT NULL;

-- ========================================
-- 4. KIỂM TRA RESERVED STOCK
-- ========================================

-- 4.1. Linh kiện có reserved stock nhưng không có phiếu unpaid/partial
SELECT 
  '4.1. Reserved stock không hợp lệ' as muc_kiem_tra,
  COUNT(*) as so_linh_kien
FROM parts p
WHERE (p.reservedstock->>'CN1')::int > 0
  AND NOT EXISTS (
    SELECT 1 FROM work_orders wo
    WHERE wo.paymentstatus IN ('unpaid', 'partial')
      AND wo.partsused IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(wo.partsused) as part
        WHERE part->>'partId' = p.id
      )
  );

-- ========================================
-- 5. KIỂM TRA CHI TIẾT TOP LINH KIỆN CÓ VẤN ĐỀ (NẾU CÓ)
-- ========================================

-- 5.1. Top 10 linh kiện stock không khớp (nếu có)
SELECT 
  '5.1. Chi tiết linh kiện stock không khớp' as muc_kiem_tra,
  p.name,
  p.sku,
  (p.stock->>'CN1')::int as stock_hien_tai,
  (SELECT COALESCE(SUM(quantity), 0) FROM inventory_transactions WHERE "partId" = p.id AND type = 'Nhập kho') as tong_nhap,
  (SELECT COALESCE(SUM(quantity), 0) FROM inventory_transactions WHERE "partId" = p.id AND type = 'Xuất kho') as tong_xuat,
  ((SELECT COALESCE(SUM(quantity), 0) FROM inventory_transactions WHERE "partId" = p.id AND type = 'Nhập kho') -
   (SELECT COALESCE(SUM(quantity), 0) FROM inventory_transactions WHERE "partId" = p.id AND type = 'Xuất kho')) as ton_ly_thuyet,
  (p.stock->>'CN1')::int - 
  ((SELECT COALESCE(SUM(quantity), 0) FROM inventory_transactions WHERE "partId" = p.id AND type = 'Nhập kho') -
   (SELECT COALESCE(SUM(quantity), 0) FROM inventory_transactions WHERE "partId" = p.id AND type = 'Xuất kho')) as chenh_lech
FROM parts p
WHERE (p.stock->>'CN1')::int != 
  ((SELECT COALESCE(SUM(quantity), 0) FROM inventory_transactions WHERE "partId" = p.id AND type = 'Nhập kho') -
   (SELECT COALESCE(SUM(quantity), 0) FROM inventory_transactions WHERE "partId" = p.id AND type = 'Xuất kho'))
ORDER BY ABS((p.stock->>'CN1')::int - 
  ((SELECT COALESCE(SUM(quantity), 0) FROM inventory_transactions WHERE "partId" = p.id AND type = 'Nhập kho') -
   (SELECT COALESCE(SUM(quantity), 0) FROM inventory_transactions WHERE "partId" = p.id AND type = 'Xuất kho'))) DESC
LIMIT 10;

-- ========================================
-- 6. TÓM TẮT KẾT QUẢ KIỂM TRA
-- ========================================

SELECT 
  '==============================================' as line
UNION ALL
SELECT 'KẾT QUẢ KIỂM TRA TỒN KHO' as line
UNION ALL
SELECT '==============================================' as line
UNION ALL
SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM work_orders wo WHERE wo.paymentstatus = 'paid' AND wo.partsused IS NOT NULL AND jsonb_array_length(wo.partsused) > 0 AND NOT EXISTS (SELECT 1 FROM inventory_transactions it WHERE it."workOrderId" = wo.id AND it.type = 'Xuất kho')) = 0
    THEN '✅ PASS: Tất cả phiếu paid đều có xuất kho'
    ELSE '❌ FAIL: Có phiếu paid thiếu xuất kho'
  END as line
UNION ALL
SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM parts p WHERE (p.stock->>'CN1')::int != ((SELECT COALESCE(SUM(quantity), 0) FROM inventory_transactions WHERE "partId" = p.id AND type = 'Nhập kho') - (SELECT COALESCE(SUM(quantity), 0) FROM inventory_transactions WHERE "partId" = p.id AND type = 'Xuất kho'))) = 0
    THEN '✅ PASS: Tất cả stock khớp với nhập-xuất'
    ELSE '❌ FAIL: Có stock không khớp với nhập-xuất'
  END as line
UNION ALL
SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM parts WHERE (stock->>'CN1')::int < 0) = 0
    THEN '✅ PASS: Không có stock âm'
    ELSE '❌ FAIL: Có stock âm'
  END as line
UNION ALL
SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM inventory_transactions WHERE "partId" IS NULL OR quantity IS NULL OR quantity <= 0) = 0
    THEN '✅ PASS: Tất cả giao dịch hợp lệ'
    ELSE '❌ FAIL: Có giao dịch thiếu thông tin'
  END as line
UNION ALL
SELECT '==============================================' as line;
