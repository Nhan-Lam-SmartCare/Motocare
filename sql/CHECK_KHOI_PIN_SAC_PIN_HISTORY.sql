-- ============================================================================
-- KIỂM TRA LỊCH SỬ XUẤT NHẬP - Khối pin 48V15Ah & Sạc pin 48V3A
-- Ngày: 2026-02-11
-- ============================================================================

-- 1. Tìm 2 sản phẩm trong bảng parts
SELECT 
  id,
  name,
  sku,
  stock,
  "costPrice",
  "retailPrice"
FROM parts
WHERE name ILIKE '%Khối pin 48V15Ah%' OR name ILIKE '%Sạc pin 48V3A%'
ORDER BY name;


-- 2. LỊCH SỬ XUẤT NHẬP CHI TIẾT
WITH target_parts AS (
  SELECT id, name, sku, stock
  FROM parts
  WHERE name ILIKE '%Khối pin 48V15Ah%' OR name ILIKE '%Sạc pin 48V3A%'
)
SELECT 
  tp.name AS "Tên sản phẩm",
  tp.sku AS "SKU",
  it.type AS "Loại giao dịch",
  it.quantity AS "Số lượng",
  it.date AS "Ngày giờ",
  it.notes AS "Ghi chú",
  it."branchId" AS "Chi nhánh",
  it."saleId" AS "Mã HD",
  it."workOrderId" AS "Mã PSC"
FROM target_parts tp
LEFT JOIN inventory_transactions it ON it."partId" = tp.id
ORDER BY tp.name, it.date DESC;


-- 3. TÍNH TOÁN STOCK CHO MỖI SẢN PHẨM
WITH target_parts AS (
  SELECT id, name, sku, stock
  FROM parts
  WHERE name ILIKE '%Khối pin 48V15Ah%' OR name ILIKE '%Sạc pin 48V3A%'
),
calculated_stock AS (
  SELECT 
    tp.id,
    tp.name,
    tp.sku,
    tp.stock,
    it."branchId",
    SUM(
      CASE 
        WHEN it.type IN ('Nhập kho', 'Chuyển đến', 'Hoàn trả', 'Nhập hàng', 'Điều chỉnh tăng', 'Chuyển kho đến', 'Khởi tạo') 
          THEN it.quantity
        WHEN it.type IN ('Xuất kho', 'Bán hàng', 'Chuyển đi', 'Sửa chữa', 'Điều chỉnh giảm', 'Chuyển kho đi') 
          THEN -it.quantity
        ELSE 0
      END
    ) AS stock_from_transactions
  FROM target_parts tp
  LEFT JOIN inventory_transactions it ON it."partId" = tp.id
  GROUP BY tp.id, tp.name, tp.sku, tp.stock, it."branchId"
)
SELECT 
  name AS "Tên sản phẩm",
  sku AS "SKU",
  "branchId" AS "Chi nhánh",
  COALESCE((stock->>"branchId")::int, 0) AS "Stock trong DB",
  COALESCE(stock_from_transactions, 0) AS "Stock tính từ transactions",
  COALESCE(stock_from_transactions, 0) - COALESCE((stock->>"branchId")::int, 0) AS "Sai lệch"
FROM calculated_stock
ORDER BY name;


-- 4. TỔNG HỢP THEO LOẠI GIAO DỊCH
WITH target_parts AS (
  SELECT id, name, sku
  FROM parts
  WHERE name ILIKE '%Khối pin 48V15Ah%' OR name ILIKE '%Sạc pin 48V3A%'
)
SELECT 
  tp.name AS "Tên sản phẩm",
  it.type AS "Loại",
  COUNT(*) AS "Số lần",
  SUM(it.quantity) AS "Tổng SL"
FROM target_parts tp
LEFT JOIN inventory_transactions it ON it."partId" = tp.id
WHERE it.type IS NOT NULL
GROUP BY tp.name, it.type
ORDER BY tp.name, it.type;


-- 5. PHIẾU NHẬP GẦN NHẤT (10 phiếu)
WITH target_parts AS (
  SELECT id, name, sku
  FROM parts
  WHERE name ILIKE '%Khối pin 48V15Ah%' OR name ILIKE '%Sạc pin 48V3A%'
)
SELECT 
  tp.name AS "Tên sản phẩm",
  COALESCE(
    (regexp_match(it.notes, 'NH-\d{8}-\d{3}'))[1],
    'Không có mã phiếu'
  ) AS "Mã phiếu",
  it.quantity AS "SL nhập",
  it."unitPrice" AS "Giá nhập",
  it.date::date AS "Ngày nhập",
  CASE 
    WHEN it.notes LIKE '%NCC:%' THEN 
      SUBSTRING(it.notes FROM 'NCC:([^|]+)')
    ELSE 'Không rõ'
  END AS "Nhà cung cấp"
FROM target_parts tp
JOIN inventory_transactions it ON it."partId" = tp.id
WHERE it.type = 'Nhập kho'
ORDER BY it.date DESC
LIMIT 10;


-- 6. PHIẾU XUẤT/BÁN GẦN NHẤT (10 phiếu)
WITH target_parts AS (
  SELECT id, name, sku
  FROM parts
  WHERE name ILIKE '%Khối pin 48V15Ah%' OR name ILIKE '%Sạc pin 48V3A%'
)
SELECT 
  tp.name AS "Tên sản phẩm",
  it.type AS "Loại",
  it.quantity AS "SL xuất",
  it.date::date AS "Ngày xuất",
  it."saleId" AS "Mã hóa đơn",
  it."workOrderId" AS "Mã phiếu sửa chữa",
  LEFT(it.notes, 50) AS "Ghi chú"
FROM target_parts tp
JOIN inventory_transactions it ON it."partId" = tp.id
WHERE it.type IN ('Xuất kho', 'Bán hàng')
ORDER BY it.date DESC
LIMIT 10;


-- 7. KẾT LUẬN NHANH
WITH target_parts AS (
  SELECT id, name, sku, stock
  FROM parts
  WHERE name ILIKE '%Khối pin 48V15Ah%' OR name ILIKE '%Sạc pin 48V3A%'
),
calculated AS (
  SELECT 
    tp.id,
    tp.name,
    tp.stock,
    (SELECT DISTINCT "branchId" FROM inventory_transactions LIMIT 1) AS branch_id,
    SUM(
      CASE 
        WHEN it.type IN ('Nhập kho', 'Chuyển đến', 'Hoàn trả', 'Nhập hàng', 'Điều chỉnh tăng', 'Chuyển kho đến', 'Khởi tạo') 
          THEN it.quantity
        WHEN it.type IN ('Xuất kho', 'Bán hàng', 'Chuyển đi', 'Sửa chữa', 'Điều chỉnh giảm', 'Chuyển kho đi') 
          THEN -it.quantity
        ELSE 0
      END
    ) AS stock_calculated
  FROM target_parts tp
  LEFT JOIN inventory_transactions it ON it."partId" = tp.id
  GROUP BY tp.id, tp.name, tp.stock
)
SELECT 
  '============================================' AS separator
UNION ALL
SELECT 
  name || ':' AS info
FROM calculated
UNION ALL
SELECT 
  '  • Stock trong DB: ' || COALESCE((stock->>branch_id)::text, '0') AS info
FROM calculated
UNION ALL
SELECT 
  '  • Stock tính từ transactions: ' || COALESCE(stock_calculated::text, '0') AS info
FROM calculated
UNION ALL
SELECT 
  '  • Sai lệch: ' || 
  (COALESCE(stock_calculated, 0) - COALESCE((stock->>branch_id)::int, 0))::text ||
  CASE 
    WHEN (COALESCE(stock_calculated, 0) - COALESCE((stock->>branch_id)::int, 0)) > 0 
      THEN ' (THIẾU trong DB)'
    WHEN (COALESCE(stock_calculated, 0) - COALESCE((stock->>branch_id)::int, 0)) < 0 
      THEN ' (THỪA trong DB)'
    ELSE ' (KHỚP ✓)'
  END AS info
FROM calculated
UNION ALL
SELECT '============================================';
