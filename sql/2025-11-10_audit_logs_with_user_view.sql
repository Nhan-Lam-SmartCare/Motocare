-- =====================================================
-- View: audit_logs_with_user
-- Purpose: Expose audit logs with user identity fields for owner role
-- Notes:
--  - Prefers public.profiles for email/name if exists; falls back to auth.users email when allowed
--  - Ensure RLS policies allow only owner to select this view
--  - Adjust column names to match your actual profiles schema
-- =====================================================

DO $$
BEGIN
  -- Drop existing view if exists (safe replace)
  IF to_regclass('public.audit_logs_with_user') IS NOT NULL THEN
    DROP VIEW public.audit_logs_with_user;
  END IF;
END $$;

-- Ensure audit_logs exists (idempotent)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id TEXT,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- Create the view, picking a source profile table dynamically
DO $$
BEGIN
  IF to_regclass('public.user_profiles') IS NOT NULL THEN
    EXECUTE $v$
      CREATE VIEW public.audit_logs_with_user AS
      SELECT
        al.id,
        al.user_id,
        al.action,
        al.table_name,
        al.record_id,
        al.old_data,
        al.new_data,
        al.ip_address,
        al.user_agent,
        al.created_at,
        up.email       AS user_email,
        up.full_name   AS user_name,
        up.role        AS user_role
      FROM public.audit_logs al
      LEFT JOIN public.user_profiles up ON up.id = al.user_id
    $v$;
  ELSIF to_regclass('public.profiles') IS NOT NULL THEN
    EXECUTE $v$
      CREATE VIEW public.audit_logs_with_user AS
      SELECT
        al.id,
        al.user_id,
        al.action,
        al.table_name,
        al.record_id,
        al.old_data,
        al.new_data,
        al.ip_address,
        al.user_agent,
        al.created_at,
        NULL::text     AS user_email,
        p.full_name    AS user_name,
        p.role         AS user_role
      FROM public.audit_logs al
      LEFT JOIN public.profiles p ON p.id = al.user_id
    $v$;
  ELSE
    -- Fallback: no profile table; still create a minimal view
    EXECUTE $v$
      CREATE VIEW public.audit_logs_with_user AS
      SELECT
        al.id,
        al.user_id,
        al.action,
        al.table_name,
        al.record_id,
        al.old_data,
        al.new_data,
        al.ip_address,
        al.user_agent,
        al.created_at,
        NULL::text     AS user_email,
        NULL::text     AS user_name,
        NULL::text     AS user_role
      FROM public.audit_logs al
    $v$;
  END IF;
END $$;

-- Optionally, add RLS on the view via security definer wrapper function
-- For simple cases, you can grant select to authenticated and filter in policy
GRANT SELECT ON public.audit_logs_with_user TO authenticated;
