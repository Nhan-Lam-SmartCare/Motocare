-- ============================================
-- CẬP NHẬT GIÁ BÁN SỈ = GIÁ NHẬP × 1.25 (25%)
-- Ngày: 2026-02-05
-- ============================================

-- Cập nhật wholesalePrice = costPrice × 1.25
UPDATE parts p
SET "wholesalePrice" = (
  SELECT jsonb_object_agg(
    key,
    ROUND(value::numeric * 1.25)
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

-- Kiểm tra kết quả
SELECT
  COUNT(*) as total,
  SUM(CASE
    WHEN COALESCE((p."wholesalePrice"->>kv.key)::numeric, 0) = ROUND(COALESCE((p."costPrice"->>kv.key)::numeric, 0) * 1.25)
    THEN 1 ELSE 0
  END) as correct,
  SUM(CASE
    WHEN COALESCE((p."wholesalePrice"->>kv.key)::numeric, 0) != ROUND(COALESCE((p."costPrice"->>kv.key)::numeric, 0) * 1.25)
    THEN 1 ELSE 0
  END) as mismatch
FROM parts p
CROSS JOIN LATERAL jsonb_each_text(p."costPrice") as kv
WHERE COALESCE((p."costPrice"->>kv.key)::numeric, 0) > 0;
