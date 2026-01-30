-- ============================================
-- STEP 1: Kiểm tra schema thực tế của các bảng
-- Chạy query này TRƯỚC để xem tên cột thật
-- ============================================

SELECT 
  table_name, 
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('work_orders', 'inventory_transactions', 'cash_transactions', 'parts')
ORDER BY table_name, ordinal_position;
