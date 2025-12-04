-- Migration: Clean up duplicate customers and fix totalSpent/visitCount
-- Date: 2025-12-04
-- Purpose: Remove duplicate customers (same phone number) and recalculate customer statistics

-- ============================================================================
-- STEP 1: BACKUP - Tạo bảng backup trước khi xóa
-- ============================================================================
CREATE TABLE IF NOT EXISTS customers_backup_20251204 AS
SELECT * FROM customers;

-- ============================================================================
-- STEP 2: XEM DANH SÁCH TRÙNG LẶP
-- ============================================================================
-- Chạy query này để xem các khách hàng bị trùng:
SELECT 
  phone,
  COUNT(*) as duplicate_count,
  STRING_AGG(name, ', ' ORDER BY created_at) as customer_names,
  STRING_AGG(id::text, ', ' ORDER BY created_at) as customer_ids,
  MIN(created_at) as first_created,
  MAX(created_at) as last_created
FROM customers
WHERE phone IS NOT NULL AND phone != ''
GROUP BY phone
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- ============================================================================
-- STEP 3: XÓA KHÁCH HÀNG TRÙNG LẶP (giữ bản ghi cũ nhất)
-- ============================================================================
-- ⚠️ CẢNH BÁO: Query này sẽ XÓA DỮ LIỆU. Đảm bảo đã backup ở bước 1!

WITH ranked_customers AS (
  SELECT 
    id,
    phone,
    name,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY phone 
      ORDER BY created_at ASC, id ASC
    ) as rn
  FROM customers
  WHERE phone IS NOT NULL 
    AND phone != ''
    AND phone ~ '^[0-9]+$'  -- Chỉ xử lý SĐT hợp lệ (chỉ có số)
)
DELETE FROM customers
WHERE id IN (
  SELECT id 
  FROM ranked_customers 
  WHERE rn > 1  -- Xóa tất cả bản ghi trùng lặp trừ bản ghi đầu tiên
);

-- ============================================================================
-- STEP 4: KIỂM TRA KẾT QUẢ - phải trả về 0 dòng
-- ============================================================================
SELECT 
  phone,
  COUNT(*) as count
FROM customers
WHERE phone IS NOT NULL AND phone != ''
GROUP BY phone
HAVING COUNT(*) > 1;

-- ============================================================================
-- STEP 5: TẠO UNIQUE CONSTRAINT để ngăn trùng lặp trong tương lai
-- ============================================================================
-- Xóa constraint cũ nếu có
ALTER TABLE customers 
DROP CONSTRAINT IF EXISTS customers_phone_unique;

-- Tạo unique constraint mới
-- Note: Chỉ áp dụng cho phone không null và không rỗng
CREATE UNIQUE INDEX IF NOT EXISTS customers_phone_unique_idx 
ON customers (phone) 
WHERE phone IS NOT NULL AND phone != '';

-- ============================================================================
-- STEP 6: TÍNH LẠI totalSpent và visitCount từ sales (customer là JSONB)
-- ============================================================================
-- Bảng sales có cột customer kiểu JSONB với cấu trúc: {"phone": "xxx", "name": "xxx"}
-- Note: Database columns are lowercase: totalspent, visitcount, lastvisit
UPDATE customers c
SET 
  totalspent = COALESCE((
    SELECT SUM(s.total)
    FROM sales s
    WHERE s.customer->>'phone' = c.phone
      AND c.phone IS NOT NULL
      AND c.phone != ''
  ), 0),
  visitcount = COALESCE((
    SELECT COUNT(DISTINCT DATE(s.date))
    FROM sales s
    WHERE s.customer->>'phone' = c.phone
      AND c.phone IS NOT NULL
      AND c.phone != ''
  ), 0),
  lastvisit = COALESCE((
    SELECT MAX(s.date)
    FROM sales s
    WHERE s.customer->>'phone' = c.phone
      AND c.phone IS NOT NULL
      AND c.phone != ''
  ), c.lastvisit);

-- ============================================================================
-- STEP 7: CỘNG THÊM totalSpent và visitCount từ work_orders
-- ============================================================================
-- Bảng work_orders có cột customerphone (lowercase)
UPDATE customers c
SET 
  totalspent = COALESCE(c.totalspent, 0) + COALESCE((
    SELECT SUM(w.total)
    FROM work_orders w
    WHERE w.customerphone = c.phone
      AND c.phone IS NOT NULL
      AND c.phone != ''
      AND w.total > 0
  ), 0),
  visitcount = COALESCE(c.visitcount, 0) + COALESCE((
    SELECT COUNT(DISTINCT DATE(w.creationdate))
    FROM work_orders w
    WHERE w.customerphone = c.phone
      AND c.phone IS NOT NULL
      AND c.phone != ''
  ), 0);

-- ============================================================================
-- STEP 8: CẬP NHẬT lastVisit từ work_orders nếu mới hơn
-- ============================================================================
UPDATE customers c
SET lastvisit = GREATEST(
  c.lastvisit,
  (
    SELECT MAX(w.creationdate)
    FROM work_orders w
    WHERE w.customerphone = c.phone
      AND c.phone IS NOT NULL
      AND c.phone != ''
  )
)
WHERE c.phone IS NOT NULL AND c.phone != '';

-- ============================================================================
-- STEP 9: KIỂM TRA KẾT QUẢ
-- ============================================================================
-- Xem khách hàng với tổng chi tiêu đã cập nhật
SELECT 
  id,
  name,
  phone,
  totalspent,
  visitcount,
  lastvisit,
  created_at
FROM customers
WHERE totalspent > 0 OR visitcount > 0
ORDER BY totalspent DESC
LIMIT 20;

-- Xem tổng số khách hàng sau khi cleanup
SELECT 
  COUNT(*) as total_customers,
  COUNT(DISTINCT phone) as unique_phones,
  COUNT(*) - COUNT(DISTINCT phone) as remaining_duplicates
FROM customers
WHERE phone IS NOT NULL AND phone != '';

-- ============================================================================
-- ROLLBACK (nếu cần khôi phục)
-- ============================================================================
-- Chạy các lệnh này NẾU cần rollback:

-- TRUNCATE customers;
-- INSERT INTO customers SELECT * FROM customers_backup_20251204;
-- DROP TABLE customers_backup_20251204;
