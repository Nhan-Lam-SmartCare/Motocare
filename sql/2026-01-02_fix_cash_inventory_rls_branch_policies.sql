-- Fix: Ensure branch-based RLS policies exist for cash_transactions & inventory_transactions
-- Date: 2026-01-02
--
-- Background: Some older setup scripts attempted to detect a camelCase column name
-- ('branchId') via information_schema, but PostgreSQL stores unquoted identifiers
-- in lowercase (e.g. branchId -> branchid). That can cause setup to fall back to
-- manager-only policies, preventing normal users from inserting cash transactions.
--
-- This script is safe to run multiple times.

DO $$
DECLARE
  cash_has_branch_camel boolean;
  cash_has_branch_lower boolean;
  inv_has_branch_camel boolean;
  inv_has_branch_lower boolean;
BEGIN
  -- CASH TRANSACTIONS -------------------------------------------------
  IF to_regclass('public.cash_transactions') IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'cash_transactions'
        AND column_name = 'branchId'
    ) INTO cash_has_branch_camel;

    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'cash_transactions'
        AND column_name = 'branchid'
    ) INTO cash_has_branch_lower;

    -- Only add branch-based policies when a branch column exists
    IF cash_has_branch_camel OR cash_has_branch_lower THEN
      BEGIN
        EXECUTE 'CREATE POLICY cash_tx_select_branch ON public.cash_transactions FOR SELECT TO authenticated USING ( ' ||
          CASE WHEN cash_has_branch_camel THEN '"branchId"' ELSE 'branchid' END ||
          ' = public.mc_current_branch() )';
      EXCEPTION WHEN duplicate_object THEN NULL;
      END;

      BEGIN
        EXECUTE 'CREATE POLICY cash_tx_insert_branch ON public.cash_transactions FOR INSERT TO authenticated WITH CHECK ( ' ||
          CASE WHEN cash_has_branch_camel THEN '"branchId"' ELSE 'branchid' END ||
          ' = public.mc_current_branch() )';
      EXCEPTION WHEN duplicate_object THEN NULL;
      END;

      BEGIN
        EXECUTE 'CREATE POLICY cash_tx_update_branch ON public.cash_transactions FOR UPDATE TO authenticated USING ( ' ||
          CASE WHEN cash_has_branch_camel THEN '"branchId"' ELSE 'branchid' END ||
          ' = public.mc_current_branch() ) WITH CHECK ( ' ||
          CASE WHEN cash_has_branch_camel THEN '"branchId"' ELSE 'branchid' END ||
          ' = public.mc_current_branch() )';
      EXCEPTION WHEN duplicate_object THEN NULL;
      END;
    END IF;
  END IF;

  -- INVENTORY TRANSACTIONS --------------------------------------------
  IF to_regclass('public.inventory_transactions') IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'inventory_transactions'
        AND column_name = 'branchId'
    ) INTO inv_has_branch_camel;

    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'inventory_transactions'
        AND column_name = 'branchid'
    ) INTO inv_has_branch_lower;

    IF inv_has_branch_camel OR inv_has_branch_lower THEN
      BEGIN
        EXECUTE 'CREATE POLICY inv_tx_select_branch ON public.inventory_transactions FOR SELECT TO authenticated USING ( ' ||
          CASE WHEN inv_has_branch_camel THEN '"branchId"' ELSE 'branchid' END ||
          ' = public.mc_current_branch() )';
      EXCEPTION WHEN duplicate_object THEN NULL;
      END;

      BEGIN
        EXECUTE 'CREATE POLICY inv_tx_insert_branch ON public.inventory_transactions FOR INSERT TO authenticated WITH CHECK ( ' ||
          CASE WHEN inv_has_branch_camel THEN '"branchId"' ELSE 'branchid' END ||
          ' = public.mc_current_branch() )';
      EXCEPTION WHEN duplicate_object THEN NULL;
      END;

      BEGIN
        EXECUTE 'CREATE POLICY inv_tx_update_branch ON public.inventory_transactions FOR UPDATE TO authenticated USING ( ' ||
          CASE WHEN inv_has_branch_camel THEN '"branchId"' ELSE 'branchid' END ||
          ' = public.mc_current_branch() ) WITH CHECK ( ' ||
          CASE WHEN inv_has_branch_camel THEN '"branchId"' ELSE 'branchid' END ||
          ' = public.mc_current_branch() )';
      EXCEPTION WHEN duplicate_object THEN NULL;
      END;
    END IF;
  END IF;
END;
$$;
