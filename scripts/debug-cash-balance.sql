-- =====================================================
-- Debug Cash Balance Issues
-- =====================================================

-- 1. Check actual column names in cash_transactions
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'cash_transactions'
  AND column_name LIKE '%payment%'
ORDER BY column_name;

-- 2. Check sample transactions to see actual payment source values
SELECT 
  id,
  category,
  type,
  amount,
  date,
  branchid,
  paymentsource,
  CASE 
    WHEN paymentsource IS NOT NULL THEN 'paymentsource'
    ELSE 'other'
  END as has_paymentsource
FROM cash_transactions
WHERE branchid = 'CN1'
ORDER BY date DESC
LIMIT 10;

-- 3. Check what payment source values exist
SELECT 
  paymentsource,
  COUNT(*) as count,
  SUM(CASE WHEN type IN ('income', 'deposit') THEN amount ELSE 0 END) as total_income,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense
FROM cash_transactions
WHERE branchid = 'CN1'
GROUP BY paymentsource;

-- 4. Check current initial balances
SELECT 
  id,
  balance,
  balance->>'CN1' as cn1_balance
FROM payment_sources
WHERE id IN ('cash', 'bank');

-- 5. Calculate what the balance SHOULD be
SELECT 
  'cash' as source,
  SUM(CASE WHEN type IN ('income', 'deposit') THEN amount WHEN type = 'expense' THEN -amount ELSE 0 END) as transaction_delta,
  9170000 as target,
  9170000 - SUM(CASE WHEN type IN ('income', 'deposit') THEN amount WHEN type = 'expense' THEN -amount ELSE 0 END) as required_initial
FROM cash_transactions
WHERE branchid = 'CN1' AND paymentsource = 'cash'
UNION ALL
SELECT 
  'bank' as source,
  SUM(CASE WHEN type IN ('income', 'deposit') THEN amount WHEN type = 'expense' THEN -amount ELSE 0 END) as transaction_delta,
  22666000 as target,
  22666000 - SUM(CASE WHEN type IN ('income', 'deposit') THEN amount WHEN type = 'expense' THEN -amount ELSE 0 END) as required_initial
FROM cash_transactions
WHERE branchid = 'CN1' AND paymentsource = 'bank';
