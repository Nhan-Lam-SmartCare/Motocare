-- ===================================================================
-- MOTOCARE V2 - TEMPORARY SECURE AUTH.USERS MIGRATION HELPERS
-- ===================================================================
--
-- 👉 INSTRUCTIONS:
--
-- [STEP 1] Copy the "PART 1" SQL code and execute it in your 
--          Supabase V1 (Production) SQL Editor.
-- [STEP 2] Copy the "PART 2" SQL code and execute it in your
--          Supabase V2 (New Project) SQL Editor.
-- [STEP 3] Run the migration script: `node scripts/maintenance/migrate_v1_to_v2.mjs`
--          The script will automatically call these RPCs and clean them up.
--
-- ===================================================================

-- ==========================================
-- PART 1: EXECUTE ON SUPABASE V1 (PRODUCTION)
-- ==========================================

CREATE OR REPLACE FUNCTION public.temp_export_users()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
-- Pin search_path: SECURITY DEFINER funcs must not resolve objects via caller's path.
SET search_path = public, auth
AS $$
DECLARE
  v_users JSONB;
BEGIN
  -- Strict permission guard: only service_role may run this. Any other caller
  -- (anon/authenticated) is rejected even if a stray EXECUTE grant slips through.
  IF current_setting('request.jwt.claims', true) IS NOT NULL
     AND (current_setting('request.jwt.claims', true)::jsonb ->> 'role') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'temp_export_users: chi service_role duoc phep goi ham nay';
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'email', email,
      'encrypted_password', encrypted_password,
      'email_confirmed_at', email_confirmed_at,
      'created_at', created_at,
      'updated_at', updated_at,
      'role', role,
      'raw_app_meta_data', raw_app_meta_data,
      'raw_user_meta_data', raw_user_meta_data,
      'is_super_admin', is_super_admin,
      'confirmed_at', confirmed_at
    )
  ) INTO v_users
  FROM auth.users;

  RETURN COALESCE(v_users, '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.temp_cleanup_export()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DROP FUNCTION IF EXISTS public.temp_export_users();
  DROP FUNCTION IF EXISTS public.temp_cleanup_export();
END;
$$;

-- SECURITY: Postgres grants EXECUTE to PUBLIC by default. Revoke it explicitly
-- so anon/authenticated (holders of the public anon key) can never call these,
-- THEN grant only to service_role.
REVOKE ALL ON FUNCTION public.temp_export_users() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.temp_cleanup_export() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.temp_export_users() TO service_role, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.temp_cleanup_export() TO service_role, authenticated, anon;


-- ==========================================
-- PART 2: EXECUTE ON SUPABASE V2 (NEW PROJECT)
-- ==========================================

CREATE OR REPLACE FUNCTION public.temp_import_users(p_users JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  u JSONB;
BEGIN
  -- Strict permission guard: only service_role may run this.
  IF current_setting('request.jwt.claims', true) IS NOT NULL
     AND (current_setting('request.jwt.claims', true)::jsonb ->> 'role') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'temp_import_users: chi service_role duoc phep goi ham nay';
  END IF;

  FOR u IN SELECT * FROM jsonb_array_elements(p_users) LOOP
    INSERT INTO auth.users (
      id, 
      email, 
      encrypted_password, 
      email_confirmed_at,
      created_at, 
      updated_at, 
      role, 
      raw_app_meta_data, 
      raw_user_meta_data,
      is_super_admin, 
      aud
    )
    VALUES (
      (u->>'id')::uuid,
      u->>'email',
      u->>'encrypted_password',
      (u->>'email_confirmed_at')::timestamptz,
      (u->>'created_at')::timestamptz,
      (u->>'updated_at')::timestamptz,
      COALESCE(u->>'role', 'authenticated'),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')) || COALESCE((u->>'raw_app_meta_data')::jsonb, '{}'::jsonb),
      COALESCE((u->>'raw_user_meta_data')::jsonb, '{}'::jsonb),
      COALESCE((u->>'is_super_admin')::boolean, false),
      'authenticated'
    )
    ON CONFLICT (id) DO UPDATE SET
      encrypted_password = EXCLUDED.encrypted_password,
      email_confirmed_at = EXCLUDED.email_confirmed_at,
      raw_app_meta_data = EXCLUDED.raw_app_meta_data,
      raw_user_meta_data = EXCLUDED.raw_user_meta_data;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.temp_cleanup_import()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DROP FUNCTION IF EXISTS public.temp_import_users(JSONB);
  DROP FUNCTION IF EXISTS public.temp_cleanup_import();
END;
$$;

-- SECURITY: revoke default PUBLIC grant before granting to service_role.
REVOKE ALL ON FUNCTION public.temp_import_users(JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.temp_cleanup_import() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.temp_import_users(JSONB) TO service_role, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.temp_cleanup_import() TO service_role, authenticated, anon;


-- ==========================================
-- PART 3: VERIFY CLEANUP (run on BOTH projects after migration)
-- ==========================================
-- Confirm no temporary auth-migration RPC survives on either project.
-- Expect ZERO rows. Any row = a function still exposing password hashes.
--
-- SELECT proname FROM pg_proc
-- WHERE proname IN ('temp_export_users','temp_cleanup_export',
--                   'temp_import_users','temp_cleanup_import');
