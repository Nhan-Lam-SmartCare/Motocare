-- Recreate audit_logs_with_user so that only owner sees user identity fields
DO $$
BEGIN
  IF to_regclass('public.audit_logs_with_user') IS NOT NULL THEN
    DROP VIEW public.audit_logs_with_user;
  END IF;
END $$;

-- Create masked view depending on available profile table
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
        CASE WHEN public.mc_is_owner() THEN up.email ELSE NULL END AS user_email,
        CASE WHEN public.mc_is_owner() THEN up.full_name ELSE NULL END AS user_name,
        CASE WHEN public.mc_is_owner() THEN up.role ELSE NULL END AS user_role
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
        NULL::text AS user_email,
        CASE WHEN public.mc_is_owner() THEN p.full_name ELSE NULL END AS user_name,
        CASE WHEN public.mc_is_owner() THEN p.role ELSE NULL END AS user_role
      FROM public.audit_logs al
      LEFT JOIN public.profiles p ON p.id = al.user_id
    $v$;
  ELSE
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
        NULL::text AS user_email,
        NULL::text AS user_name,
        NULL::text AS user_role
      FROM public.audit_logs al
    $v$;
  END IF;
END $$;

-- Keep grants minimal; masking ensures non-owner won't see identity
GRANT SELECT ON public.audit_logs_with_user TO authenticated;
