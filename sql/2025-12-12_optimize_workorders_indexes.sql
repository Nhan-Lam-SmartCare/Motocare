-- ================================================================
-- PERFORMANCE OPTIMIZATION: Work Orders Query Indexes
-- Created: 2025-12-12
-- Purpose: Add indexes to speed up work_orders queries
-- ================================================================

-- Index for date-based queries (most common filter)
CREATE INDEX IF NOT EXISTS idx_work_orders_creationdate 
ON work_orders(creationdate DESC);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_work_orders_status 
ON work_orders(status);

-- Index for branch filtering
CREATE INDEX IF NOT EXISTS idx_work_orders_branchid 
ON work_orders(branchid);

-- Composite index for common query pattern: date + branch + status
CREATE INDEX IF NOT EXISTS idx_work_orders_date_branch_status 
ON work_orders(creationdate DESC, branchid, status);

-- Index for payment status queries
CREATE INDEX IF NOT EXISTS idx_work_orders_paymentstatus 
ON work_orders(paymentstatus);

-- Index for customer phone search
CREATE INDEX IF NOT EXISTS idx_work_orders_customerphone 
ON work_orders(customerphone);

-- Index for license plate search
CREATE INDEX IF NOT EXISTS idx_work_orders_licenseplate 
ON work_orders(licenseplate);

COMMENT ON INDEX idx_work_orders_creationdate IS 'Optimize date range queries';
COMMENT ON INDEX idx_work_orders_status IS 'Optimize status filtering';
COMMENT ON INDEX idx_work_orders_branchid IS 'Optimize branch filtering';
COMMENT ON INDEX idx_work_orders_date_branch_status IS 'Optimize most common query pattern';
COMMENT ON INDEX idx_work_orders_paymentstatus IS 'Optimize payment status queries';
COMMENT ON INDEX idx_work_orders_customerphone IS 'Optimize customer phone search';
COMMENT ON INDEX idx_work_orders_licenseplate IS 'Optimize license plate search';

-- Verify indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'work_orders'
ORDER BY indexname;
