-- Fix: sale_create_atomic fails with "column \"note\" of relation \"sales\" does not exist"
-- Date: 2026-03-05
-- Safe to run multiple times.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sales'
      AND column_name = 'note'
  ) THEN
    ALTER TABLE public.sales ADD COLUMN note TEXT;
  END IF;
END $$;

-- Optional compatibility backfill: if legacy column "notes" exists, copy it to "note" when note is empty
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sales'
      AND column_name = 'notes'
  ) THEN
    EXECUTE '
      UPDATE public.sales
      SET note = COALESCE(note, notes)
      WHERE note IS NULL
    ';
  END IF;
END $$;
