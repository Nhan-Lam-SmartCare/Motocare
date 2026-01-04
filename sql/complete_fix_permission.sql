-- COMPLETE FIX: Đảm bảo nhân viên có đầy đủ quyền tạo phiếu
-- Chạy toàn bộ script này trên Supabase SQL Editor

-- 1. Cập nhật profile và branch cho TẤT CẢ user
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
  branch_id = COALESCE(profiles.branch_id, 'CN1'),
  role = COALESCE(profiles.role, 'staff'),
  updated_at = NOW()
WHERE profiles.branch_id IS NULL OR profiles.role IS NULL;

-- 2. Đảm bảo chi nhánh CN1 tồn tại
INSERT INTO public.branches (id, name, address, phone, created_at, updated_at)
VALUES ('CN1', 'Chi nhánh 1', '', '', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 3. Cấp quyền EXECUTE cho tất cả function liên quan
GRANT EXECUTE ON FUNCTION public.work_order_create_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION public.work_order_update_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION public.mc_current_branch TO authenticated;

-- 4. Kiểm tra RLS policies cho work_orders - phải cho phép staff insert
DO $$
BEGIN
  -- Drop old policy if exists
  DROP POLICY IF EXISTS "Users can insert work_orders in their branch" ON public.work_orders;
  
  -- Create new policy allowing staff to insert
  CREATE POLICY "Users can insert work_orders in their branch"
  ON public.work_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    branch_id IN (
      SELECT branch_id 
      FROM public.profiles 
      WHERE id = auth.uid() 
      AND branch_id IS NOT NULL
    )
  );
END $$;

-- 5. Kiểm tra RLS policies cho inventory_transactions
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can insert inventory_transactions in their branch" ON public.inventory_transactions;
  
  CREATE POLICY "Users can insert inventory_transactions in their branch"
  ON public.inventory_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    branch_id IN (
      SELECT branch_id 
      FROM public.profiles 
      WHERE id = auth.uid()
    )
  );
END $$;

-- 6. Kiểm tra RLS policies cho cash_transactions
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can insert cash_transactions in their branch" ON public.cash_transactions;
  
  CREATE POLICY "Users can insert cash_transactions in their branch"
  ON public.cash_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    branch_id IN (
      SELECT branch_id 
      FROM public.profiles 
      WHERE id = auth.uid()
    )
  );
END $$;

-- 7. KẾT QUẢ KIỂM TRA
SELECT 
  '✅ Profile check' as step,
  u.email,
  p.role,
  p.branch_id,
  CASE 
    WHEN p.branch_id IS NULL THEN '❌ THIẾU BRANCH_ID'
    WHEN p.role IS NULL THEN '❌ THIẾU ROLE'
    ELSE '✅ OK'
  END as status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'nguyenminhtan85a@gmail.com';

-- 8. Kiểm tra chi nhánh
SELECT 
  '✅ Branch check' as step,
  id as branch_id, 
  name as branch_name,
  '✅ Chi nhánh tồn tại' as status
FROM public.branches 
WHERE id = 'CN1';

-- 9. Kiểm tra function permissions
SELECT 
  '✅ Function permissions' as step,
  proname as function_name,
  CASE 
    WHEN proacl IS NULL THEN '✅ PUBLIC (everyone can execute)'
    WHEN proacl::text LIKE '%authenticated%' THEN '✅ AUTHENTICATED can execute'
    ELSE '❌ NO PERMISSION'
  END as status
FROM pg_proc
WHERE proname IN ('work_order_create_atomic', 'work_order_update_atomic', 'mc_current_branch');

-- 10. Kiểm tra RLS policies
SELECT 
  '✅ RLS Policies' as step,
  tablename,
  policyname,
  cmd as operation,
  CASE 
    WHEN cmd = 'INSERT' AND roles @> '{authenticated}' THEN '✅ Staff có thể INSERT'
    ELSE '⚠️ Cần kiểm tra'
  END as status
FROM pg_policies
WHERE tablename IN ('work_orders', 'inventory_transactions', 'cash_transactions')
  AND cmd = 'INSERT'
ORDER BY tablename;
