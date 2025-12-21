-- Kiểm tra tên column chính xác
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'parts' 
AND column_name IN ('reserved', 'reservedstock', 'reservedStock');
