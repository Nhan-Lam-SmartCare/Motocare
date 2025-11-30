-- ============================================================
-- MIGRATION: Fix orphaned cash transactions from cancelled work orders
-- Run this in Supabase SQL Editor
-- ============================================================

-- Step 1: Update the refund function (copy from 2025-11-30_work_order_refund_v3.sql)
-- [Already created above]

-- Step 2: Find and delete orphaned transactions from cancelled orders
-- Preview first (don't delete yet):
SELECT 
  ct.id,
  ct.category,
  ct.amount,
  ct.date,
  ct.description,
  ct.reference as work_order_id,
  wo.status as order_status,
  wo.refunded
FROM cash_transactions ct
LEFT JOIN work_orders wo ON ct.reference = wo.id
WHERE ct.category IN ('service_deposit', 'service_income', 'outsourcing', 'parts_purchase')
  AND ct.reference IS NOT NULL
  AND ct.reference LIKE '%SC-%' OR ct.reference LIKE '%WO-%'
  AND (wo.refunded = TRUE OR wo.status = 'Đã hủy');

-- Step 3: Delete the orphaned transactions (UNCOMMENT TO RUN):
/*
DELETE FROM cash_transactions
WHERE id IN (
  SELECT ct.id
  FROM cash_transactions ct
  LEFT JOIN work_orders wo ON ct.reference = wo.id
  WHERE ct.category IN ('service_deposit', 'service_income', 'outsourcing', 'parts_purchase')
    AND ct.reference IS NOT NULL
    AND (ct.reference LIKE '%SC-%' OR ct.reference LIKE '%WO-%')
    AND (wo.refunded = TRUE OR wo.status = 'Đã hủy')
);
*/

-- Step 4: Verify - check remaining transactions
SELECT 
  category,
  type,
  amount,
  description,
  date
FROM cash_transactions
WHERE category IN ('service_deposit', 'service_income', 'outsourcing')
ORDER BY date DESC;
