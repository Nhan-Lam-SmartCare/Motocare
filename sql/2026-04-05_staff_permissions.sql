-- Staff detailed permission overrides
-- Run this in Supabase SQL editor once per environment.

CREATE TABLE IF NOT EXISTS public.staff_permissions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT staff_permissions_permissions_object
    CHECK (jsonb_typeof(permissions) = 'object')
);

CREATE OR REPLACE FUNCTION public.update_staff_permissions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_staff_permissions_updated_at ON public.staff_permissions;
CREATE TRIGGER trg_staff_permissions_updated_at
BEFORE UPDATE ON public.staff_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_staff_permissions_updated_at();

ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner can view staff permissions" ON public.staff_permissions;
CREATE POLICY "Owner can view staff permissions"
ON public.staff_permissions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'owner'
  )
  OR user_id = auth.uid()
);

DROP POLICY IF EXISTS "Owner can insert staff permissions" ON public.staff_permissions;
CREATE POLICY "Owner can insert staff permissions"
ON public.staff_permissions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'owner'
  )
);

DROP POLICY IF EXISTS "Owner can update staff permissions" ON public.staff_permissions;
CREATE POLICY "Owner can update staff permissions"
ON public.staff_permissions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'owner'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'owner'
  )
);

DROP POLICY IF EXISTS "Owner can delete staff permissions" ON public.staff_permissions;
CREATE POLICY "Owner can delete staff permissions"
ON public.staff_permissions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'owner'
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_permissions TO authenticated;
