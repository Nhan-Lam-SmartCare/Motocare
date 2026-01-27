-- Add theme preset for store-level UI themes
-- Date: 2026-01-26

ALTER TABLE public.store_settings
ADD COLUMN IF NOT EXISTS theme_preset TEXT DEFAULT 'blue';

COMMENT ON COLUMN public.store_settings.theme_preset IS 'UI theme preset (logo|blue|emerald|amber|custom)';
