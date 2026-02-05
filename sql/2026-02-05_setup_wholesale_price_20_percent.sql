-- ============================================================================
-- SETUP WHOLESALE PRICE - 20% MARKUP FROM COST PRICE
-- Date: 2026-02-05
-- Purpose: Cập nhật giá bán sỉ = giá nhập × 1.2 (20% markup)
-- ============================================================================

-- ============================================================================
-- BƯỚC 1: PREVIEW - Xem trước những thay đổi sẽ được thực hiện
-- ============================================================================

-- Xem danh sách sản phẩm và giá sỉ mới sẽ được set
SELECT 
  p.id,
  p.name,
  p.sku,
  kv.key as branch_id,
  COALESCE((p."costPrice"->>kv.key)::numeric, 0) as cost_price,
  COALESCE((p."retailPrice"->>kv.key)::numeric, 0) as retail_price,
  COALESCE((p."wholesalePrice"->>kv.key)::numeric, 0) as current_wholesale,
  ROUND(COALESCE((p."costPrice"->>kv.key)::numeric, 0) * 1.2) as new_wholesale,
  ROUND(COALESCE((p."costPrice"->>kv.key)::numeric, 0) * 1.2) - COALESCE((p."wholesalePrice"->>kv.key)::numeric, 0) as difference
FROM parts p
CROSS JOIN LATERAL jsonb_each_text(p."costPrice") as kv
WHERE COALESCE((p."costPrice"->>kv.key)::numeric, 0) > 0
ORDER BY p.name
LIMIT 50;

-- Đếm số sản phẩm sẽ được cập nhật
SELECT COUNT(DISTINCT p.id) as total_products_to_update
FROM parts p
CROSS JOIN LATERAL jsonb_each_text(p."costPrice") as kv
WHERE COALESCE((p."costPrice"->>kv.key)::numeric, 0) > 0;

-- ============================================================================
-- BƯỚC 2: UPDATE - Cập nhật giá bán sỉ = giá nhập × 1.2
-- ============================================================================

-- Cập nhật wholesalePrice cho tất cả sản phẩm có costPrice
UPDATE parts p
SET "wholesalePrice" = (
  SELECT jsonb_object_agg(
    key, 
    ROUND(value::numeric * 1.2)
  )
  FROM jsonb_each_text(p."costPrice")
  WHERE value::numeric > 0
)
WHERE p."costPrice" IS NOT NULL 
  AND p."costPrice" != '{}'::jsonb
  AND EXISTS (
    SELECT 1 FROM jsonb_each_text(p."costPrice")
    WHERE value::numeric > 0
  );

-- ============================================================================
-- BƯỚC 3: VERIFY - Kiểm tra kết quả
-- ============================================================================

-- Kiểm tra một số sản phẩm sau khi update
SELECT 
  p.name,
  p.sku,
  kv.key as branch_id,
  COALESCE((p."costPrice"->>kv.key)::numeric, 0) as cost_price,
  COALESCE((p."wholesalePrice"->>kv.key)::numeric, 0) as wholesale_price,
  ROUND(COALESCE((p."costPrice"->>kv.key)::numeric, 0) * 1.2) as expected_wholesale,
  CASE 
    WHEN COALESCE((p."wholesalePrice"->>kv.key)::numeric, 0) = ROUND(COALESCE((p."costPrice"->>kv.key)::numeric, 0) * 1.2)
    THEN '✅ OK'
    ELSE '❌ Mismatch'
  END as status
FROM parts p
CROSS JOIN LATERAL jsonb_each_text(p."costPrice") as kv
WHERE COALESCE((p."costPrice"->>kv.key)::numeric, 0) > 0
ORDER BY p.name
LIMIT 30;

-- Đếm số sản phẩm đã được cập nhật đúng
SELECT 
  COUNT(*) as total,
  SUM(CASE 
    WHEN COALESCE((p."wholesalePrice"->>kv.key)::numeric, 0) = ROUND(COALESCE((p."costPrice"->>kv.key)::numeric, 0) * 1.2)
    THEN 1 ELSE 0 
  END) as correct,
  SUM(CASE 
    WHEN COALESCE((p."wholesalePrice"->>kv.key)::numeric, 0) != ROUND(COALESCE((p."costPrice"->>kv.key)::numeric, 0) * 1.2)
    THEN 1 ELSE 0 
  END) as mismatch
FROM parts p
CROSS JOIN LATERAL jsonb_each_text(p."costPrice") as kv
WHERE COALESCE((p."costPrice"->>kv.key)::numeric, 0) > 0;

-- ============================================================================
-- BƯỚC 4: XEM MẪU KẾT QUẢ
-- ============================================================================

-- Xem 20 sản phẩm đầu tiên với giá đầy đủ
SELECT 
  p.name,
  p.sku,
  p."costPrice" as "Giá nhập",
  p."wholesalePrice" as "Giá sỉ (×1.2)",
  p."retailPrice" as "Giá lẻ"
FROM parts p
WHERE p."costPrice" IS NOT NULL 
  AND p."costPrice" != '{}'::jsonb
ORDER BY p.name
LIMIT 20;
