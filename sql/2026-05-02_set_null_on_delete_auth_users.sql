-- Update FK constraints to allow deleting auth.users while keeping history
-- Uses ON DELETE SET NULL for user-related references

BEGIN;

-- 1) Allow NULLs for user references (safe if already nullable)
ALTER TABLE public.store_settings ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.audit_logs ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.notifications ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.notifications ALTER COLUMN recipient_id DROP NOT NULL;
ALTER TABLE public.purchase_orders ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.promotions ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.staff_permissions ALTER COLUMN updated_by DROP NOT NULL;

-- 2) Drop existing FK constraints (NO ACTION / RESTRICT)
ALTER TABLE public.store_settings DROP CONSTRAINT IF EXISTS store_settings_created_by_fkey;
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_created_by_fkey;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_recipient_id_fkey;
ALTER TABLE public.purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_created_by_fkey;
ALTER TABLE public.promotions DROP CONSTRAINT IF EXISTS promotions_created_by_fkey;
ALTER TABLE public.staff_permissions DROP CONSTRAINT IF EXISTS staff_permissions_updated_by_fkey;

-- 3) Recreate FK constraints with ON DELETE SET NULL
ALTER TABLE public.store_settings
  ADD CONSTRAINT store_settings_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_recipient_id_fkey
  FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.purchase_orders
  ADD CONSTRAINT purchase_orders_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.promotions
  ADD CONSTRAINT promotions_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.staff_permissions
  ADD CONSTRAINT staff_permissions_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

COMMIT;
