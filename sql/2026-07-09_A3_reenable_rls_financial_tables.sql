-- =====================================================================
-- SECURITY FIX A3 — Re-enable RLS on tables that were switched OFF
-- Date: 2026-07-09
--
-- PROBLEM:
--   Several committed "testing" scripts DISABLE ROW LEVEL SECURITY on
--   sensitive/financial tables, and may reflect the live state:
--     - sql/2025-11-13_disable_employees_rls.sql        -> employees
--     - sql/2025-11-13_debts_tables.sql / ALL_MISSING   -> customer_debts, supplier_debts, loans, loan_payments
--     - sql/2025-12-25_sales_installments_schema.sql     -> sales_installments, installment_payments
--     - sql/TEMP_disable_rls.sql                         -> capital, fixed_assets, fixed_asset_depreciation
--     - sql/disable_rls_for_testing.sql                  -> work_orders, cash_transactions, inventory_transactions, customer_debts, supplier_debts
--   With RLS off, ANY authenticated user (and, combined with over-broad grants,
--   potentially anon) can read salaries, debts, loans, capital and cash.
--
-- FIX (two groups):
--   GROUP 1 — finance-sensitive: enable RLS + a single clean owner/manager
--             policy (reads happen in manager/owner UI; writes happen via
--             SECURITY DEFINER RPCs which bypass RLS, so this does not break
--             sale/work-order/refund flows).
--   GROUP 2 — operational (staff use these): ONLY enable RLS. Do NOT touch
--             existing branch-scoped policies. Add a safe authenticated
--             fallback policy ONLY IF the table currently has zero policies
--             (prevents locking staff out while never loosening good policies).
--
-- Depends on helpers from sql/2025-11-10_rls_policies.sql:
--   public.mc_is_manager_or_owner(), public.mc_current_role()
--
-- Idempotent. >>> TEST ON THE DEMO PROJECT FIRST <<< (see runbook).
-- =====================================================================

-- ------- GROUP 1: finance-sensitive -> owner/manager only -------------
DO $$
DECLARE
  t   text;
  pol record;
  finance_tables text[] := ARRAY[
    'customer_debts','supplier_debts','loans','loan_payments',
    'employees','sales_installments','installment_payments',
    'capital','fixed_assets','fixed_asset_depreciation','cash_transactions'
  ];
BEGIN
  FOREACH t IN ARRAY finance_tables LOOP
    IF to_regclass('public.'||t) IS NULL THEN
      RAISE NOTICE 'skip % (table not found)', t;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    -- Drop every existing policy on the table for a deterministic result.
    FOR pol IN SELECT policyname FROM pg_policies
               WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, t);
    END LOOP;

    -- Single owner/manager gate for all commands.
    EXECUTE format($f$
      CREATE POLICY sec_a3_manager_all ON public.%I
        FOR ALL TO authenticated
        USING (public.mc_is_manager_or_owner())
        WITH CHECK (public.mc_is_manager_or_owner())
    $f$, t);

    RAISE NOTICE 'GROUP1 secured: %', t;
  END LOOP;
END $$;

-- ------- GROUP 2: operational (staff) -> enable RLS, keep policies -----
DO $$
DECLARE
  t text;
  n int;
  ops_tables text[] := ARRAY['work_orders','inventory_transactions'];
BEGIN
  FOREACH t IN ARRAY ops_tables LOOP
    IF to_regclass('public.'||t) IS NULL THEN
      RAISE NOTICE 'skip % (table not found)', t;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    SELECT count(*) INTO n FROM pg_policies
      WHERE schemaname='public' AND tablename=t;

    IF n = 0 THEN
      -- No policy exists -> enabling RLS would lock everyone out.
      -- Add a minimal authenticated fallback (closes anon, preserves staff).
      EXECUTE format($f$
        CREATE POLICY sec_a3_authenticated_fallback ON public.%I
          FOR ALL TO authenticated
          USING (true) WITH CHECK (true)
      $f$, t);
      RAISE NOTICE 'GROUP2 %: RLS on + added authenticated fallback (had 0 policies)', t;
    ELSE
      RAISE NOTICE 'GROUP2 %: RLS on, kept % existing policy(ies)', t, n;
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- VERIFY (run as owner):
--   -- 1) Every table below must show relrowsecurity = true:
--   SELECT relname, relrowsecurity
--   FROM pg_class
--   WHERE relnamespace='public'::regnamespace
--     AND relname IN ('customer_debts','supplier_debts','loans','loan_payments',
--                     'employees','sales_installments','installment_payments',
--                     'capital','fixed_assets','fixed_asset_depreciation',
--                     'cash_transactions','work_orders','inventory_transactions')
--   ORDER BY relname;
--
--   -- 2) Policy inventory:
--   SELECT tablename, policyname, cmd FROM pg_policies
--   WHERE schemaname='public' AND tablename = ANY (ARRAY[
--     'customer_debts','supplier_debts','loans','loan_payments','employees',
--     'sales_installments','installment_payments','capital','fixed_assets',
--     'fixed_asset_depreciation','cash_transactions','work_orders','inventory_transactions'])
--   ORDER BY tablename, policyname;
--
-- SMOKE TEST (as a STAFF user in the app after applying):
--   - Sales/POS create + work-order create/complete must still work (RPC path).
--   - Finance / Payroll / Debt / Loans screens should be empty or blocked for staff.
--   - Owner/manager: all finance screens must still load.
-- ---------------------------------------------------------------------
