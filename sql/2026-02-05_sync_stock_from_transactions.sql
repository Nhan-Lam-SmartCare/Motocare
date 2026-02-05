-- ============================================================================
-- SYNC STOCK FROM INVENTORY TRANSACTIONS
-- Date: 2026-02-05
-- Purpose: Đồng bộ lại stock chính xác từ inventory_transactions
-- ============================================================================

-- ============================================================================
-- STEP 1: PREVIEW - Xem trước những thay đổi sẽ được thực hiện
-- ============================================================================

-- Xem danh sách sản phẩm cần update và giá trị mới
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
SELECT 
  p.id,
  p.name,
  p.sku,
  cs."branchId",
  COALESCE((p.stock->>cs."branchId")::int, 0) as current_stock,
  GREATEST(cs.correct_stock, 0) as new_stock,
  GREATEST(cs.correct_stock, 0) - COALESCE((p.stock->>cs."branchId")::int, 0) as adjustment
FROM calculated_stock cs
JOIN parts p ON p.id = cs."partId"
WHERE COALESCE((p.stock->>cs."branchId")::int, 0) != GREATEST(cs.correct_stock, 0)
ORDER BY ABS(GREATEST(cs.correct_stock, 0) - COALESCE((p.stock->>cs."branchId")::int, 0)) DESC;

-- ============================================================================
-- STEP 2: BACKUP - Lưu backup stock hiện tại (quan trọng!)
-- ============================================================================

-- Tạo bảng backup nếu chưa có
CREATE TABLE IF NOT EXISTS parts_stock_backup (
  id SERIAL PRIMARY KEY,
  part_id TEXT NOT NULL,
  part_name TEXT,
  sku TEXT,
  old_stock JSONB,
  new_stock JSONB,
  backup_date TIMESTAMP DEFAULT NOW()
);

-- Lưu backup các parts sẽ bị thay đổi
INSERT INTO parts_stock_backup (part_id, part_name, sku, old_stock, backup_date)
SELECT 
  p.id,
  p.name,
  p.sku,
  p.stock,
  NOW()
FROM parts p
WHERE p.id IN (
  SELECT DISTINCT "partId" FROM inventory_transactions
);

-- ============================================================================
-- STEP 3: UPDATE STOCK - Đồng bộ stock từ inventory_transactions
-- ============================================================================

-- Cập nhật stock cho tất cả parts có inventory_transactions
WITH branch_stock AS (
  -- Tính stock theo từng branch trước
  SELECT 
    it."partId",
    it."branchId",
    GREATEST(
      SUM(
        CASE 
          WHEN it.type = 'Nhập kho' THEN it.quantity
          WHEN it.type = 'Xuất kho' THEN -it.quantity
          ELSE 0
        END
      ), 
      0
    ) as stock_qty
  FROM inventory_transactions it
  GROUP BY it."partId", it."branchId"
),
calculated_stock AS (
  -- Gom lại thành JSONB
  SELECT 
    bs."partId",
    jsonb_object_agg(bs."branchId", bs.stock_qty) as correct_stock_json
  FROM branch_stock bs
  GROUP BY bs."partId"
)
UPDATE parts p
SET stock = COALESCE(cs.correct_stock_json, '{}'::jsonb)
FROM calculated_stock cs
WHERE p.id = cs."partId";

-- ============================================================================
-- STEP 4: RESET RESERVED STOCK - Reset reservedStock về 0 cho các phiếu đã thanh toán
-- ============================================================================

-- Kiểm tra reservedStock hiện tại
SELECT 
  p.id,
  p.name,
  p.stock,
  p.reservedstock
FROM parts p
WHERE p.reservedstock IS NOT NULL 
  AND p.reservedstock != '{}'::jsonb;

-- Reset reservedStock cho các phiếu đã thanh toán (inventory_deducted = true)
-- Chỉ giữ lại reserved cho các phiếu chưa thanh toán

-- Tính toán reserved đúng từ work_orders chưa thanh toán
WITH pending_reserved AS (
  SELECT 
    (part->>'partId') as part_id,
    w.branchid,
    SUM(COALESCE((part->>'quantity')::int, 0)) as reserved_qty
  FROM work_orders w
  CROSS JOIN LATERAL jsonb_array_elements(w.partsused) as part
  WHERE w.paymentstatus != 'paid'
    AND w.status != 'Đã hủy'
    AND w.refunded != true
    AND COALESCE(w.inventory_deducted, false) = false
  GROUP BY (part->>'partId'), w.branchid
)
SELECT 
  p.id,
  p.name,
  pr.branchid,
  COALESCE((p.reservedstock->>pr.branchid)::int, 0) as current_reserved,
  pr.reserved_qty as correct_reserved
FROM pending_reserved pr
JOIN parts p ON p.id = pr.part_id;

-- ============================================================================
-- STEP 5: VERIFY - Kiểm tra kết quả sau khi update
-- ============================================================================

-- Kiểm tra không còn sai lệch
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
  COUNT(*) as mismatched_count
FROM calculated_stock cs
JOIN parts p ON p.id = cs."partId"
WHERE COALESCE((p.stock->>cs."branchId")::int, 0) != GREATEST(cs.calculated_stock, 0);

-- ============================================================================
-- STEP 6: UPDATE BACKUP TABLE với new_stock
-- ============================================================================

UPDATE parts_stock_backup psb
SET new_stock = p.stock
FROM parts p
WHERE psb.part_id = p.id
  AND psb.new_stock IS NULL;

-- Xem kết quả backup
SELECT 
  part_name,
  sku,
  old_stock,
  new_stock,
  backup_date
FROM parts_stock_backup
WHERE backup_date > NOW() - INTERVAL '1 hour'
ORDER BY backup_date DESC
LIMIT 20;
