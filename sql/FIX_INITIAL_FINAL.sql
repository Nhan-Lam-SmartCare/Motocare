-- =======================================================
-- FIX INITIAL AMOUNTS - LẦN CUỐI (sau khi fix amount âm)
-- =======================================================

DO $$
DECLARE
  v_cash_other_delta NUMERIC;
  v_bank_other_delta NUMERIC;
  v_cash_initial_needed NUMERIC;
  v_bank_initial_needed NUMERIC;
BEGIN
  -- Tính delta của TẤT CẢ giao dịch NGOẠI TRỪ INITIAL
  SELECT 
    COALESCE(SUM(CASE WHEN type IN ('income','deposit') THEN amount ELSE -amount END), 0)
  INTO v_cash_other_delta
  FROM cash_transactions
  WHERE branchid='CN1' 
    AND COALESCE(paymentsource,'cash')='cash'
    AND id != 'INITIAL-CASH-CN1';

  SELECT 
    COALESCE(SUM(CASE WHEN type IN ('income','deposit') THEN amount ELSE -amount END), 0)
  INTO v_bank_other_delta
  FROM cash_transactions
  WHERE branchid='CN1' 
    AND paymentsource='bank'
    AND id != 'INITIAL-BANK-CN1';

  -- Tính INITIAL amount cần thiết
  -- Formula: 0 + INITIAL_amount + other_delta = target
  -- => INITIAL_amount = target - other_delta
  v_cash_initial_needed := 5945000 - v_cash_other_delta;
  v_bank_initial_needed := 14240374 - v_bank_other_delta;

  RAISE NOTICE 'Cash: other_delta=%, INITIAL_needed=%', v_cash_other_delta, v_cash_initial_needed;
  RAISE NOTICE 'Bank: other_delta=%, INITIAL_needed=%', v_bank_other_delta, v_bank_initial_needed;

  -- UPDATE amount
  UPDATE cash_transactions
  SET amount = v_cash_initial_needed
  WHERE id = 'INITIAL-CASH-CN1';

  UPDATE cash_transactions
  SET amount = v_bank_initial_needed
  WHERE id = 'INITIAL-BANK-CN1';

  RAISE NOTICE '✅ Updated INITIAL amounts';
END $$;

-- VERIFY
SELECT 
  'CASH' as account,
  (SELECT amount FROM cash_transactions WHERE id='INITIAL-CASH-CN1') as initial_amount,
  SUM(CASE WHEN type IN ('income','deposit') THEN amount ELSE -amount END) as final_should_be_5945000
FROM cash_transactions
WHERE branchid='CN1' AND COALESCE(paymentsource,'cash')='cash'
UNION ALL
SELECT 
  'BANK' as account,
  (SELECT amount FROM cash_transactions WHERE id='INITIAL-BANK-CN1') as initial_amount,
  SUM(CASE WHEN type IN ('income','deposit') THEN amount ELSE -amount END) as final_should_be_14240374
FROM cash_transactions
WHERE branchid='CN1' AND paymentsource='bank';
