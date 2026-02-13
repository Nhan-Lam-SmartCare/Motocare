-- ===================================== -- KIỂM TRA NHANH TRẠNG THÁI DATABASE
-- Copy query này vào Supabase SQL Editor và chạy
-- =====================================

SELECT '=== 1. PAYMENT SOURCES BALANCE ===' as section;
SELECT 
  id,
  balance->'CN1' as cn1_balance_should_be_zero
FROM payment_sources
WHERE id IN ('cash','bank');

SELECT '';
SELECT '=== 2. GIAO DỊCH "SỐ DƯ BAN ĐẦU" ===' as section;
SELECT 
  id,
  date,
  type,
  amount,
  paymentsource,
  LEFT(description, 50) as description
FROM cash_transactions
WHERE branchid='CN1' 
  AND (description ILIKE '%dư ban đầu%' OR id LIKE 'INITIAL-%')
ORDER BY date;

SELECT '';
SELECT '=== 3. TỔNG DELTA ===' as section;
SELECT 
  COALESCE(paymentsource, 'cash') as source,
  COUNT(*) as count,
  SUM(CASE WHEN type IN ('income','deposit') THEN amount ELSE -amount END) as delta
FROM cash_transactions
WHERE branchid='CN1'
GROUP BY COALESCE(paymentsource, 'cash');

SELECT '';
SELECT '=== 4. FINAL BALANCE TÍNH TOÁN ===' as section;
SELECT 
  'Cash' as account,
  0 as initial_should_be_zero,
  (SELECT SUM(CASE WHEN type IN ('income','deposit') THEN amount ELSE -amount END) 
   FROM cash_transactions 
   WHERE branchid='CN1' AND COALESCE(paymentsource,'cash')='cash') as delta,
  0 + (SELECT SUM(CASE WHEN type IN ('income','deposit') THEN amount ELSE -amount END) 
       FROM cash_transactions 
       WHERE branchid='CN1' AND COALESCE(paymentsource,'cash')='cash') as final_should_be_5945000
UNION ALL
SELECT 
  'Bank' as account,
  0 as initial_should_be_zero,
  (SELECT SUM(CASE WHEN type IN ('income','deposit') THEN amount ELSE -amount END) 
   FROM cash_transactions 
   WHERE branchid='CN1' AND paymentsource='bank') as delta,
  0 + (SELECT SUM(CASE WHEN type IN ('income','deposit') THEN amount ELSE -amount END) 
       FROM cash_transactions 
       WHERE branchid='CN1' AND paymentsource='bank') as final_should_be_14240374;
