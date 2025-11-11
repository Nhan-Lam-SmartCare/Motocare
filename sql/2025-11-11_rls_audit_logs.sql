-- =====================================================
-- RLS for audit_logs and grants for masked view usage
-- Date: 2025-11-11
-- Purpose:
--  - Enable and enforce RLS on audit_logs
--  - Allow SELECT for authenticated (view masking controls identity exposure)
--  - Allow INSERT for authenticated to log actions
--  - Restrict UPDATE/DELETE to owner only
--  - Idempotent and safe to re-run
-- =====================================================

DO $$
BEGIN
  IF to_regclass('public.audit_logs') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY';

    -- SELECT policy: allow all authenticated users to read rows (masking handled in view)
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='audit_logs' AND policyname='audit_logs_select'
    ) THEN
      EXECUTE 'CREATE POLICY audit_logs_select ON public.audit_logs FOR SELECT TO authenticated USING (TRUE)';
    END IF;

    -- INSERT policy: allow any authenticated to insert audit rows
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='audit_logs' AND policyname='audit_logs_insert'
    ) THEN
      EXECUTE 'CREATE POLICY audit_logs_insert ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (TRUE)';
    END IF;

    -- UPDATE policy: owner only
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='audit_logs' AND policyname='audit_logs_update'
    ) THEN
      EXECUTE 'CREATE POLICY audit_logs_update ON public.audit_logs FOR UPDATE TO authenticated USING ( public.mc_is_owner() ) WITH CHECK ( public.mc_is_owner() )';
    END IF;

    -- DELETE policy: owner only
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='audit_logs' AND policyname='audit_logs_delete'
    ) THEN
      EXECUTE 'CREATE POLICY audit_logs_delete ON public.audit_logs FOR DELETE TO authenticated USING ( public.mc_is_owner() )';
    END IF;
  END IF;
END $$;

-- Note: The masked view audit_logs_with_user exposes identity fields conditionally for owner.
-- Keep GRANT SELECT ON VIEW to authenticated (already created in 2025-11-11_audit_view_owner_mask.sql).