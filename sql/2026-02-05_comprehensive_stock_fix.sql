-- ============================================================================
-- COMPREHENSIVE STOCK CHECK & FIX
-- Date: 2026-02-05
-- Purpose: Kiểm tra TOÀN BỘ kho và khắc phục tất cả sản phẩm âm
-- ============================================================================

-- ============================================================================
-- BƯỚC 1: KIỂM TRA - Liệt kê TẤT CẢ sản phẩm có vấn đề
-- ============================================================================

-- 1.1: Sản phẩm có stock âm THỰC SỰ trong database
SELECT 
  'STOCK ÂM' as problem_type,
  p.id,
  p.name,
  p.sku,
  kv.key as branch_id,
  kv.value::int as stock_value,
  COALESCE((p.reservedstock->>kv.key)::int, 0) as reserved_value,
  kv.value::int - COALESCE((p.reservedstock->>kv.key)::int, 0) as available_stock
FROM parts p
CROSS JOIN LATERAL jsonb_each_text(p.stock) as kv
WHERE kv.value::int < 0
ORDER BY kv.value::int ASC;

-- 1.2: Sản phẩm có AVAILABLE STOCK âm (stock - reserved < 0)
-- Đây có thể là nguyên nhân UI hiển thị âm
SELECT 
  'AVAILABLE ÂM' as problem_type,
  p.id,
  p.name,
  p.sku,
  kv.key as branch_id,
  kv.value::int as stock_value,
  COALESCE((p.reservedstock->>kv.key)::int, 0) as reserved_value,
  kv.value::int - COALESCE((p.reservedstock->>kv.key)::int, 0) as available_stock
FROM parts p
CROSS JOIN LATERAL jsonb_each_text(p.stock) as kv
WHERE kv.value::int - COALESCE((p.reservedstock->>kv.key)::int, 0) < 0
ORDER BY (kv.value::int - COALESCE((p.reservedstock->>kv.key)::int, 0)) ASC;

-- 1.3: Tổng hợp tất cả sản phẩm có vấn đề
SELECT 
  p.id,
  p.name,
  p.sku,
  p.stock,
  p.reservedstock,
  CASE 
    WHEN EXISTS (SELECT 1 FROM jsonb_each_text(p.stock) WHERE value::int < 0) THEN 'STOCK ÂM'
    WHEN EXISTS (
      SELECT 1 FROM jsonb_each_text(p.stock) s
      WHERE s.value::int - COALESCE((p.reservedstock->>s.key)::int, 0) < 0
    ) THEN 'RESERVED > STOCK'
    ELSE 'OK'
  END as status
FROM parts p
WHERE EXISTS (SELECT 1 FROM jsonb_each_text(p.stock) WHERE value::int < 0)
   OR EXISTS (
      SELECT 1 FROM jsonb_each_text(p.stock) s
      WHERE s.value::int - COALESCE((p.reservedstock->>s.key)::int, 0) < 0
    )
ORDER BY p.name;

-- ============================================================================
-- BƯỚC 2: PHÂN TÍCH - Xem chi tiết reserved stock từ work_orders
-- ============================================================================

-- 2.1: Các work_orders CHƯA thanh toán có reserved parts
SELECT 
  w.id,
  w.customername,
  w.status,
  w.paymentstatus,
  w.inventory_deducted,
  w.branchid,
  w.created_at,
  (part->>'partId') as part_id,
  (part->>'partName') as part_name,
  (part->>'quantity')::int as quantity
FROM work_orders w
CROSS JOIN LATERAL jsonb_array_elements(w.partsused) as part
WHERE w.paymentstatus != 'paid'
  AND w.status != 'Đã hủy'
  AND COALESCE(w.refunded, false) = false
  AND COALESCE(w.inventory_deducted, false) = false
ORDER BY w.created_at DESC;

-- 2.2: Tính toán reserved ĐÚNG từ work_orders chưa thanh toán
WITH correct_reserved AS (
  SELECT 
    (part->>'partId') as part_id,
    w.branchid,
    SUM((part->>'quantity')::int) as should_be_reserved
  FROM work_orders w
  CROSS JOIN LATERAL jsonb_array_elements(w.partsused) as part
  WHERE w.paymentstatus != 'paid'
    AND w.status != 'Đã hủy'
    AND COALESCE(w.refunded, false) = false
    AND COALESCE(w.inventory_deducted, false) = false
  GROUP BY (part->>'partId'), w.branchid
)
SELECT 
  p.id,
  p.name,
  p.sku,
  cr.branchid,
  COALESCE((p.stock->>cr.branchid)::int, 0) as current_stock,
  COALESCE((p.reservedstock->>cr.branchid)::int, 0) as current_reserved,
  cr.should_be_reserved,
  COALESCE((p.stock->>cr.branchid)::int, 0) - cr.should_be_reserved as will_be_available
FROM correct_reserved cr
JOIN parts p ON p.id = cr.part_id;

-- ============================================================================
-- BƯỚC 3: SỬA CHỮA - Reset stock âm và reserved stock
-- ============================================================================

-- 3.1: RESET TẤT CẢ STOCK ÂM VỀ 0
UPDATE parts p
SET stock = (
  SELECT jsonb_object_agg(key, GREATEST(value::int, 0))
  FROM jsonb_each_text(p.stock)
)
WHERE EXISTS (
  SELECT 1 FROM jsonb_each_text(p.stock)
  WHERE value::int < 0
);

-- 3.2: RESET RESERVED STOCK - Chỉ giữ reserved cho work_orders thực sự chưa thanh toán
WITH correct_reserved AS (
  SELECT 
    (part->>'partId') as part_id,
    w.branchid,
    SUM((part->>'quantity')::int) as should_be_reserved
  FROM work_orders w
  CROSS JOIN LATERAL jsonb_array_elements(w.partsused) as part
  WHERE w.paymentstatus != 'paid'
    AND w.status != 'Đã hủy'
    AND COALESCE(w.refunded, false) = false
    AND COALESCE(w.inventory_deducted, false) = false
  GROUP BY (part->>'partId'), w.branchid
),
new_reserved AS (
  SELECT 
    cr.part_id,
    jsonb_object_agg(cr.branchid, cr.should_be_reserved) as reserved_json
  FROM correct_reserved cr
  GROUP BY cr.part_id
)
UPDATE parts p
SET reservedstock = COALESCE(nr.reserved_json, '{}'::jsonb)
FROM new_reserved nr
WHERE p.id = nr.part_id;

-- 3.3: Reset reservedstock về {} cho sản phẩm KHÔNG có trong pending work_orders
UPDATE parts p
SET reservedstock = '{}'::jsonb
WHERE p.id NOT IN (
  SELECT DISTINCT (part->>'partId')
  FROM work_orders w
  CROSS JOIN LATERAL jsonb_array_elements(w.partsused) as part
  WHERE w.paymentstatus != 'paid'
    AND w.status != 'Đã hủy'
    AND COALESCE(w.refunded, false) = false
    AND COALESCE(w.inventory_deducted, false) = false
)
AND p.reservedstock IS NOT NULL 
AND p.reservedstock != '{}'::jsonb;

-- ============================================================================
-- BƯỚC 4: ĐẢM BẢO AVAILABLE >= 0 - Nếu reserved > stock thì giảm reserved
-- ============================================================================

-- Sửa trường hợp reserved > stock (sẽ gây available âm)
UPDATE parts p
SET reservedstock = (
  SELECT jsonb_object_agg(
    key, 
    LEAST(
      COALESCE((p.reservedstock->>key)::int, 0),
      value::int
    )
  )
  FROM jsonb_each_text(p.stock)
)
WHERE EXISTS (
  SELECT 1 FROM jsonb_each_text(p.stock) s
  WHERE COALESCE((p.reservedstock->>s.key)::int, 0) > s.value::int
);

-- ============================================================================
-- BƯỚC 5: KIỂM TRA LẠI SAU KHI SỬA
-- ============================================================================

-- 5.1: Đếm số sản phẩm còn stock âm
SELECT 'Stock âm' as check_type, COUNT(*) as count
FROM parts p
CROSS JOIN LATERAL jsonb_each_text(p.stock) as kv
WHERE kv.value::int < 0

UNION ALL

-- 5.2: Đếm số sản phẩm còn available âm
SELECT 'Available âm' as check_type, COUNT(*) as count
FROM parts p
CROSS JOIN LATERAL jsonb_each_text(p.stock) as kv
WHERE kv.value::int - COALESCE((p.reservedstock->>kv.key)::int, 0) < 0;

-- ============================================================================
-- BƯỚC 6: XEM DANH SÁCH CUỐI CÙNG (nếu còn vấn đề)
-- ============================================================================

SELECT 
  p.id,
  p.name,
  p.sku,
  kv.key as branch_id,
  kv.value::int as stock,
  COALESCE((p.reservedstock->>kv.key)::int, 0) as reserved,
  kv.value::int - COALESCE((p.reservedstock->>kv.key)::int, 0) as available
FROM parts p
CROSS JOIN LATERAL jsonb_each_text(p.stock) as kv
WHERE kv.value::int < 0 
   OR kv.value::int - COALESCE((p.reservedstock->>kv.key)::int, 0) < 0
ORDER BY (kv.value::int - COALESCE((p.reservedstock->>kv.key)::int, 0)) ASC;
