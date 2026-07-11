-- =====================================================================
-- B DIAGNOSTICS — run in Supabase SQL Editor (owner), paste output back.
-- Read-only. Needed to finish B2 (oversell) and B4 (stale overloads)
-- precisely, because the LIVE function bodies cannot be introspected from
-- the repo (files were applied in an unknown order).
-- =====================================================================

-- D1) All work_order_complete_payment overloads (B4).
--     The frontend calls it with NAMED args: p_order_id, p_payment_method,
--     p_payment_amount, p_user_id. Every overload NOT matching that set is stale.
SELECT p.oid::regprocedure AS full_signature,
       pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'work_order_complete_payment'
ORDER BY 1;

-- D2) Any function still referencing the dead "reserved" column (B1 guard preview).
--     prokind/lanname filter avoids pg_get_functiondef() erroring on aggregates.
SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_language l ON l.oid = p.prolang
WHERE n.nspname = 'public'
  AND p.prokind IN ('f','p') AND l.lanname IN ('plpgsql','sql')
  AND pg_get_functiondef(p.oid) ~ '\yreserved\y'
ORDER BY 1;

-- D3) Which functions perform stock deduction / reservation, and whether they
--     clamp with GREATEST(0, ...) (oversell masking) vs raise on shortage (B2).
SELECT p.proname,
       pg_get_function_identity_arguments(p.oid) AS args,
       (pg_get_functiondef(p.oid) ~* 'GREATEST\s*\(\s*0')      AS clamps_to_zero,
       (pg_get_functiondef(p.oid) ~* 'RAISE\s+EXCEPTION')      AS can_raise
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_language l ON l.oid = p.prolang
WHERE n.nspname = 'public'
  AND p.prokind IN ('f','p') AND l.lanname IN ('plpgsql','sql')
  AND pg_get_functiondef(p.oid) ~* '(reservedstock|\ystock\y)'
  AND p.proname ~* '(sale|work_order|receipt|refund|payment|stock|inventory)'
ORDER BY 1;

-- D4) FULL definition of the core money/stock RPCs (paste these back so the
--     B2/B4 patches modify the ACTUAL live version, not a guessed one).
--     Uncomment/adjust names shown by D3 as needed.
SELECT pg_get_functiondef(p.oid) AS definition
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'sale_create_atomic',
    'work_order_create_atomic',
    'work_order_update_atomic',
    'work_order_complete_payment',
    'work_order_refund',
    -- reference the dead "reserved" column (B1 guard flagged these):
    'mc_safe_deduct_reserved',
    'mc_safe_add_reserved',
    'fix_negative_stock_daily'
  )
ORDER BY p.proname;

-- D5) Cash reconciliation snapshot (B3 part 2 — balance forensics).
SELECT paymentsource,
       branchid,
       sum(CASE WHEN type='income'  THEN amount ELSE 0 END) AS total_income,
       sum(CASE WHEN type='expense' THEN amount ELSE 0 END) AS total_expense,
       sum(CASE WHEN type='income' THEN amount ELSE -amount END) AS net_movement
FROM public.cash_transactions
GROUP BY paymentsource, branchid
ORDER BY paymentsource, branchid;
-- Compare net_movement against payment_sources.balance to see the implied
-- opening balance (initialBalance) each source would need. A large negative
-- implied cash opening indicates missing expense/income entries to reconcile.
