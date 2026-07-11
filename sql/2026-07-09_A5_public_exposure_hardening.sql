-- =====================================================================
-- SECURITY FIX A5 — Close public/anon data-exposure holes
-- Date: 2026-07-09
--
-- Covers three findings:
--   M1  parts: "Public can view active parts" USING(true) lets ANONYMOUS
--       shop visitors SELECT the whole parts table, including costPrice
--       (giá vốn) — not just customer-facing fields.
--   M3  external_parts: anon has INSERT + SELECT (anyone can pollute/read it).
--   M2  get_public_work_order() dumps row_to_json of the entire work order
--       incl. per-part costPrice (profit) to anyone with an order id.
--
-- Idempotent. TEST ON DEMO FIRST. The parts change also needs the small
-- frontend edit in src/pages/shop/ProductCatalog.tsx (parts -> public_parts).
-- =====================================================================

-- ---------------------------------------------------------------------
-- M1) Public catalog: expose a SAFE VIEW (no costPrice), not the base table.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.public_parts AS
  SELECT
    id, name, sku, barcode, category, description, stock,
    "retailPrice", "wholesalePrice", "imageUrl", "warrantyPeriod"
    -- NOTE: costPrice, reserved, reservedstock, preferred_supplier_id are intentionally EXCLUDED.
  FROM public.parts;

-- Views run with the definer's rights by default, so anon reads only these columns.
GRANT SELECT ON public.public_parts TO anon, authenticated;

-- Remove the over-broad anon policy on the base table and ensure RLS is on.
DROP POLICY IF EXISTS "Public can view active parts" ON public.parts;
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;
-- (Authenticated staff keep their existing parts_select policy from
--  2025-11-10_rls_policies.sql; only anonymous base-table access is removed.)

-- ---------------------------------------------------------------------
-- M3) external_parts: revoke anonymous access entirely.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Enable insert for anon" ON public.external_parts;
DROP POLICY IF EXISTS "Enable select for anon" ON public.external_parts;
ALTER TABLE public.external_parts ENABLE ROW LEVEL SECURITY;
-- Imports must run server-side with the service_role key, not from the browser.

-- ---------------------------------------------------------------------
-- M2) get_public_work_order(): keep the SAME signature & response shape,
--     but strip costPrice (profit) from the work order and from every
--     partsUsed line (main order + history). No frontend change required.
-- ---------------------------------------------------------------------
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

  -- Helper inline: strip cost keys from a partsUsed jsonb array.
  -- (applied to main work order below and to each history row)
  v_wo_json := to_jsonb(v_work_order) - 'costprice' - 'costPrice';
  IF v_wo_json ? 'partsused' AND jsonb_typeof(v_wo_json->'partsused') = 'array' THEN
    SELECT jsonb_agg(elem - 'costPrice' - 'costprice' - 'cost')
      INTO v_parts_clean
      FROM jsonb_array_elements(v_wo_json->'partsused') elem;
    v_wo_json := jsonb_set(v_wo_json, '{partsused}', COALESCE(v_parts_clean, '[]'::jsonb));
  END IF;

  -- History of completed orders for this plate, with cost stripped from partsUsed.
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

-- ---------------------------------------------------------------------
-- VERIFY:
--   -- parts: anon must NOT read costPrice from base table anymore.
--   --   (as anon) select * from public.public_parts limit 1;  -> works, no costPrice column
--   --   (as anon) select "costPrice" from public.parts limit 1; -> blocked / empty
--   -- external_parts: (as anon) insert should now fail.
--   -- tracking: select public.get_public_work_order('<an order id>');
--   --   -> workOrder.partsused[*] must have NO costPrice; profit not derivable.
--
-- FOLLOW-UP (not in this file — product decision):
--   Add a second factor (license-plate or phone last-4) to get_public_work_order
--   to stop order-id enumeration, and collect it on the CustomerPortal page.
-- ---------------------------------------------------------------------
