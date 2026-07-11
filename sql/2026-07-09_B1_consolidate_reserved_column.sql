-- =====================================================================
-- DATA-INTEGRITY FIX B1 — Consolidate the dual reservation columns
-- Date: 2026-07-09
--
-- PROBLEM:
--   parts has TWO physical reservation columns: "reserved" and "reservedstock".
--   Different RPC versions historically wrote/read one or the other, which is
--   the root cause of the recurring "negative stock / phantom reserved" bugs.
--
-- LIVE STATE (verified 2026-07-09 via service-role read):
--   * both columns exist on public.parts
--   * "reservedstock" holds the real data (15 branch-entries non-zero)
--   * "reserved" is entirely empty (0 non-zero entries)
--   * frontend + types.ts use ONLY reservedstock (authoritative)
--
-- ACTION: drop the dead "reserved" column so nothing can diverge again.
--
-- SAFETY: this script is SELF-GUARDING. It ABORTS (dropping nothing) if:
--   (a) any part still has a non-zero value in "reserved" (would lose data), or
--   (b) any function body still references the bare "reserved" identifier
--       (dropping the column would break that function).
--   If it aborts, fix the reported items (point them at reservedstock) and re-run.
--
-- Idempotent: if the column is already gone, it exits cleanly.
-- >>> TEST ON DEMO FIRST <<<
-- =====================================================================

DO $$
DECLARE
  v_has_reserved   boolean;
  v_nonzero        bigint;
  v_bad_funcs      text;
BEGIN
  -- Already consolidated?
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='parts' AND column_name='reserved'
  ) INTO v_has_reserved;

  IF NOT v_has_reserved THEN
    RAISE NOTICE 'B1: column public.parts.reserved already dropped — nothing to do.';
    RETURN;
  END IF;

  -- GUARD (a): no residual data in "reserved".
  SELECT count(*) INTO v_nonzero
  FROM public.parts p,
       LATERAL jsonb_each_text(COALESCE(p.reserved, '{}'::jsonb)) AS kv(branch, qty)
  WHERE COALESCE(NULLIF(kv.qty,'')::numeric, 0) <> 0;

  IF v_nonzero > 0 THEN
    RAISE EXCEPTION 'B1 ABORT: % branch-entries still have non-zero parts.reserved. Merge them into reservedstock first (see note below), then re-run.', v_nonzero;
  END IF;

  -- GUARD (b): no function references the bare "reserved" identifier IN CODE.
  --   \yreserved\y matches the standalone word only (NOT reservedstock / reserved_stock).
  --   We strip -- line comments and '...' string literals first so that a mere
  --   mention of "reserved" in a comment/message is NOT a false positive.
  --   Restrict to normal functions/procedures in plpgsql/sql — pg_get_functiondef()
  --   errors on aggregate/window functions (e.g. array_agg), so those are excluded.
  SELECT string_agg(p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')', ', ')
  INTO v_bad_funcs
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  JOIN pg_language  l ON l.oid = p.prolang
  WHERE n.nspname = 'public'
    AND p.prokind IN ('f','p')
    AND l.lanname IN ('plpgsql','sql')
    AND regexp_replace(
          regexp_replace(pg_get_functiondef(p.oid), '--[^\n]*', '', 'g'),
          '''[^'']*''', '', 'g'
        ) ~ '\yreserved\y';

  IF v_bad_funcs IS NOT NULL THEN
    RAISE EXCEPTION 'B1 ABORT: these function(s) still reference the "reserved" column — repoint them to "reservedstock" first: %', v_bad_funcs;
  END IF;

  -- All clear: drop the dead column.
  EXECUTE 'ALTER TABLE public.parts DROP COLUMN reserved';
  RAISE NOTICE 'B1 OK: dropped dead column public.parts.reserved. reservedstock is now the single source of truth.';
END $$;

-- ---------------------------------------------------------------------
-- If GUARD (a) aborts (there IS residual data in "reserved"), run this
-- MERGE first (max of the two per branch), then re-run the script above:
--
--   UPDATE public.parts p
--   SET reservedstock = (
--     SELECT jsonb_object_agg(branch,
--              GREATEST(
--                COALESCE((p.reservedstock->>branch)::numeric, 0),
--                COALESCE((p.reserved->>branch)::numeric, 0)))
--     FROM (SELECT DISTINCT jsonb_object_keys(COALESCE(p.reservedstock,'{}') || COALESCE(p.reserved,'{}')) AS branch) b
--   )
--   WHERE p.reserved IS NOT NULL AND p.reserved <> '{}'::jsonb;
--
-- To just SEE which functions reference "reserved" (GUARD b):
--   SELECT p.proname, pg_get_function_identity_arguments(p.oid)
--   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--   JOIN pg_language l ON l.oid=p.prolang
--   WHERE n.nspname='public' AND p.prokind IN ('f','p')
--     AND l.lanname IN ('plpgsql','sql')
--     AND pg_get_functiondef(p.oid) ~ '\yreserved\y';
-- ---------------------------------------------------------------------
