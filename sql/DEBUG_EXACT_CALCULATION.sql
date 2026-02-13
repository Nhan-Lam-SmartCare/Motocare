-- Debug: Tính lại chính xác như code UI

-- 1. TÍNH CASH DELTA (giống code CashBook.tsx lines 182-190)
SELECT 
  'CASH DELTA' as calculation,
  COUNT(*) as transaction_count,
  SUM(CASE 
    WHEN type IN ('income','deposit','sale_income','service_income','other_income','debt_collection','general_income') 
    THEN amount 
    ELSE -amount 
  END) as delta,
  0 + SUM(CASE 
    WHEN type IN ('income','deposit','sale_income','service_income','other_income','debt_collection','general_income') 
    THEN amount 
    ELSE -amount 
  END) as final_cash_should_be_5945000
FROM cash_transactions
WHERE branchid='CN1' 
  AND COALESCE(paymentsource, 'cash') = 'cash';

-- 2. TÍNH BANK DELTA
SELECT 
  'BANK DELTA' as calculation,
  COUNT(*) as transaction_count,
  SUM(CASE 
    WHEN type IN ('income','deposit','sale_income','service_income','other_income','debt_collection','general_income') 
    THEN amount 
    ELSE -amount 
  END) as delta,
  0 + SUM(CASE 
    WHEN type IN ('income','deposit','sale_income','service_income','other_income','debt_collection','general_income') 
    THEN amount 
    ELSE -amount 
  END) as final_bank_should_be_14240374
FROM cash_transactions
WHERE branchid='CN1' 
  AND paymentsource = 'bank';

-- 3. XEM 10 GIAO DỊCH CASH MỚI NHẤT
SELECT 
  id,
  date,
  type,
  amount,
  paymentsource,
  LEFT(description, 30) as description,
  category
FROM cash_transactions
WHERE branchid='CN1' 
  AND COALESCE(paymentsource, 'cash') = 'cash'
ORDER BY date DESC
LIMIT 10;

-- 4. KIỂM TRA CÓ GIAO DỊCH TRÙNG KHÔNG
SELECT 
  id,
  COUNT(*) as duplicate_count
FROM cash_transactions
WHERE branchid='CN1'
GROUP BY id
HAVING COUNT(*) > 1;
