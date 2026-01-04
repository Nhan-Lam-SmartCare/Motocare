-- TEST: Kiểm tra token hiện tại của user có branch_id chưa
-- Chạy script này KHI NHÂN VIÊN ĐANG ĐĂNG NHẬP

-- Kiểm tra auth.uid() và profile
SELECT 
  auth.uid() as current_user_id,
  p.email,
  p.role,
  p.branch_id,
  CASE 
    WHEN p.branch_id IS NULL THEN '❌ Token không có branch_id - CẦN ĐĂNG XUẤT/NHẬP LẠI'
    ELSE '✅ Token OK'
  END as status
FROM public.profiles p
WHERE p.id = auth.uid();

-- Kiểm tra function mc_current_branch()
SELECT 
  public.mc_current_branch() as current_branch_from_function,
  CASE 
    WHEN public.mc_current_branch() IS NULL THEN '❌ Function trả về NULL - CẦN ĐĂNG XUẤT/NHẬP LẠI'
    ELSE '✅ Function OK'
  END as status;
