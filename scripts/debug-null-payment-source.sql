-- =====================================================
-- DEBUG: Find NULL payment source transactions
-- =====================================================

-- Count transactions with NULL payment source
SELECT 
  'NULL paymentsource' as issue,
  COUNT(*) as count,
  SUM(CASE WHEN type IN ('income', 'deposit') THEN amount ELSE 0 END) as total_income,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense,
  SUM(CASE 
    WHEN type IN ('income', 'deposit') THEN amount 
    WHEN type = 'expense' THEN -amount 
    ELSE 0 
  END) as net_delta
FROM cash_transactions
WHERE branchid = 'CN1' AND paymentsource IS NULL;

-- Sample NULL payment source transactions
SELECT id, category, type, amount, date, branchid, paymentsource
FROM cash_transactions
WHERE branchid = 'CN1' AND paymentsource IS NULL
ORDER BY date DESC
LIMIT 10;

-- Check total transactions count
SELECT 
  COUNT(*) as total_transactions,
  COUNT(CASE WHEN paymentsource IS NULL THEN 1 END) as null_count,
  COUNT(CASE WHEN paymentsource = 'cash' THEN 1 END) as cash_count,
  COUNT(CASE WHEN paymentsource = 'bank' THEN 1 END) as bank_count,
  COUNT(CASE WHEN paymentsource NOT IN ('cash', 'bank') AND paymentsource IS NOT NULL THEN 1 END) as other_count
FROM cash_transactions
WHERE branchid = 'CN1';

-- Recalculate balance INCLUDING NULL as cash (frontend logic)
SELECT 
  'WITH NULL AS CASH' as scenario,
  'cash' as source,
  SUM(CASE 
    WHEN type IN ('income', 'deposit') THEN amount 
    WHEN type = 'expense' THEN -amount 
    ELSE 0 
  END) as transaction_delta
FROM cash_transactions
WHERE branchid = 'CN1' 
  AND (paymentsource = 'cash' OR paymentsource IS NULL)
UNION ALL
SELECT 
  'WITHOUT NULL' as scenario,
  'cash' as source,
  SUM(CASE 
    WHEN type IN ('income', 'deposit') THEN amount 
    WHEN type = 'expense' THEN -amount 
    ELSE 0 
  END) as transaction_delta
FROM cash_transactions
WHERE branchid = 'CN1' 
  AND paymentsource = 'cash';
