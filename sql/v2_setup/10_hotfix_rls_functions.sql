-- ===================================================================
-- HOTFIX: Update mc_current_role() and mc_current_branch() to fall
-- back to the profiles table when no matching employee is found.
--
-- Root cause: After V1→V2 migration, employees.role contains
-- Vietnamese role names (e.g. 'Quản lý') while RLS checks compare
-- against English values ('owner', 'manager'). Profiles has the
-- correct English roles.
--
-- Run this on the V2 Supabase SQL Editor.
-- ===================================================================

CREATE OR REPLACE FUNCTION public.mc_current_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r text;
BEGIN
  -- 1. Try profiles first (has canonical English roles: owner/manager/staff)
  BEGIN
    SELECT role INTO r FROM public.profiles WHERE id = auth.uid() LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- 2. If profiles didn't yield a role, try employees table
  IF r IS NULL AND to_regclass('public.employees') IS NOT NULL THEN
    BEGIN
      SELECT role INTO r FROM public.employees WHERE user_id = auth.uid()::text LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN COALESCE(r, 'staff');
END;
$$;

CREATE OR REPLACE FUNCTION public.mc_current_branch()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE b text;
BEGIN
  -- 1. Try profiles first
  BEGIN
    SELECT branch_id INTO b FROM public.profiles WHERE id = auth.uid() LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- 2. Fall back to employees table
  IF b IS NULL AND to_regclass('public.employees') IS NOT NULL THEN
    BEGIN
      SELECT branch_id INTO b FROM public.employees WHERE user_id = auth.uid()::text LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN b;
END;
$$;
