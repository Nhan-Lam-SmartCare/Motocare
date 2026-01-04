-- FIX CUỐI CÙNG: Cập nhật lại profile CHẮC CHẮN có branch_id
-- Chạy script này để ép buộc cập nhật

-- Cập nhật profile với email cụ thể
UPDATE public.profiles
SET 
  branch_id = 'CN1',
  role = COALESCE(role, 'staff'),
  updated_at = NOW()
WHERE email = 'nguyenminhtan85a@gmail.com';

-- Kiểm tra kết quả
SELECT 
  id,
  email,
  role,
  branch_id,
  created_at,
  updated_at,
  CASE 
    WHEN branch_id = 'CN1' THEN '✅ ĐÃ CẬP NHẬT THÀNH CÔNG'
    ELSE '❌ VẪN LỖI'
  END as status
FROM public.profiles
WHERE email = 'nguyenminhtan85a@gmail.com';

-- Cập nhật TẤT CẢ profiles chưa có branch
UPDATE public.profiles
SET 
  branch_id = 'CN1',
  updated_at = NOW()
WHERE branch_id IS NULL;

-- Kiểm tra còn ai thiếu branch không
SELECT 
  COUNT(*) as total,
  COUNT(branch_id) as has_branch,
  COUNT(*) - COUNT(branch_id) as missing_branch
FROM public.profiles;
