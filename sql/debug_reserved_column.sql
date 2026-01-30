-- ============================================
-- DEBUG: Kiểm tra column reserved vs reservedstock
-- ============================================

-- 1. Xem TẤT CẢ columns trong bảng parts
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'parts'
ORDER BY column_name;

-- 2. Xem cả 2 columns reserved VÀ reservedstock nếu có
SELECT 
  id,
  name,
  stock,
  reserved,
  reservedstock
FROM parts
WHERE id = 'e9aca402-6771-46a2-b9a0-e828ca3e413f';

-- 3. Nếu có 2 column reserved và reservedstock khác nhau, đây là vấn đề
-- Code frontend đang dùng "reserved" nhưng có thể cần dùng "reservedstock"

-- 4. Nếu reserved = {"CN1": 1} thì đó là nguyên nhân -1
-- FIX: Set reserved = null hoặc {"CN1": 0}
/*
UPDATE parts
SET reserved = '{"CN1": 0}'::jsonb
WHERE id = 'e9aca402-6771-46a2-b9a0-e828ca3e413f';
*/
