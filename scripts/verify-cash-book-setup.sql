-- =====================================================
-- Script: Verify Cash Book Setup
-- Purpose: Check if cash_transactions_ledger view exists
-- Usage: Run this in Supabase SQL Editor to verify setup
-- =====================================================

-- Check if view exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.views 
      WHERE table_schema = 'public' 
      AND table_name = 'cash_transactions_ledger'
    ) 
    THEN '✅ View exists - Cash Book is properly configured'
    ELSE '⚠️ View MISSING - Need to deploy sql/2026-01-09_cash_transactions_ledger_view.sql'
  END AS status;

-- Check view permissions (if view exists)
SELECT 
  grantee, 
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' 
  AND table_name = 'cash_transactions_ledger'
ORDER BY grantee, privilege_type;

-- Check if RLS is enabled on base table
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'cash_transactions';

-- Sample data check (should show transactions with normalized categories)
SELECT 
  id,
  category,
  type,
  amount,
  date,
  branchid,
  paymentsourceid
FROM cash_transactions_ledger
ORDER BY date DESC
LIMIT 5;
