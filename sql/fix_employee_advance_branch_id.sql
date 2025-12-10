-- Fix: Đổi branch_id từ UUID sang TEXT để khớp với app
-- Chạy script này trong Supabase SQL Editor

-- 1. Drop view phụ thuộc trước
DROP VIEW IF EXISTS employee_advances_summary;

-- 2. Sửa employee_advances table
ALTER TABLE employee_advances 
ALTER COLUMN branch_id TYPE TEXT USING branch_id::TEXT;

-- 3. Sửa employee_advance_payments table  
ALTER TABLE employee_advance_payments 
ALTER COLUMN branch_id TYPE TEXT USING branch_id::TEXT;

-- 4. Tạo lại view
CREATE OR REPLACE VIEW employee_advances_summary AS
SELECT 
  ea.*,
  e.position as employee_position,
  e.department as employee_department,
  COUNT(eap.id) as payment_count,
  COALESCE(SUM(eap.amount), 0) as total_paid_via_payments
FROM employee_advances ea
LEFT JOIN employees e ON ea.employee_id = e.id::text
LEFT JOIN employee_advance_payments eap ON ea.id = eap.advance_id
GROUP BY ea.id, e.position, e.department;

-- 5. Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('employee_advances', 'employee_advance_payments')
AND column_name = 'branch_id';
