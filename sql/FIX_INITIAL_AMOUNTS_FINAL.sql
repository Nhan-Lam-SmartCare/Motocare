-- =============================================
-- FIX INITIAL BALANCE AMOUNTS - RECALCULATE 
-- =============================================

DO $$
DECLARE
  v_cash_other_delta NUMERIC;
  v_bank_other_delta NUMERIC;
  v_cash_initial_needed NUMERIC;
  v_bank_initial_needed NUMERIC;
BEGIN
  -- Bước 1: Tính delta của TẤT CẢ giao dịch NGOẠI TRỪ INITIAL
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

  -- Bước 2: Tính số tiền INITIAL cần thiết
  -- Formula: 0 (initial balance) + INITIAL_amount + other_delta = target
  -- => INITIAL_amount = target - other_delta
  v_cash_initial_needed := 5945000 - v_cash_other_delta;
  v_bank_initial_needed := 14240374 - v_bank_other_delta;

  RAISE NOTICE 'Cash other transactions delta: %', v_cash_other_delta;
  RAISE NOTICE 'Cash INITIAL needed: %', v_cash_initial_needed;
  RAISE NOTICE 'Bank other transactions delta: %', v_bank_other_delta;
  RAISE NOTICE 'Bank INITIAL needed: %', v_bank_initial_needed;

  -- Bước 3: UPDATE amount của 2 giao dịch INITIAL
  UPDATE cash_transactions
  SET amount = v_cash_initial_needed
  WHERE id = 'INITIAL-CASH-CN1';

  UPDATE cash_transactions
  SET amount = v_bank_initial_needed
  WHERE id = 'INITIAL-BANK-CN1';

  RAISE NOTICE '✅ Updated INITIAL transaction amounts';
END $$;

-- Bước 4: VERIFY kết quả
SELECT '=== VERIFICATION ===' as section;

SELECT 
  'Cash' as account,
  (SELECT (balance->'CN1')::text::numeric FROM payment_sources WHERE id='cash') as initial_balance,
  (SELECT amount FROM cash_transactions WHERE id='INITIAL-CASH-CN1') as initial_tx_amount,
  SUM(CASE WHEN type IN ('income','deposit') THEN amount ELSE -amount END) as total_delta,
  (SELECT (balance->'CN1')::text::numeric FROM payment_sources WHERE id='cash') + 
    SUM(CASE WHEN type IN ('income','deposit') THEN amount ELSE -amount END) as final_balance,
  CASE 
    WHEN (SELECT (balance->'CN1')::text::numeric FROM payment_sources WHERE id='cash') + 
         SUM(CASE WHEN type IN ('income','deposit') THEN amount ELSE -amount END) = 5945000 
    THEN '✅ CORRECT'
    ELSE '❌ WRONG'
  END as status
FROM cash_transactions
WHERE branchid='CN1' AND COALESCE(paymentsource,'cash')='cash'

UNION ALL

SELECT 
  'Bank' as account,
  (SELECT (balance->'CN1')::text::numeric FROM payment_sources WHERE id='bank') as initial_balance,
  (SELECT amount FROM cash_transactions WHERE id='INITIAL-BANK-CN1') as initial_tx_amount,
  SUM(CASE WHEN type IN ('income','deposit') THEN amount ELSE -amount END) as total_delta,
  (SELECT (balance->'CN1')::text::numeric FROM payment_sources WHERE id='bank') + 
    SUM(CASE WHEN type IN ('income','deposit') THEN amount ELSE -amount END) as final_balance,
  CASE 
    WHEN (SELECT (balance->'CN1')::text::numeric FROM payment_sources WHERE id='bank') + 
         SUM(CASE WHEN type IN ('income','deposit') THEN amount ELSE -amount END) = 14240374 
    THEN '✅ CORRECT'
    ELSE '❌ WRONG'
  END as status
FROM cash_transactions
WHERE branchid='CN1' AND paymentsource='bank';
