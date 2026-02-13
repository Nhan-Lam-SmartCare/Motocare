-- Kiểm tra sự khác biệt giữa Main DB và Pin Factory DB
-- Chạy trên Main Database

-- 1. Main Database - Cash Transactions
SELECT 
  'MAIN DB' as source,
  'Cash' as type,
  (SELECT (balance->'CN1')::text::numeric FROM payment_sources WHERE id='cash') as initial_balance,
  SUM(CASE WHEN type IN ('income','deposit') THEN amount ELSE -amount END) as transaction_delta,
  (SELECT (balance->'CN1')::text::numeric FROM payment_sources WHERE id='cash') + 
  SUM(CASE WHEN type IN ('income','deposit') THEN amount ELSE -amount END) as final_balance
FROM cash_transactions 
WHERE branchid='CN1' AND COALESCE(paymentsource,'cash')='cash';

-- 2. Main Database - Bank Transactions  
SELECT 
  'MAIN DB' as source,
  'Bank' as type,
  (SELECT (balance->'CN1')::text::numeric FROM payment_sources WHERE id='bank') as initial_balance,
  SUM(CASE WHEN type IN ('income','deposit') THEN amount ELSE -amount END) as transaction_delta,
  (SELECT (balance->'CN1')::text::numeric FROM payment_sources WHERE id='bank') + 
  SUM(CASE WHEN type IN ('income','deposit') THEN amount ELSE -amount END) as final_balance
FROM cash_transactions 
WHERE branchid='CN1' AND paymentsource='bank';

-- 3. Kiểm tra table Pin Factory có tồn tại không
SELECT 
  COUNT(*) as pin_transaction_count,
  SUM(CASE WHEN type IN ('income','income-pinsupabase') THEN amount ELSE -amount END) as pin_total_delta
FROM pin_cash_transactions 
WHERE branchid='CN1'
LIMIT 5;

-- 4. Xem chi tiết một số giao dịch Pin Factory nếu có
SELECT 
  id,
  date,
  type, 
  amount,
  paymentsource,
  category
FROM pin_cash_transactions
WHERE branchid='CN1'
ORDER BY date DESC
LIMIT 10;
