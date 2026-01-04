-- KIỂM TRA NGAY TRÊN SUPABASE VỚI USER ĐANG ĐĂNG NHẬP
-- Yêu cầu nhân viên login vào Supabase Dashboard và chạy script này

-- 1. Kiểm tra auth.uid() có hoạt động không
SELECT 
  '1. Auth UID Check' as test,
  auth.uid() as user_id,
  CASE 
    WHEN auth.uid() IS NULL THEN '❌ CHƯA ĐĂNG NHẬP hoặc TOKEN HẾT HẠN'
    ELSE '✅ Đã đăng nhập'
  END as status;

-- 2. Kiểm tra profile có tồn tại không
SELECT 
  '2. Profile Check' as test,
  p.id,
  p.email,
  p.role,
  p.branch_id,
  CASE 
    WHEN p.id IS NULL THEN '❌ KHÔNG TÌM THẤY PROFILE'
    WHEN p.branch_id IS NULL THEN '❌ THIẾU BRANCH_ID'
    ELSE '✅ Profile OK'
  END as status
FROM public.profiles p
WHERE p.id = auth.uid();

-- 3. Kiểm tra query giống trong function
SELECT 
  '3. Function Query Test' as test,
  branch_id,
  CASE 
    WHEN branch_id IS NULL THEN '❌ Query trả về NULL - ĐÂY LÀ NGUYÊN NHÂN LỖI'
    ELSE '✅ Query OK'
  END as status
FROM public.profiles
WHERE id = auth.uid();

-- 4. Kiểm tra tất cả profiles
SELECT 
  '4. All Profiles' as test,
  email,
  role,
  branch_id,
  CASE 
    WHEN branch_id IS NULL THEN '❌ THIẾU BRANCH'
    ELSE '✅ OK'
  END as status
FROM public.profiles
WHERE email = 'nguyenminhtan05a@gmail.com';
