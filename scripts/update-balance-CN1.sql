-- =====================================================
-- Update Initial Balance for Branch CN1
-- Date: February 13, 2026
-- Target balances:
--   - Tiền mặt: 9,170,000 đ
--   - Ngân hàng: 22,666,000 đ
-- =====================================================

DO $$
DECLARE
  target_branch_id TEXT := 'CN1';
  target_cash_balance NUMERIC := 9170000;
  target_bank_balance NUMERIC := 22666000;
  
  current_cash_delta NUMERIC;
  current_bank_delta NUMERIC;
  required_initial_cash NUMERIC;
  required_initial_bank NUMERIC;
BEGIN
  -- Tính biến động từ giao dịch CASH
  SELECT 
    COALESCE(
      SUM(CASE 
        WHEN LOWER(COALESCE(category, '')) IN (
          'sale_income',
          'service_income',
          'other_income',
          'debt_collection',
          'service_deposit',
          'employee_advance_repayment',
          'general_income',
          'deposit'
        ) THEN ABS(COALESCE(amount, 0))
        WHEN LOWER(COALESCE(category, '')) IN (
          'inventory_purchase',
          'supplier_payment',
          'debt_payment',
          'salary',
          'employee_advance',
          'loan_payment',
          'rent',
          'utilities',
          'outsourcing',
          'service_cost',
          'sale_refund',
          'other_expense',
          'general_expense'
        ) THEN -ABS(COALESCE(amount, 0))
        WHEN LOWER(COALESCE(type, '')) IN ('income', 'deposit') THEN ABS(COALESCE(amount, 0))
        WHEN LOWER(COALESCE(type, '')) = 'expense' THEN -ABS(COALESCE(amount, 0))
        ELSE 0 
      END), 
      0
    )
  INTO current_cash_delta
  FROM cash_transactions
  WHERE branchid = target_branch_id 
    AND paymentsource = 'cash';
  
  -- Tính biến động từ giao dịch BANK
  SELECT 
    COALESCE(
      SUM(CASE 
        WHEN LOWER(COALESCE(category, '')) IN (
          'sale_income',
          'service_income',
          'other_income',
          'debt_collection',
          'service_deposit',
          'employee_advance_repayment',
          'general_income',
          'deposit'
        ) THEN ABS(COALESCE(amount, 0))
        WHEN LOWER(COALESCE(category, '')) IN (
          'inventory_purchase',
          'supplier_payment',
          'debt_payment',
          'salary',
          'employee_advance',
          'loan_payment',
          'rent',
          'utilities',
          'outsourcing',
          'service_cost',
          'sale_refund',
          'other_expense',
          'general_expense'
        ) THEN -ABS(COALESCE(amount, 0))
        WHEN LOWER(COALESCE(type, '')) IN ('income', 'deposit') THEN ABS(COALESCE(amount, 0))
        WHEN LOWER(COALESCE(type, '')) = 'expense' THEN -ABS(COALESCE(amount, 0))
        ELSE 0 
      END), 
      0
    )
  INTO current_bank_delta
  FROM cash_transactions
  WHERE branchid = target_branch_id 
    AND paymentsource = 'bank';
  
  -- Tính số dư ban đầu cần thiết
  required_initial_cash := target_cash_balance - current_cash_delta;
  required_initial_bank := target_bank_balance - current_bank_delta;
  
  -- Hiển thị thông tin
  RAISE NOTICE '=== TIỀN MẶT ===';
  RAISE NOTICE 'Biến động từ giao dịch: %', current_cash_delta;
  RAISE NOTICE 'Số dư thực tế mong muốn: %', target_cash_balance;
  RAISE NOTICE 'Số dư ban đầu cần set: %', required_initial_cash;
  RAISE NOTICE '';
  RAISE NOTICE '=== NGÂN HÀNG ===';
  RAISE NOTICE 'Biến động từ giao dịch: %', current_bank_delta;
  RAISE NOTICE 'Số dư thực tế mong muốn: %', target_bank_balance;
  RAISE NOTICE 'Số dư ban đầu cần set: %', required_initial_bank;
  RAISE NOTICE '';
  
  -- Cập nhật số dư ban đầu cho TIỀN MẶT
  UPDATE payment_sources
  SET balance = jsonb_set(
    COALESCE(balance, '{}'::jsonb),
    ARRAY[target_branch_id],
    to_jsonb(required_initial_cash)
  )
  WHERE id = 'cash';
  
  -- Cập nhật số dư ban đầu cho NGÂN HÀNG
  UPDATE payment_sources
  SET balance = jsonb_set(
    COALESCE(balance, '{}'::jsonb),
    ARRAY[target_branch_id],
    to_jsonb(required_initial_bank)
  )
  WHERE id = 'bank';
  
  RAISE NOTICE '✅ Đã cập nhật số dư thành công!';
  RAISE NOTICE 'Refresh trang Sổ Quỹ để xem kết quả.';
END $$;

-- Kiểm tra kết quả
SELECT 
  id AS payment_source,
  (balance->>'CN1')::numeric AS initial_balance_CN1
FROM payment_sources
WHERE id IN ('cash', 'bank');
