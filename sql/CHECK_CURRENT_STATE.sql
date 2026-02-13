-- Kiểm tra trạng thái hiện tại của database

-- 1. Payment sources balance
SELECT 
  id,
  balance->'CN1' as cn1_balance
FROM payment_sources
WHERE id IN ('cash','bank');

-- 2. Số giao dịch và delta
SELECT 
  'Cash' as source,
  COUNT(*) as transaction_count,
  SUM(CASE WHEN type IN ('income','deposit') THEN amount ELSE -amount END) as delta
FROM cash_transactions
WHERE branchid='CN1' AND COALESCE(paymentsource,'cash')='cash'
UNION ALL
SELECT 
  'Bank' as source,
  COUNT(*) as transaction_count,
  SUM(CASE WHEN type IN ('income','deposit') THEN amount ELSE -amount END) as delta
FROM cash_transactions
WHERE branchid='CN1' AND paymentsource='bank';

-- 3. Xem các giao dịch "Số dư ban đầu"
SELECT 
  id,
  date,
  type,
  amount,
  paymentsource,
  description
FROM cash_transactions
WHERE branchid='CN1' 
  AND description LIKE '%dư ban đầu%'
ORDER BY date;

-- 4. Tính final balance
SELECT 
  'Cash' as account,
  (SELECT (balance->'CN1')::text::numeric FROM payment_sources WHERE id='cash') as initial,
  SUM(CASE WHEN type IN ('income','deposit') THEN amount ELSE -amount END) as delta,
  (SELECT (balance->'CN1')::text::numeric FROM payment_sources WHERE id='cash') + 
    SUM(CASE WHEN type IN ('income','deposit') THEN amount ELSE -amount END) as final
FROM cash_transactions
WHERE branchid='CN1' AND COALESCE(paymentsource,'cash')='cash'
UNION ALL
SELECT 
  'Bank' as account,
  (SELECT (balance->'CN1')::text::numeric FROM payment_sources WHERE id='bank') as initial,
  SUM(CASE WHEN type IN ('income','deposit') THEN amount ELSE -amount END) as delta,
  (SELECT (balance->'CN1')::text::numeric FROM payment_sources WHERE id='bank') + 
    SUM(CASE WHEN type IN ('income','deposit') THEN amount ELSE -amount END) as final
FROM cash_transactions
WHERE branchid='CN1' AND paymentsource='bank';
