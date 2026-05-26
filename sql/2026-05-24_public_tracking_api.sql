-- ========================================================
-- MIGRATION: PUBLIC CUSTOMER PORTAL TRACKING API
-- ========================================================

-- 1. Helper function to normalize license plates (removes special chars, spaces, and lowercases)
CREATE OR REPLACE FUNCTION public.normalize_plate(plate text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN lower(regexp_replace(plate, '[^a-zA-Z0-9]', '', 'g'));
END;
$$;

-- 2. Security Definer RPC function to fetch a single work order and aggregated customer vehicle info securely
CREATE OR REPLACE FUNCTION public.get_public_work_order(p_order_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with creator privileges to bypass RLS securely
AS $$
DECLARE
  v_work_order record;
  v_customer record;
  v_vehicle json;
  v_history json;
  v_result json;
BEGIN
  -- 1. Fetch work order details by ID
  SELECT * INTO v_work_order
  FROM public.work_orders
  WHERE id = p_order_id;
  
  IF v_work_order IS NULL THEN
    RETURN NULL;
  END IF;

  -- 2. Fetch customer record using either customerPhone or customerId (if columns exist)
  -- We attempt phone lookup first as it is the primary unique identifier in Motocare
  IF v_work_order.customerphone IS NOT NULL AND v_work_order.customerphone <> '' THEN
    SELECT * INTO v_customer
    FROM public.customers
    WHERE phone = v_work_order.customerphone
    LIMIT 1;
  END IF;

  -- 3. Extract the specific vehicle record matching the license plate of this work order from customer's vehicles list
  IF v_customer IS NOT NULL AND v_customer.vehicles IS NOT NULL THEN
    SELECT row_to_json(v) INTO v_vehicle
    FROM jsonb_to_recordset(v_customer.vehicles) AS v(id text, model text, "licensePlate" text, "isPrimary" boolean, "currentKm" numeric, "firstRecordedKm" numeric, "firstRecordedDate" text, "lastMaintenances" jsonb)
    WHERE public.normalize_plate(v."licensePlate") = public.normalize_plate(v_work_order.licenseplate)
    LIMIT 1;
  END IF;

  -- If no matching vehicle record found, construct a virtual vehicle object from the work order details
  IF v_vehicle IS NULL THEN
    v_vehicle := json_build_object(
      'id', COALESCE(v_work_order.vehicleid, 'virtual-vehicle'),
      'model', COALESCE(v_work_order.vehiclemodel, 'N/A'),
      'licensePlate', COALESCE(v_work_order.licenseplate, ''),
      'currentKm', v_work_order.currentkm
    );
  END IF;

  -- 4. Gather history of previously completed ("Trả máy") work orders for this license plate
  IF v_work_order.licenseplate IS NOT NULL AND v_work_order.licenseplate <> '' THEN
    SELECT json_agg(
      json_build_object(
        'id', h.id,
        'creationDate', h.creationdate,
        'issueDescription', h.issuedescription,
        'technicianName', h.technicianname,
        'laborCost', h.laborcost,
        'partsUsed', h.partsused,
        'additionalServices', h.additionalservices,
        'total', h.total,
        'currentKm', h.currentkm,
        'status', h.status
      ) ORDER BY h.creationdate DESC
    ) INTO v_history
    FROM public.work_orders h
    WHERE public.normalize_plate(h.licenseplate) = public.normalize_plate(v_work_order.licenseplate)
      AND h.status = 'Trả máy'
      AND h.id <> p_order_id;
  END IF;

  -- 5. Combine and return the aggregated payload
  v_result := json_build_object(
    'workOrder', row_to_json(v_work_order),
    'vehicle', v_vehicle,
    'history', COALESCE(v_history, '[]'::json)
  );

  RETURN v_result;
END;
$$;
