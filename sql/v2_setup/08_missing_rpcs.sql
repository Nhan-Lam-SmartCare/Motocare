-- ===================================================================
-- MOTOCARE V2 — RPCs & TABLES THE V1 FRONTEND CALLS, MISSING FROM 01-07
-- File: sql/v2_setup/08_missing_rpcs.sql
-- Run after: 01_schema.sql
-- ===================================================================
-- Found by contract audit (scripts/maintenance/contract_test_rpc.mjs):
-- the UI calls these RPCs but files 01-07 did not define them.
--   • adjust_part_stock            (salesRepository stock restore)
--   • stock_ensure_update          (usePurchaseOrders fallback)
--   • get_public_work_order        (CustomerPortal public tracking)
--   • get_external_part_categories (ExternalPartsLookup)
-- Plus their dependencies: normalize_plate(), external_parts table.
-- Bodies ported from the latest V1 versions:
--   sql/2025-11-11_adjust_part_stock.sql
--   sql/2026-02-11_FIX_RECEIPT_STOCK_UPDATE.sql
--   sql/2026-07-09_A5_public_exposure_hardening.sql (hardened version)
--   sql/2025-12-18_create_external_parts.sql / _get_distinct_categories.sql
-- ===================================================================

-- ───────────────────────────────────────────────────────────────────
-- 1. normalize_plate() — dependency of get_public_work_order
-- ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.normalize_plate(plate text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN lower(regexp_replace(plate, '[^a-zA-Z0-9]', '', 'g'));
END;
$$;

-- ───────────────────────────────────────────────────────────────────
-- 2. adjust_part_stock() — atomic per-branch stock delta with row lock
-- ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.adjust_part_stock(
  p_part_id TEXT, p_branch_id TEXT, p_delta NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current INT;
  v_delta_int INT;
BEGIN
  v_delta_int := p_delta::INT;

  -- Lock row to avoid concurrent modification
  SELECT COALESCE((stock->>p_branch_id)::int, 0) INTO v_current
  FROM public.parts
  WHERE id = p_part_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PART_NOT_FOUND';
  END IF;

  UPDATE public.parts
  SET stock = jsonb_set(stock, ARRAY[p_branch_id],
        to_jsonb(GREATEST(0, v_current + v_delta_int)), true)
  WHERE id = p_part_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.adjust_part_stock TO authenticated;

-- ───────────────────────────────────────────────────────────────────
-- 3. stock_ensure_update() — frontend fallback, only raises stock
-- ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.stock_ensure_update(
  p_part_id TEXT,
  p_branch_id TEXT,
  p_expected_stock INT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_stock INT;
BEGIN
  SELECT COALESCE((stock->>p_branch_id)::int, 0)
  INTO v_current_stock
  FROM public.parts
  WHERE id = p_part_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('updated', false, 'reason', 'part_not_found');
  END IF;

  -- Chỉ cập nhật nếu stock hiện tại < expected (tránh ghi đè khi đã đúng)
  IF v_current_stock < p_expected_stock THEN
    UPDATE public.parts
    SET stock = jsonb_set(
      COALESCE(stock, '{}'::jsonb),
      ARRAY[p_branch_id],
      to_jsonb(p_expected_stock),
      true
    )
    WHERE id = p_part_id;

    RETURN jsonb_build_object(
      'updated', true,
      'old_stock', v_current_stock,
      'new_stock', p_expected_stock
    );
  END IF;

  RETURN jsonb_build_object(
    'updated', false,
    'reason', 'stock_already_correct',
    'current_stock', v_current_stock
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.stock_ensure_update TO authenticated;
COMMENT ON FUNCTION public.stock_ensure_update IS
  'Fallback stock update — SECURITY DEFINER để bypass RLS (port từ V1 2026-02-11)';

-- ───────────────────────────────────────────────────────────────────
-- 4. external_parts table + get_external_part_categories()
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.external_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sku TEXT,
  price NUMERIC DEFAULT 0,
  category TEXT,
  image_url TEXT,
  source_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.external_parts ENABLE ROW LEVEL SECURITY;

-- V1's 2026-07-09 hardening removed anon INSERT; keep read for authenticated.
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.external_parts;
CREATE POLICY "external_parts_read_authenticated" ON public.external_parts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "external_parts_write_authenticated" ON public.external_parts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_external_parts_name ON public.external_parts(name);

CREATE OR REPLACE FUNCTION public.get_external_part_categories()
RETURNS TABLE (category text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT category
  FROM public.external_parts
  WHERE category IS NOT NULL
  ORDER BY category;
$$;

GRANT EXECUTE ON FUNCTION public.get_external_part_categories TO authenticated;

-- ───────────────────────────────────────────────────────────────────
-- 5. get_public_work_order() — public tracking (hardened 2026-07-09 version:
--    strips costPrice from the order and every partsUsed line)
-- ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_public_work_order(p_order_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_work_order record;
  v_customer   record;
  v_vehicle    json;
  v_history    jsonb;
  v_wo_json    jsonb;
  v_parts_clean jsonb;
BEGIN
  SELECT * INTO v_work_order FROM public.work_orders WHERE id = p_order_id;
  IF v_work_order IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_work_order.customerphone IS NOT NULL AND v_work_order.customerphone <> '' THEN
    SELECT * INTO v_customer FROM public.customers
    WHERE phone = v_work_order.customerphone LIMIT 1;
  END IF;

  IF v_customer IS NOT NULL AND v_customer.vehicles IS NOT NULL THEN
    SELECT row_to_json(v) INTO v_vehicle
    FROM jsonb_to_recordset(v_customer.vehicles)
      AS v(id text, model text, "licensePlate" text, "isPrimary" boolean,
           "currentKm" numeric, "firstRecordedKm" numeric,
           "firstRecordedDate" text, "lastMaintenances" jsonb)
    WHERE public.normalize_plate(v."licensePlate") = public.normalize_plate(v_work_order.licenseplate)
    LIMIT 1;
  END IF;

  IF v_vehicle IS NULL THEN
    v_vehicle := json_build_object(
      'id', COALESCE(v_work_order.vehicleid, 'virtual-vehicle'),
      'model', COALESCE(v_work_order.vehiclemodel, 'N/A'),
      'licensePlate', COALESCE(v_work_order.licenseplate, ''),
      'currentKm', v_work_order.currentkm
    );
  END IF;

  -- Strip cost keys from the order json and its partsUsed lines.
  v_wo_json := to_jsonb(v_work_order) - 'costprice' - 'costPrice';
  IF v_wo_json ? 'partsused' AND jsonb_typeof(v_wo_json->'partsused') = 'array' THEN
    SELECT jsonb_agg(elem - 'costPrice' - 'costprice' - 'cost')
      INTO v_parts_clean
      FROM jsonb_array_elements(v_wo_json->'partsused') elem;
    v_wo_json := jsonb_set(v_wo_json, '{partsused}', COALESCE(v_parts_clean, '[]'::jsonb));
  END IF;

  -- History of completed orders for this plate, cost stripped.
  IF v_work_order.licenseplate IS NOT NULL AND v_work_order.licenseplate <> '' THEN
    SELECT jsonb_agg(
             jsonb_build_object(
               'id', h.id,
               'creationDate', h.creationdate,
               'issueDescription', h.issuedescription,
               'technicianName', h.technicianname,
               'laborCost', h.laborcost,
               'partsUsed', (
                 SELECT COALESCE(jsonb_agg(pe - 'costPrice' - 'costprice' - 'cost'), '[]'::jsonb)
                 FROM jsonb_array_elements(
                        CASE WHEN jsonb_typeof(to_jsonb(h.partsused)) = 'array'
                             THEN to_jsonb(h.partsused) ELSE '[]'::jsonb END) pe
               ),
               'additionalServices', h.additionalservices,
               'total', h.total,
               'currentKm', h.currentkm,
               'status', h.status
             ) ORDER BY h.creationdate DESC
           )
      INTO v_history
      FROM public.work_orders h
      WHERE public.normalize_plate(h.licenseplate) = public.normalize_plate(v_work_order.licenseplate)
        AND h.status = 'Trả máy'
        AND h.id <> p_order_id;
  END IF;

  RETURN json_build_object(
    'workOrder', v_wo_json,
    'vehicle',   v_vehicle,
    'history',   COALESCE(v_history, '[]'::jsonb)
  );
END;
$$;

-- Public tracking page is unauthenticated → anon needs EXECUTE.
GRANT EXECUTE ON FUNCTION public.get_public_work_order TO anon, authenticated;
