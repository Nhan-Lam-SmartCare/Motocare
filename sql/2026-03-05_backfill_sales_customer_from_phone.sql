-- Backfill customer info for old sales recorded as guest by matching phone number
-- Date: 2026-03-05
-- Safe approach:
--   1) Normalize phone digits on both sales.customer->>'phone' and customers.phone
--   2) Only update rows whose customer.name is guest-like
--   3) Keep existing customer JSON keys, only set id/name/phone

-- ============================================================
-- STEP 1: PREVIEW rows that will be updated
-- ============================================================
WITH customer_phone AS (
  SELECT
    c.id,
    c.name,
    c.phone,
    regexp_replace(COALESCE(c.phone, ''), '\\D', '', 'g') AS phone_digits,
    row_number() OVER (
      PARTITION BY regexp_replace(COALESCE(c.phone, ''), '\\D', '', 'g')
      ORDER BY c.created_at ASC NULLS LAST, c.id ASC
    ) AS rn
  FROM public.customers c
  WHERE c.phone IS NOT NULL
    AND trim(c.phone) <> ''
),
sale_targets AS (
  SELECT
    s.id AS sale_id,
    s.date,
    s.customer,
    regexp_replace(COALESCE(s.customer->>'phone', ''), '\\D', '', 'g') AS phone_digits
  FROM public.sales s
  WHERE COALESCE(trim(lower(s.customer->>'name')), '') IN (
    '', 'khach vang lai', 'khách vãng lai', 'khach le', 'khách lẻ'
  )
)
SELECT
  st.sale_id,
  st.date,
  st.customer->>'name' AS old_name,
  st.customer->>'phone' AS old_phone,
  cp.id AS matched_customer_id,
  cp.name AS matched_customer_name,
  cp.phone AS matched_customer_phone
FROM sale_targets st
JOIN customer_phone cp
  ON cp.phone_digits = st.phone_digits
 AND cp.rn = 1
WHERE st.phone_digits <> ''
ORDER BY st.date DESC;

-- ============================================================
-- STEP 2: APPLY UPDATE
-- ============================================================
WITH customer_phone AS (
  SELECT
    c.id,
    c.name,
    c.phone,
    regexp_replace(COALESCE(c.phone, ''), '\\D', '', 'g') AS phone_digits,
    row_number() OVER (
      PARTITION BY regexp_replace(COALESCE(c.phone, ''), '\\D', '', 'g')
      ORDER BY c.created_at ASC NULLS LAST, c.id ASC
    ) AS rn
  FROM public.customers c
  WHERE c.phone IS NOT NULL
    AND trim(c.phone) <> ''
),
sale_matches AS (
  SELECT
    s.id AS sale_id,
    cp.id AS customer_id,
    cp.name AS customer_name,
    cp.phone AS customer_phone
  FROM public.sales s
  JOIN customer_phone cp
    ON cp.phone_digits = regexp_replace(COALESCE(s.customer->>'phone', ''), '\\D', '', 'g')
   AND cp.rn = 1
  WHERE COALESCE(trim(lower(s.customer->>'name')), '') IN (
    '', 'khach vang lai', 'khách vãng lai', 'khach le', 'khách lẻ'
  )
    AND regexp_replace(COALESCE(s.customer->>'phone', ''), '\\D', '', 'g') <> ''
)
UPDATE public.sales s
SET customer = jsonb_set(
  jsonb_set(
    jsonb_set(COALESCE(s.customer, '{}'::jsonb), '{id}', to_jsonb(sm.customer_id), true),
    '{name}',
    to_jsonb(sm.customer_name),
    true
  ),
  '{phone}',
  to_jsonb(sm.customer_phone),
  true
)
FROM sale_matches sm
WHERE s.id = sm.sale_id;

-- ============================================================
-- STEP 3: QUICK CHECK
-- ============================================================
SELECT
  COUNT(*) FILTER (
    WHERE COALESCE(trim(lower(customer->>'name')), '') IN ('', 'khach vang lai', 'khách vãng lai', 'khach le', 'khách lẻ')
  ) AS remaining_guest_sales,
  COUNT(*) AS total_sales
FROM public.sales;
