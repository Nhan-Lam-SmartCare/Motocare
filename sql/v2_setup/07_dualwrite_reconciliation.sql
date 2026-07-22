-- ===================================================================
-- MOTOCARE V2 — DUAL-WRITE RECONCILIATION JOB
-- File: sql/v2_setup/07_dualwrite_reconciliation.sql
-- Run after: 01_schema.sql (and 06)
-- ===================================================================
-- Per Ke hoach.md 3.1: the JSONB mirrors (sales.items, work_orders.partsused)
-- and the normalized tables (sale_items, work_order_items) are written by the
-- same RPC in the same transaction. This job detects any drift between them —
-- drift means an RPC bug or an out-of-band write, and must be investigated.
--
-- Source of truth = normalized tables. JSONB is only a compatibility mirror.
-- ===================================================================

-- ───────────────────────────────────────────────────────────────────
-- 1. Drift log table
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dualwrite_drift_log (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_table TEXT NOT NULL,           -- 'sales' | 'work_orders'
    record_id TEXT NOT NULL,              -- id of the drifted parent row
    jsonb_count INTEGER NOT NULL,         -- element count in the JSONB mirror
    items_count INTEGER NOT NULL,         -- row count in the normalized table
    jsonb_total NUMERIC,                  -- SUM(price*qty) from JSONB
    items_total NUMERIC,                  -- SUM(price*qty) from normalized rows
    detected_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dualwrite_drift_detected
  ON public.dualwrite_drift_log(detected_at DESC);

-- ───────────────────────────────────────────────────────────────────
-- 2. Reconciliation function
-- ───────────────────────────────────────────────────────────────────
-- Compares element count and monetary total per record. Only logs rows
-- that DRIFTED — a clean run inserts nothing. Returns the number of
-- drifted records found so callers/cron logs surface it directly.
CREATE OR REPLACE FUNCTION public.reconcile_dualwrite()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_drift_count INTEGER := 0;
  v_inserted INTEGER;
BEGIN
  -- ── sales.items vs sale_items ──────────────────────────────────
  INSERT INTO public.dualwrite_drift_log
    (source_table, record_id, jsonb_count, items_count, jsonb_total, items_total)
  SELECT
    'sales',
    s.id,
    COALESCE(jsonb_array_length(s.items), 0),
    COALESCE(n.cnt, 0),
    COALESCE(j.total, 0),
    COALESCE(n.total, 0)
  FROM public.sales s
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*)::int AS cnt,
      SUM(si.price * si.quantity) AS total
    FROM public.sale_items si
    WHERE si.sale_id = s.id
  ) n ON TRUE
  LEFT JOIN LATERAL (
    SELECT SUM(
      COALESCE((e->>'sellingPrice')::numeric, (e->>'price')::numeric, 0)
      * COALESCE((e->>'quantity')::numeric, 0)
    ) AS total
    FROM jsonb_array_elements(COALESCE(s.items, '[]'::jsonb)) e
  ) j ON TRUE
  WHERE COALESCE(jsonb_array_length(s.items), 0) IS DISTINCT FROM COALESCE(n.cnt, 0)
     OR ABS(COALESCE(j.total, 0) - COALESCE(n.total, 0)) > 1; -- 1 VND float tolerance

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  v_drift_count := v_drift_count + v_inserted;

  -- ── work_orders.partsused vs work_order_items ──────────────────
  INSERT INTO public.dualwrite_drift_log
    (source_table, record_id, jsonb_count, items_count, jsonb_total, items_total)
  SELECT
    'work_orders',
    w.id,
    COALESCE(jsonb_array_length(w.partsused), 0),
    COALESCE(n.cnt, 0),
    COALESCE(j.total, 0),
    COALESCE(n.total, 0)
  FROM public.work_orders w
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*)::int AS cnt,
      SUM(wi.price * wi.quantity) AS total
    FROM public.work_order_items wi
    WHERE wi.work_order_id = w.id
  ) n ON TRUE
  LEFT JOIN LATERAL (
    SELECT SUM(
      COALESCE((e->>'sellingPrice')::numeric, (e->>'price')::numeric, 0)
      * COALESCE((e->>'quantity')::numeric, 0)
    ) AS total
    FROM jsonb_array_elements(COALESCE(w.partsused, '[]'::jsonb)) e
  ) j ON TRUE
  WHERE COALESCE(jsonb_array_length(w.partsused), 0) IS DISTINCT FROM COALESCE(n.cnt, 0)
     OR ABS(COALESCE(j.total, 0) - COALESCE(n.total, 0)) > 1;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  v_drift_count := v_drift_count + v_inserted;

  RETURN v_drift_count;
END;
$$;

COMMENT ON FUNCTION public.reconcile_dualwrite IS
  'Đối soát dual-write: so sánh JSONB mirror với bảng liên kết. Trả về số bản ghi lệch. 0 = sạch.';

-- Only server-side callers may run it.
REVOKE ALL ON FUNCTION public.reconcile_dualwrite() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_dualwrite() TO service_role;

-- ───────────────────────────────────────────────────────────────────
-- 3. Nightly schedule via pg_cron (run manually if pg_cron unavailable)
-- ───────────────────────────────────────────────────────────────────
-- Enable pg_cron on the V2 project first:
--   Dashboard → Database → Extensions → enable "pg_cron"
-- Then run:
--
-- SELECT cron.schedule(
--   'dualwrite-reconciliation',
--   '23 2 * * *',                        -- 02:23 hằng đêm (giờ UTC của server)
--   $cron$ SELECT public.reconcile_dualwrite(); $cron$
-- );
--
-- Check results each morning:
--   SELECT * FROM public.dualwrite_drift_log ORDER BY detected_at DESC LIMIT 50;
-- Any row = investigate the RPC that touched that record. Manual run:
--   SELECT public.reconcile_dualwrite();  -- returns drift count, 0 = clean
