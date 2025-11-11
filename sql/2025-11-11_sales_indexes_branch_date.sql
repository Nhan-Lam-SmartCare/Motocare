-- =====================================================
-- Indexes to optimize sales queries by branch and date
-- Date: 2025-11-11
-- Idempotent creation via IF NOT EXISTS
-- =====================================================

-- Composite index on (branchId, date DESC) for typical branch/date filters
DO $$
BEGIN
  IF to_regclass('public.sales') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='sales' AND indexname='idx_sales_branch_date'
    ) THEN
      CREATE INDEX idx_sales_branch_date ON public.sales ("branchId", "date" DESC);
    END IF;
  END IF;
END $$;