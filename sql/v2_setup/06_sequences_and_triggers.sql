-- ===================================================================
-- MOTOCARE V2 — SEQUENCES & AUTO-GENERATION TRIGGERS
-- File: sql/v2_setup/06_sequences_and_triggers.sql
-- Run after: 01_schema.sql
-- ===================================================================
-- Ported from: sql/2025-11-17_add_sale_code_to_sales.sql
-- Changes for V2:
--   • No ALTER TABLE / backfill blocks — this is a fresh schema.
--   • sale_code UNIQUE constraint already in 01_schema.sql (TEXT column).
--     We add it here defensively with IF NOT EXISTS.
--   • Trigger is idempotent (DROP IF EXISTS before CREATE).
-- ===================================================================

-- ───────────────────────────────────────────────────────────────────
-- 1. Ensure sale_prefix column exists on store_settings
-- ───────────────────────────────────────────────────────────────────
-- In V2 this column is part of the schema from day 1, but we guard
-- with IF NOT EXISTS so this file is safe to re-run.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'store_settings' AND column_name = 'sale_prefix'
  ) THEN
    ALTER TABLE public.store_settings ADD COLUMN sale_prefix TEXT DEFAULT 'BH';
    COMMENT ON COLUMN public.store_settings.sale_prefix
      IS 'Mã tiền tố phiếu bán hàng (VD: BH → BH-20260718-001)';
  END IF;
END $$;

-- ───────────────────────────────────────────────────────────────────
-- 2. Ensure UNIQUE constraint on sales.sale_code
-- ───────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.sales'::regclass
      AND contype = 'u'
      AND conname = 'sales_sale_code_key'
  ) THEN
    ALTER TABLE public.sales ADD CONSTRAINT sales_sale_code_key UNIQUE (sale_code);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sales_sale_code ON public.sales(sale_code);

-- ───────────────────────────────────────────────────────────────────
-- 3. generate_sale_code() — helper function
-- ───────────────────────────────────────────────────────────────────
-- Returns the NEXT available code for a given timestamp.
-- Format: {PREFIX}-{YYYYMMDD}-{NNN}   e.g. BH-20260718-001
-- Reads prefix from store_settings; falls back to 'BH'.
-- NOTE: this function is NOT the source of truth for uniqueness —
-- the UNIQUE constraint is. The trigger retries on collision.
CREATE OR REPLACE FUNCTION public.generate_sale_code(p_date TIMESTAMPTZ DEFAULT NOW())
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_prefix   TEXT;
  v_date_str TEXT;
  v_counter  INTEGER;
BEGIN
  SELECT COALESCE(sale_prefix, 'BH') INTO v_prefix
  FROM public.store_settings
  LIMIT 1;

  v_date_str := TO_CHAR(p_date, 'YYYYMMDD');

  SELECT COALESCE(
    MAX(CAST(SUBSTRING(sale_code FROM '\d+$') AS INTEGER)),
    0
  ) INTO v_counter
  FROM public.sales
  WHERE sale_code LIKE v_prefix || '-' || v_date_str || '-%';

  RETURN v_prefix || '-' || v_date_str || '-' || LPAD((v_counter + 1)::TEXT, 3, '0');
END;
$$;

COMMENT ON FUNCTION public.generate_sale_code IS
  'Sinh mã phiếu bán hàng: {PREFIX}-{YYYYMMDD}-{NNN}. Dùng bởi trigger trigger_set_sale_code.';

-- ───────────────────────────────────────────────────────────────────
-- 4. set_sale_code_before_insert() — trigger function
-- ───────────────────────────────────────────────────────────────────
-- Runs BEFORE INSERT on sales. If sale_code is already set (e.g.
-- during migration), passes through untouched. Otherwise generates
-- a unique code, retrying up to 50 times on rare concurrent races.
CREATE OR REPLACE FUNCTION public.set_sale_code_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_prefix      TEXT;
  v_date_str    TEXT;
  v_counter     INTEGER;
  v_max_attempts INTEGER := 50;
  v_attempt     INTEGER := 0;
BEGIN
  -- Pass-through: migration script supplies its own sale_code from V1.
  IF NEW.sale_code IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(sale_prefix, 'BH') INTO v_prefix
  FROM public.store_settings
  LIMIT 1;

  v_date_str := TO_CHAR(NEW.date, 'YYYYMMDD');

  LOOP
    SELECT COALESCE(
      MAX(CAST(SUBSTRING(sale_code FROM '\d+$') AS INTEGER)), 0
    ) + 1 + v_attempt INTO v_counter
    FROM public.sales
    WHERE sale_code LIKE v_prefix || '-' || v_date_str || '-%';

    NEW.sale_code :=
      v_prefix || '-' || v_date_str || '-' || LPAD(v_counter::TEXT, 3, '0');

    -- Collision check (UNIQUE constraint will catch the rest).
    IF NOT EXISTS (
      SELECT 1 FROM public.sales WHERE sale_code = NEW.sale_code
    ) THEN
      RETURN NEW;
    END IF;

    v_attempt := v_attempt + 1;
    IF v_attempt >= v_max_attempts THEN
      RAISE EXCEPTION
        'Không thể sinh mã phiếu bán hàng duy nhất sau % lần thử', v_max_attempts;
    END IF;
  END LOOP;
END;
$$;

-- ───────────────────────────────────────────────────────────────────
-- 5. Attach trigger to sales table
-- ───────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trigger_set_sale_code ON public.sales;
CREATE TRIGGER trigger_set_sale_code
  BEFORE INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.set_sale_code_before_insert();

COMMENT ON TRIGGER trigger_set_sale_code ON public.sales IS
  'Tự động sinh mã phiếu bán hàng (sale_code) trước khi INSERT nếu chưa có.';
