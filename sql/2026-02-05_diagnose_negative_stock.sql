-- ============================================================================
-- DIAGNOSE & FIX NEGATIVE STOCK
-- Date: 2026-02-05
-- Purpose: Tìm và sửa các sản phẩm có stock âm
-- ============================================================================

-- ============================================================================
-- STEP 1: DIAGNOSE - Liệt kê tất cả sản phẩm có stock âm
-- ============================================================================

-- Query 1: Tìm tất cả parts có stock âm (bất kỳ branch nào)
SELECT 
  p.id,
  p.name,
  p.sku,
  p.stock,
  p.reservedstock,
  kv.key as branch_id,
  kv.value::int as stock_value
FROM parts p
CROSS JOIN LATERAL jsonb_each_text(p.stock) as kv
WHERE kv.value::int < 0
ORDER BY kv.value::int ASC;

-- ============================================================================
-- STEP 2: ANALYZE - Xem lịch sử inventory transactions của sản phẩm âm
-- ============================================================================

-- Query 2: Xem inventory transactions gần đây cho các sản phẩm có stock âm
SELECT 
  it.id,
  it.type,
  it."partId",
  it."partName",
  it.quantity,
  it.date,
  it.notes,
  it."workOrderId",
  it."saleId",
  it."branchId"
FROM inventory_transactions it
WHERE it."partId" IN (
  SELECT p.id 
  FROM parts p
  CROSS JOIN LATERAL jsonb_each_text(p.stock) as kv
  WHERE kv.value::int < 0
)
ORDER BY it.date DESC
LIMIT 50;

-- ============================================================================
-- STEP 3: CHECK WORK ORDERS - Xem phiếu sửa chữa liên quan
-- ============================================================================

-- Query 3: Các phiếu sửa chữa gần đây có thể gây âm kho
SELECT 
  w.id,
  w.customername,
  w.status,
  w.paymentstatus,
  w.inventory_deducted,
  w.refunded,
  w.branchid,
  w.partsused,
  w.created_at
FROM work_orders w
WHERE w.partsused IS NOT NULL 
  AND w.partsused != '[]'::jsonb
  AND (w.status = 'Đã hủy' OR w.refunded = true OR w.inventory_deducted = true)
ORDER BY w.created_at DESC
LIMIT 20;

-- ============================================================================
-- STEP 4: CALCULATE CORRECT STOCK - Tính toán stock đúng từ inventory_transactions
-- ============================================================================

-- Query 4: So sánh stock hiện tại với stock tính từ transactions
WITH calculated_stock AS (
  SELECT 
    it."partId",
    it."branchId",
    SUM(
      CASE 
        WHEN it.type = 'Nhập kho' THEN it.quantity
        WHEN it.type = 'Xuất kho' THEN -it.quantity
        ELSE 0
      END
    ) as calculated_stock
  FROM inventory_transactions it
  GROUP BY it."partId", it."branchId"
)
SELECT 
  p.id,
  p.name,
  p.sku,
  cs."branchId",
  COALESCE((p.stock->>cs."branchId")::int, 0) as current_stock,
  cs.calculated_stock,
  cs.calculated_stock - COALESCE((p.stock->>cs."branchId")::int, 0) as difference
FROM calculated_stock cs
JOIN parts p ON p.id = cs."partId"
WHERE COALESCE((p.stock->>cs."branchId")::int, 0) < 0
   OR ABS(cs.calculated_stock - COALESCE((p.stock->>cs."branchId")::int, 0)) > 0
ORDER BY ABS(cs.calculated_stock - COALESCE((p.stock->>cs."branchId")::int, 0)) DESC
LIMIT 50;

-- ============================================================================
-- STEP 5: FIX OPTION 1 - Reset stock âm về 0 (Quick fix)
-- ============================================================================

-- UNCOMMENT TO RUN:
/*
UPDATE parts p
SET stock = (
  SELECT jsonb_object_agg(
    key, 
    GREATEST(value::int, 0)::text
  )
  FROM jsonb_each_text(p.stock)
)
WHERE EXISTS (
  SELECT 1 FROM jsonb_each_text(p.stock)
  WHERE value::int < 0
);
*/

-- ============================================================================
-- STEP 6: FIX OPTION 2 - Recalculate stock từ inventory_transactions (Accurate fix)
-- ============================================================================

-- UNCOMMENT TO RUN:
/*
WITH calculated_stock AS (
  SELECT 
    it."partId",
    it."branchId",
    SUM(
      CASE 
        WHEN it.type = 'Nhập kho' THEN it.quantity
        WHEN it.type = 'Xuất kho' THEN -it.quantity
        ELSE 0
      END
    ) as correct_stock
  FROM inventory_transactions it
  GROUP BY it."partId", it."branchId"
)
UPDATE parts p
SET stock = (
  SELECT COALESCE(
    jsonb_object_agg(cs."branchId", GREATEST(cs.correct_stock, 0)),
    '{}'::jsonb
  )
  FROM calculated_stock cs
  WHERE cs."partId" = p.id
)
WHERE p.id IN (
  SELECT DISTINCT "partId" FROM inventory_transactions
);
*/

-- ============================================================================
-- STEP 7: PREVENT FUTURE NEGATIVES - Add constraint or trigger
-- ============================================================================

-- Option A: Create a trigger to prevent negative stock
CREATE OR REPLACE FUNCTION prevent_negative_stock()
RETURNS TRIGGER AS $$
DECLARE
  branch_key TEXT;
  stock_value INT;
BEGIN
  FOR branch_key, stock_value IN 
    SELECT key, value::int FROM jsonb_each_text(NEW.stock)
  LOOP
    IF stock_value < 0 THEN
      -- Instead of raising exception, set to 0
      NEW.stock = jsonb_set(NEW.stock, ARRAY[branch_key], '0'::jsonb);
      RAISE NOTICE 'Stock for branch % was negative (%), reset to 0', branch_key, stock_value;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop if exists and recreate
DROP TRIGGER IF EXISTS prevent_negative_stock_trigger ON parts;

CREATE TRIGGER prevent_negative_stock_trigger
  BEFORE INSERT OR UPDATE ON parts
  FOR EACH ROW
  EXECUTE FUNCTION prevent_negative_stock();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify no more negative stock
SELECT COUNT(*) as negative_count
FROM parts p
CROSS JOIN LATERAL jsonb_each_text(p.stock) as kv
WHERE kv.value::int < 0;

