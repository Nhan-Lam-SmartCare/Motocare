-- Fix staff work order permission issue
-- Date: 2026-01-04
-- Issue: Staff users getting "UNAUTHORIZED: User has no branch assigned" error
-- Root cause: Profile may not exist or branch_id is NULL

-- Step 1: Check current user profiles
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at,
  p.role,
  p.branch_id,
  p.full_name
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email LIKE '%@gmail.com'
ORDER BY u.created_at DESC
LIMIT 20;

-- Step 2: Ensure all authenticated users have profiles with branch_id
-- This will create missing profiles or update existing ones
INSERT INTO public.profiles (id, email, role, branch_id, full_name, created_at, updated_at)
SELECT 
  u.id,
  u.email,
  COALESCE(p.role, 'staff') as role,
  COALESCE(p.branch_id, 'CN1') as branch_id,
  COALESCE(p.full_name, SPLIT_PART(u.email, '@', 1)) as full_name,
  NOW(),
  NOW()
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email_confirmed_at IS NOT NULL
ON CONFLICT (id) 
DO UPDATE SET
  branch_id = COALESCE(EXCLUDED.branch_id, profiles.branch_id, 'CN1'),
  role = COALESCE(profiles.role, 'staff'),
  updated_at = NOW();

-- Step 3: Verify all users now have branch_id
SELECT 
  COUNT(*) as total_users,
  COUNT(p.branch_id) as users_with_branch,
  COUNT(*) - COUNT(p.branch_id) as users_without_branch
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email_confirmed_at IS NOT NULL;

-- Step 4: Show any users still missing branch_id
SELECT 
  u.id,
  u.email,
  p.role,
  p.branch_id
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email_confirmed_at IS NOT NULL
  AND (p.branch_id IS NULL OR p.id IS NULL);

-- Step 5: Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.work_order_create_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION public.work_order_update_atomic TO authenticated;

-- Step 6: Verify RLS policies allow staff to insert work orders
-- Check if work_orders table has proper RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'work_orders'
ORDER BY policyname;
