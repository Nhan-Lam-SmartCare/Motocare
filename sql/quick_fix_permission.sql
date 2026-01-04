-- QUICK FIX: Cấp quyền tạo phiếu sửa chữa cho tất cả nhân viên
-- Chạy script này trên Supabase SQL Editor

-- Cập nhật tất cả user có email xác nhận
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

-- Kiểm tra kết quả
SELECT 
  u.email,
  p.role,
  p.branch_id,
  p.full_name
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
WHERE u.email_confirmed_at IS NOT NULL
ORDER BY u.created_at DESC;
