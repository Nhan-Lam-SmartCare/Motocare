-- Script to check for historical stock desynchronization
-- This script checks if there are any products where the available stock (stock - reservedstock) is less than 0.
-- Since the system allowed selling reserved stock, some products might have Negative Effective Stock.

SELECT 
  name AS "Tên phụ tùng",
  sku AS "Mã SP",
  branch.key AS "Chi nhánh",
  COALESCE(branch.value::int, 0) AS "Tồn kho thực tế (stock)",
  COALESCE((reservedstock->>branch.key)::int, 0) AS "Đang giữ chỗ (reservedstock)",
  (COALESCE(branch.value::int, 0) - COALESCE((reservedstock->>branch.key)::int, 0)) AS "Tồn kho khả dụng"
FROM parts, jsonb_each_text(COALESCE(stock, '{"CN1": 0}'::jsonb)) AS branch
WHERE (COALESCE(branch.value::int, 0) - COALESCE((reservedstock->>branch.key)::int, 0)) < 0
ORDER BY "Tồn kho khả dụng" ASC;

-- The result will show any products that have negative available stock across any branches.
-- If the query returns "No rows returned", it means there are no historical desyncs causing negative available stock right now.
