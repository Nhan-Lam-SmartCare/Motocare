-- =====================================================
-- Script: Update Initial Cash & Bank Balance
-- Purpose: Set accurate initial balance for cash and bank
-- Date: February 13, 2026
-- =====================================================

-- IMPORTANT: Replace 'YOUR_BRANCH_ID' with your actual branch ID
-- To find your branch ID, run:
-- SELECT id, name FROM branches;

DO $$
DECLARE
  target_branch_id TEXT := 'YOUR_BRANCH_ID'; -- CHANGE THIS!
  
  -- Target balances (thực tế)
  target_cash_balance NUMERIC := 9170000;  -- 9,170,000 đ
  target_bank_balance NUMERIC := 22666000; -- 22,666,000 đ
  
  -- Current calculated balances (from transactions)
  current_cash_delta NUMERIC;
  current_bank_delta NUMERIC;
  
  -- Required initial balances to achieve target
  required_initial_cash NUMERIC;
  required_initial_bank NUMERIC;
BEGIN
  -- Calculate current transaction delta for CASH
  SELECT 
    COALESCE(
      SUM(CASE 
        WHEN type IN ('income', 'deposit') THEN amount 
        WHEN type = 'expense' THEN -amount
        ELSE 0 
      END), 
      0
    )
  INTO current_cash_delta
  FROM cash_transactions
  WHERE branchid = target_branch_id 
    AND paymentsourceid = 'cash';
  
  -- Calculate current transaction delta for BANK
  SELECT 
    COALESCE(
      SUM(CASE 
        WHEN type IN ('income', 'deposit') THEN amount 
        WHEN type = 'expense' THEN -amount
        ELSE 0 
      END), 
      0
    )
  INTO current_bank_delta
  FROM cash_transactions
  WHERE branchid = target_branch_id 
    AND paymentsourceid = 'bank';
  
  -- Calculate required initial balance
  -- Formula: initial_balance = target_balance - transaction_delta
  required_initial_cash := target_cash_balance - current_cash_delta;
  required_initial_bank := target_bank_balance - current_bank_delta;
  
  -- Display calculation info
  RAISE NOTICE '=== CASH (Tiền mặt) ===';
  RAISE NOTICE 'Transaction delta: %', current_cash_delta;
  RAISE NOTICE 'Target balance: %', target_cash_balance;
  RAISE NOTICE 'Required initial: %', required_initial_cash;
  RAISE NOTICE '';
  RAISE NOTICE '=== BANK (Ngân hàng) ===';
  RAISE NOTICE 'Transaction delta: %', current_bank_delta;
  RAISE NOTICE 'Target balance: %', target_bank_balance;
  RAISE NOTICE 'Required initial: %', required_initial_bank;
  
  -- Update CASH initial balance
  UPDATE payment_sources
  SET balance = jsonb_set(
    COALESCE(balance, '{}'::jsonb),
    ARRAY[target_branch_id],
    to_jsonb(required_initial_cash)
  )
  WHERE id = 'cash';
  
  -- Update BANK initial balance
  UPDATE payment_sources
  SET balance = jsonb_set(
    COALESCE(balance, '{}'::jsonb),
    ARRAY[target_branch_id],
    to_jsonb(required_initial_bank)
  )
  WHERE id = 'bank';
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Initial balances updated successfully!';
  RAISE NOTICE 'Refresh your Cash Book page to see the correct balances.';
END $$;

-- Verify the results
SELECT 
  ps.id AS payment_source,
  ps.balance,
  (ps.balance->>'YOUR_BRANCH_ID')::numeric AS initial_balance_for_branch
FROM payment_sources ps
WHERE ps.id IN ('cash', 'bank');
