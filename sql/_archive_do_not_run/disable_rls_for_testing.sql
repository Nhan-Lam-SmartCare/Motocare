-- ============================================
-- TẠM THỜI DISABLE RLS CHO TESTING
-- CẢNH BÁO: Chỉ dùng trong môi trường development!
-- ============================================

-- Disable RLS cho các bảng cần thiết
ALTER TABLE work_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE customer_debts DISABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_debts DISABLE ROW LEVEL SECURITY;
ALTER TABLE cash_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions DISABLE ROW LEVEL SECURITY;

-- Verify
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity THEN '🔒 RLS Enabled'
    ELSE '🔓 RLS Disabled'
  END as status
FROM pg_tables 
WHERE tablename IN (
  'work_orders', 
  'customer_debts', 
  'supplier_debts',
  'cash_transactions',
  'inventory_transactions'
)
ORDER BY tablename;

-- ============================================
-- LƯU Ý: Để enable lại RLS sau khi test xong
-- ============================================
-- ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE customer_debts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE supplier_debts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE cash_transactions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
