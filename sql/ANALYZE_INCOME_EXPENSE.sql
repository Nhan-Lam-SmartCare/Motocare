-- PHÂN TÍCH CHI TIẾT THU/CHI

-- 1. TỔNG INCOME vs EXPENSE (CASH)
SELECT 
  'Phân tích Cash' as analysis,
  SUM(CASE WHEN type IN ('income','deposit') THEN amount ELSE 0 END) as total_income,
  SUM(CASE WHEN type IN ('expense') THEN amount ELSE 0 END) as total_expense_positive,
  SUM(CASE WHEN type IN ('income','deposit') THEN amount ELSE 0 END) - 
  SUM(CASE WHEN type IN ('expense') THEN amount ELSE 0 END) as net_should_be_5945000
FROM cash_transactions
WHERE branchid='CN1' 
  AND COALESCE(paymentsource, 'cash') = 'cash';

-- 2. ĐẾM SỐ LƯỢNG TỪNG LOẠI
SELECT 
  type,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM cash_transactions
WHERE branchid='CN1' 
  AND COALESCE(paymentsource, 'cash') = 'cash'
GROUP BY type
ORDER BY type;

-- 3. XEM GIAO DỊCH INITIAL
SELECT 
  id,
  date,
  type,
  amount,
  description
FROM cash_transactions
WHERE branchid='CN1' 
  AND id = 'INITIAL-CASH-CN1';

-- 4. TÍNH LẠI NHƯ CODE UI (with type inference)
SELECT 
  'Tính theo UI logic' as method,
  SUM(CASE 
    WHEN type IN ('income','deposit') 
      OR category IN ('sale_income','service_income','other_income','debt_collection','general_income')
    THEN amount 
    ELSE -amount 
  END) as delta
FROM cash_transactions
WHERE branchid='CN1' 
  AND COALESCE(paymentsource, 'cash') = 'cash';
