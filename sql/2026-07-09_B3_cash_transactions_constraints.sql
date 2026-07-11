-- =====================================================================
-- DATA-INTEGRITY FIX B3 (part 1/2) — Lock cash_transactions normalization
-- Date: 2026-07-09
--
-- CONTEXT (verified 2026-07-09 over all 3,118 rows via service-role read):
--   paymentsource ∈ {cash, bank}, type ∈ {income, expense}, ZERO nulls.
--   The historical "paymentsource NULL / 'Tiền mặt' vs 'cash'" drift is already
--   cleaned in the data. This migration LOCKS that so it cannot regress, which
--   is what makes the running balance trustworthy going forward.
--
-- NOTE: This does NOT fix the existing balance discrepancy (see part 2/2,
--   the reconciliation report) — that needs the owner's real cash figure.
--
-- Idempotent-ish: uses IF NOT EXISTS guards. TEST ON DEMO FIRST.
-- =====================================================================

-- 0) Safety: fail early (before adding constraints) if any row would violate,
--    so this never half-applies on dirty data.
DO $$
DECLARE bad bigint;
BEGIN
  SELECT count(*) INTO bad FROM public.cash_transactions
  WHERE paymentsource IS NULL OR paymentsource NOT IN ('cash','bank')
     OR type IS NULL OR type NOT IN ('income','expense')
     OR amount IS NULL;
  IF bad > 0 THEN
    RAISE EXCEPTION 'B3 ABORT: % row(s) violate the target constraints. Normalize them first (see query in comments).', bad;
  END IF;
END $$;

-- 1) NOT NULL
ALTER TABLE public.cash_transactions ALTER COLUMN paymentsource SET NOT NULL;
ALTER TABLE public.cash_transactions ALTER COLUMN type          SET NOT NULL;
ALTER TABLE public.cash_transactions ALTER COLUMN amount        SET NOT NULL;

-- 2) Domain CHECKs (add only if missing)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='cash_tx_type_chk') THEN
    ALTER TABLE public.cash_transactions
      ADD CONSTRAINT cash_tx_type_chk CHECK (type IN ('income','expense'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='cash_tx_source_chk') THEN
    ALTER TABLE public.cash_transactions
      ADD CONSTRAINT cash_tx_source_chk CHECK (paymentsource IN ('cash','bank'));
  END IF;
END $$;

-- 3) OPTIONAL (stronger): make paymentsource a real foreign key so new sources
--    are controlled centrally and typos are impossible. Uncomment if desired —
--    requires every paymentsource value to already exist in payment_sources(id).
--
--   ALTER TABLE public.cash_transactions
--     ADD CONSTRAINT cash_tx_source_fk
--     FOREIGN KEY (paymentsource) REFERENCES public.payment_sources(id);
--   -- Then you can drop cash_tx_source_chk above.

-- ---------------------------------------------------------------------
-- If step 0 aborts, normalize first, e.g.:
--   UPDATE public.cash_transactions SET paymentsource='cash'
--     WHERE lower(coalesce(paymentsource,'')) IN ('tiền mặt','tien mat','cash','');
--   UPDATE public.cash_transactions SET paymentsource='bank'
--     WHERE lower(coalesce(paymentsource,'')) IN ('chuyển khoản','bank','transfer');
-- VERIFY:
--   SELECT paymentsource, type, count(*) FROM public.cash_transactions
--   GROUP BY 1,2 ORDER BY 1,2;
-- ---------------------------------------------------------------------
