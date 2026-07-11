-- =====================================================================
-- SECURITY FIX A2 — Privilege escalation via profiles UPDATE policy
-- Date: 2026-07-09
--
-- PROBLEM:
--   sql/2025-12-02_fix_profiles_rls_recursion.sql created:
--     CREATE POLICY "Users can update own profile" ON profiles
--       FOR UPDATE USING (auth.uid() = id);
--   There is NO WITH CHECK, so any authenticated staff user can run
--     supabase.from('profiles').update({ role: 'owner' }).eq('id', myId)
--   and instantly become owner (auth_user_role()/mc_current_role() read
--   `role` straight from profiles), defeating ALL app-side permission gating.
--
-- FIX:
--   Re-create the self-update policy with a WITH CHECK that pins the
--   security-sensitive columns (role, branch_id) to their current values,
--   so a user may edit their own name/avatar but NOT their role or branch.
--   Only owners (via the "Owner can update all profiles" policy or the
--   server-side /api/staff-create path) may change role/branch.
--
-- Idempotent: safe to run multiple times.
-- Scope: public.profiles (Supabase default table used by this app).
-- =====================================================================

-- 1) Helper: current branch of the calling user (SECURITY DEFINER => no RLS recursion).
--    Mirrors auth_user_role() from the recursion-fix migration.
CREATE OR REPLACE FUNCTION public.auth_user_branch()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT branch_id FROM public.profiles WHERE id = auth.uid()
$$;

-- 2) Replace the vulnerable self-update policy with a locked-down version.
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- role and branch_id must remain UNCHANGED. The SECURITY DEFINER helpers
    -- read the pre-update (committed) value, so this rejects any self-change.
    AND role      IS NOT DISTINCT FROM public.auth_user_role()
    AND branch_id IS NOT DISTINCT FROM public.auth_user_branch()
  );

-- 3) Make the owner-update policy's WITH CHECK explicit (owners may change roles).
DROP POLICY IF EXISTS "Owner can update all profiles" ON public.profiles;

CREATE POLICY "Owner can update all profiles" ON public.profiles
  FOR UPDATE
  USING (public.auth_user_role() = 'owner')
  WITH CHECK (public.auth_user_role() = 'owner');

-- 4) Ensure RLS is actually enabled on profiles (it must be for policies to apply).
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- VERIFY (run as an owner in SQL editor):
--   SELECT policyname, cmd, qual, with_check
--   FROM pg_policies WHERE tablename = 'profiles' ORDER BY policyname;
--   -- "Users can update own profile" must now show a non-null with_check.
--
-- MANUAL EXPLOIT TEST (run while authenticated as a STAFF user, e.g. from the app console):
--   await supabase.from('profiles').update({ role: 'owner' }).eq('id', (await supabase.auth.getUser()).data.user.id)
--   -- EXPECTED after fix: 0 rows updated / error. Before fix: role became 'owner'.
-- ---------------------------------------------------------------------
