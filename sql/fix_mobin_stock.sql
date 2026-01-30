-- ============================================
-- FIX: Cập nhật stock đúng cho Môbin cao áp
-- Stock đúng = 1 (3 nhập - 2 xuất từ transactions)
-- ============================================

-- 1. Xem giá trị hiện tại
SELECT 
  id,
  name,
  stock,
  reserved,
  reservedstock
FROM parts
WHERE id = 'e9aca402-6771-46a2-b9a0-e828ca3e413f';

-- 2. FIX: Cập nhật stock = 1 và reset reserved = 0
UPDATE parts
SET 
  stock = jsonb_set(
    COALESCE(stock, '{}'::jsonb),
    ARRAY['CN1'],
    '1'::jsonb,
    true
  ),
  reserved = jsonb_set(
    COALESCE(reserved, '{}'::jsonb),
    ARRAY['CN1'],
    '0'::jsonb,
    true
  ),
  reservedstock = jsonb_set(
    COALESCE(reservedstock, '{}'::jsonb),
    ARRAY['CN1'],
    '0'::jsonb,
    true
  )
WHERE id = 'e9aca402-6771-46a2-b9a0-e828ca3e413f';

-- 3. Xác nhận sau khi fix
SELECT 
  id,
  name,
  stock,
  reserved,
  reservedstock
FROM parts
WHERE id = 'e9aca402-6771-46a2-b9a0-e828ca3e413f';
