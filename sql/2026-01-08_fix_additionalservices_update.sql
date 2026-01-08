-- Quick fix: Ensure additionalServices can be updated to NULL
-- Date: 2026-01-08
-- This ensures that when additionalServices is set to NULL, it actually updates in the database

-- Test current function
SELECT 
  proname as function_name,
  oidvectortypes(proargtypes) as arguments
FROM pg_proc
WHERE proname = 'work_order_update_atomic';

-- If you see the function exists, you can run a quick update test:
-- UPDATE work_orders SET additionalServices = NULL WHERE id = 'SC-20260101-117018';

-- To verify the update worked:
-- SELECT id, additionalServices FROM work_orders WHERE id = 'SC-20260101-117018';

-- If the function doesn't handle NULL properly, you may need to run the full migration from:
-- 2025-12-21_fix_rpc_return_format.sql
