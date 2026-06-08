-- Checklist: Kiểm tra các thay đổi chưa được apply lên Supabase
-- Ngày: 17/11/2025

-- ✅ 1. Column additionalservices trong work_orders
--    File: sql/2025-11-17_add_additional_services_column.sql
--    Status: ĐÃ TỒN TẠI (đã chạy trước đó)
--    Verified: node scripts/check-additional-services-column.mjs

-- ❓ 2. Function sale_create_atomic (phiên bản mới nhất)
--    File cần check: sql/2025-11-17_fix_sale_atomic_no_auth.sql
--    Nội dung: Sửa lỗi column naming, thêm sale_code support

-- ❓ 3. Function sale_delete_atomic
--    File: sql/2025-11-17_sale_delete_atomic.sql
--    Nội dung: Hàm xóa hóa đơn và hoàn lại kho

-- ❓ 4. Function work_order_refund_atomic (fix missing 'type' column)
--    File: sql/2025-11-17_fix_work_order_refund_no_auth.sql
--    Nội dung: Thêm cột 'type' vào INSERT cash_transactions

-- ❓ 5. Column sale_code trong bảng sales
--    File: sql/2025-11-17_add_sale_code_to_sales.sql
--    Nội dung: Thêm cột sale_code với auto-increment

-- Cách kiểm tra:
-- 1. Mở Supabase Dashboard > SQL Editor
-- 2. Chạy từng query kiểm tra:

-- Check sale_code column:
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'sales' AND column_name = 'sale_code';

-- Check functions exist:
SELECT proname, prokind 
FROM pg_proc 
WHERE proname IN (
  'sale_create_atomic',
  'sale_delete_atomic', 
  'work_order_refund_atomic'
);

-- Check function definition (example):
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'sale_create_atomic'
LIMIT 1;

