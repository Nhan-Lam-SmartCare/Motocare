-- DEBUG: Kiểm tra chi tiết quyền của nhân viên
-- Chạy script này để tìm nguyên nhân

-- 1. Kiểm tra profile của nhân viên cụ thể
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at,
  p.role,
  p.branch_id,
  p.full_name,
  p.created_at,
  p.updated_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'nguyenminhtan85a@gmail.com';

-- 2. Kiểm tra function mc_current_branch() có hoạt động không
-- (Đăng nhập với user nguyenminhtan85a@gmail.com rồi chạy)
SELECT public.mc_current_branch() as current_branch;

-- 3. Kiểm tra RLS policies cho work_orders
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

-- 4. Kiểm tra permissions của function work_order_create_atomic
SELECT 
  proname as function_name,
  pg_get_function_identity_arguments(oid) as arguments,
  proacl as permissions
FROM pg_proc
WHERE proname = 'work_order_create_atomic';

-- 5. Cấp quyền EXECUTE cho function (nếu chưa có)
GRANT EXECUTE ON FUNCTION public.work_order_create_atomic TO authenticated;

-- 6. Kiểm tra xem user có thể insert vào work_orders không
-- (Cần đăng nhập với user để test)
-- Uncomment để test:
/*
INSERT INTO work_orders (
  order_id, 
  customer_name, 
  customer_phone,
  vehicle_model,
  license_plate,
  status,
  payment_status,
  branch_id
) VALUES (
  'TEST-' || extract(epoch from now())::text,
  'Test Customer',
  '0123456789',
  'Test Vehicle',
  'TEST123',
  'pending',
  'unpaid',
  'CN1'
);
*/
