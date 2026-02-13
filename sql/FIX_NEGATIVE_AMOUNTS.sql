-- ================================================
-- FIX NEGATIVE AMOUNTS - Sửa các giao dịch có amount âm
-- ================================================

-- Bước 1: TÌM TẤT CẢ giao dịch có amount < 0
SELECT 
  '=== GIAO DỊCH CÓ AMOUNT ÂM ===' as section;

SELECT 
  id,
  date,
  type,
  amount,
  paymentsource,
  description,
  category
FROM cash_transactions
WHERE branchid='CN1' 
  AND amount < 0
ORDER BY date DESC;

-- Bước 2: TÍNH TỔNG ẢNH HƯỞNG
SELECT 
  '=== TỔNG ẢNH HƯỞNG ===' as section;

SELECT 
  COUNT(*) as negative_count,
  SUM(amount) as total_negative_amount,
  SUM(ABS(amount)) as will_become_positive
FROM cash_transactions
WHERE branchid='CN1' 
  AND amount < 0;

-- Bước 3: FIX - Chuyển tất cả amount âm thành dương
UPDATE cash_transactions
SET amount = ABS(amount)
WHERE branchid='CN1' 
  AND amount < 0;

-- Bước 4: VERIFY - Tính lại cash delta
SELECT 
  '=== VERIFICATION AFTER FIX ===' as section;

SELECT 
  'CASH' as account,
  COUNT(*) as transaction_count,
  SUM(CASE 
    WHEN type IN ('income','deposit') THEN amount 
    ELSE -amount 
  END) as delta_should_be_5945000
FROM cash_transactions
WHERE branchid='CN1' 
  AND COALESCE(paymentsource, 'cash') = 'cash';

-- Bước 5: Kiểm tra không còn giao dịch âm
SELECT 
  COUNT(*) as should_be_zero
FROM cash_transactions
WHERE branchid='CN1' 
  AND amount < 0;
