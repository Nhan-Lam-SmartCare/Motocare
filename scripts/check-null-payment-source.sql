-- Check for NULL or unexpected payment source values
SELECT 
  COALESCE(paymentsource, 'NULL') as paymentsource,
  COUNT(*) as count,
  SUM(CASE WHEN type IN ('income', 'deposit') THEN amount ELSE 0 END) as total_income,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense,
  SUM(CASE 
    WHEN type IN ('income', 'deposit') THEN amount 
    WHEN type = 'expense' THEN -amount 
    ELSE 0 
  END) as net_delta
FROM cash_transactions
WHERE branchid = 'CN1'
GROUP BY COALESCE(paymentsource, 'NULL')
ORDER BY count DESC;
