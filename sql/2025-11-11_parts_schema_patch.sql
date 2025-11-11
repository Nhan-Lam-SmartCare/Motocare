-- Migration: add missing columns to parts (costPrice, vatRate)
-- Idempotent: only adds if not exists
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS costPrice JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS vatRate NUMERIC DEFAULT 0;

-- Optional: index if querying by category frequently
CREATE INDEX IF NOT EXISTS parts_category_idx ON public.parts(category);
