-- FIX LỖI RLS: Function không đọc được profiles
-- Vấn đề: Function work_order_create_atomic dùng SECURITY DEFINER 
-- nhưng RLS vẫn chặn query profiles

-- GIẢI PHÁP 1: Tắt RLS cho bảng profiles (ĐƠN GIẢN NHẤT)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Kiểm tra RLS đã tắt chưa
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'profiles';

-- GIẢI PHÁP 2: Nếu muốn GIỮ RLS, tạo policy cho SECURITY DEFINER functions
-- (Chỉ chạy nếu không muốn tắt RLS hoàn toàn)
/*
DROP POLICY IF EXISTS "Allow functions to read all profiles" ON public.profiles;

CREATE POLICY "Allow functions to read all profiles"
ON public.profiles
FOR SELECT
TO public
USING (true);
*/

-- Kiểm tra profiles có thể đọc được không
SELECT 
  id,
  email,
  role,
  branch_id
FROM public.profiles
WHERE email = 'nguyenminhtan85a@gmail.com';
