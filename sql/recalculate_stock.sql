-- ============================================
-- DEBUG: Tính lại stock từ tất cả giao dịch
-- ============================================

-- 1. Xem TẤT CẢ giao dịch của sản phẩm Môbin cao áp
SELECT 
  it.date,
  it.type,
  it.quantity,
  it.notes,
  it."workOrderId",
  it."saleId"
FROM inventory_transactions it
WHERE it."partId" = 'e9aca402-6771-46a2-b9a0-e828ca3e413f'
ORDER BY it.date ASC;

-- 2. Tính tổng nhập - xuất
SELECT 
  SUM(CASE WHEN type = 'Nhập kho' THEN quantity ELSE 0 END) as total_nhap,
  SUM(CASE WHEN type = 'Xuất kho' THEN quantity ELSE 0 END) as total_xuat,
  SUM(CASE WHEN type = 'Nhập kho' THEN quantity ELSE -quantity END) as calculated_stock
FROM inventory_transactions
WHERE "partId" = 'e9aca402-6771-46a2-b9a0-e828ca3e413f'
  AND "branchId" = 'CN1';

-- 3. Xem stock hiện tại trong bảng parts
SELECT 
  id,
  name,
  sku,
  stock,
  reservedstock
FROM parts
WHERE id = 'e9aca402-6771-46a2-b9a0-e828ca3e413f';

-- 4. Nếu cần FIX - cập nhật stock về giá trị đúng
-- (Uncomment sau khi xác nhận calculated_stock ở query #2)
/*
UPDATE parts
SET stock = jsonb_set(
  COALESCE(stock, '{}'::jsonb),
  ARRAY['CN1'],
  to_jsonb(CALCULATED_VALUE_HERE),
  true
)
WHERE id = 'e9aca402-6771-46a2-b9a0-e828ca3e413f';
*/
