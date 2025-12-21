-- Kiểm tra giá trị reserved trong database cho "Bộ heo dầu xe đạp"
SELECT 
  id,
  name,
  sku,
  stock,
  reserved,
  stock::jsonb - 'CN1' as stock_cn1,
  reserved::jsonb - 'CN1' as reserved_cn1
FROM parts 
WHERE name LIKE '%Bộ heo dầu xe đạp%'
ORDER BY name;

-- Kiểm tra partsUsed trong work order
SELECT 
  id,
  "customerName",
  "partsUsed",
  status,
  "paymentStatus"
FROM work_orders 
WHERE id = 'SC-20251220-619602';
