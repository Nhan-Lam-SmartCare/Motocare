-- ===================================================================
-- MOTOCARE V2 — AUTH PROFILES & STAFF PERMISSIONS
-- File: sql/v2_setup/09_auth_profiles.sql
-- Run after: 02_views_and_functions.sql (needs mc_is_owner helper)
-- ===================================================================
-- The frontend reads these after login (AuthContext.loadUserProfile):
--   • profiles          — id, email, name, role, branch_id (role/branch gating)
--   • staff_permissions — per-user permission overrides (JSONB)
-- Both were missing from the original 01-08 set, and RLS helpers
-- mc_current_role()/mc_current_branch() read profiles too. Without this
-- file every user logs in as default 'staff' with no branch.
-- V2 uses a single `profiles` table (V1's legacy `user_profiles` is merged
-- into it by migrate_v1_to_v2.mjs).
-- ===================================================================

-- ───────────────────────────────────────────────────────────────────
-- 1. profiles
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'manager', 'staff', 'accountant')),
  branch_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- mc_is_owner() is SECURITY DEFINER → reads profiles bypassing RLS,
-- so no infinite-recursion (unlike V1's self-referencing subquery policy).
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.mc_is_owner());

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.mc_is_owner())
  WITH CHECK (id = auth.uid() OR public.mc_is_owner());

DROP POLICY IF EXISTS "profiles_insert_owner" ON public.profiles;
CREATE POLICY "profiles_insert_owner" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.mc_is_owner());

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ───────────────────────────────────────────────────────────────────
-- 2. Auto-create profile on signup (fires for temp_import_users too)
-- ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'staff')
  ON CONFLICT (id) DO NOTHING;   -- migration upserts real roles afterwards
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ───────────────────────────────────────────────────────────────────
-- 3. staff_permissions (ported from sql/2026-04-05_staff_permissions.sql,
--    owner-check swapped to mc_is_owner() to avoid RLS recursion)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.staff_permissions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT staff_permissions_permissions_object
    CHECK (jsonb_typeof(permissions) = 'object')
);

CREATE OR REPLACE FUNCTION public.update_staff_permissions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_staff_permissions_updated_at ON public.staff_permissions;
CREATE TRIGGER trg_staff_permissions_updated_at
  BEFORE UPDATE ON public.staff_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_staff_permissions_updated_at();

ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_permissions_select" ON public.staff_permissions;
CREATE POLICY "staff_permissions_select" ON public.staff_permissions
  FOR SELECT TO authenticated
  USING (public.mc_is_owner() OR user_id = auth.uid());

DROP POLICY IF EXISTS "staff_permissions_insert" ON public.staff_permissions;
CREATE POLICY "staff_permissions_insert" ON public.staff_permissions
  FOR INSERT TO authenticated
  WITH CHECK (public.mc_is_owner());

DROP POLICY IF EXISTS "staff_permissions_update" ON public.staff_permissions;
CREATE POLICY "staff_permissions_update" ON public.staff_permissions
  FOR UPDATE TO authenticated
  USING (public.mc_is_owner())
  WITH CHECK (public.mc_is_owner());

DROP POLICY IF EXISTS "staff_permissions_delete" ON public.staff_permissions;
CREATE POLICY "staff_permissions_delete" ON public.staff_permissions
  FOR DELETE TO authenticated
  USING (public.mc_is_owner());
