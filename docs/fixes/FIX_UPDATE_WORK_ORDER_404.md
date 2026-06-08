# 🔧 SỬA LỖI 404: Function work_order_update_atomic không tồn tại

## 🐛 VẤN ĐỀ

Khi cập nhật phiếu sửa chữa, gặp lỗi:
```
404 (Not Found)
Error updating work order (atomic): {code: 'supabase', message: 'Cập nhật phiếu sửa chữa (atomic) thất bại'}
```

## 🔍 NGUYÊN NHÂN

RPC function `work_order_update_atomic` **chưa được tạo** trong Supabase database. Function này được định nghĩa trong file SQL nhưng chưa được chạy.

## ✅ GIẢI PHÁP

### Bước 1: Chạy SQL Script

1. Mở **Supabase Dashboard** → **SQL Editor**
2. Copy toàn bộ nội dung file [sql/2025-11-13_work_order_update_atomic.sql](sql/2025-11-13_work_order_update_atomic.sql)
3. Paste vào SQL Editor
4. Click **RUN**

### Bước 2: Xác nhận function đã được tạo

Sau khi chạy, bạn sẽ thấy thông báo:
```
Success. No rows returned
```

### Bước 3: Test lại

1. **Refresh** lại website (Ctrl+F5 hoặc Cmd+R)
2. Thử sửa lại phiếu sửa chữa
3. Lỗi 404 sẽ không còn nữa!

## 📋 FUNCTION LÀM GÌ?

Function `work_order_update_atomic` xử lý:
- ✅ Cập nhật thông tin phiếu sửa chữa
- ✅ Tự động điều chỉnh tồn kho khi thêm/bớt phụ tùng
- ✅ Tự động tạo giao dịch tiền mặt khi thanh toán
- ✅ Kiểm tra đủ tồn kho trước khi cập nhật
- ✅ Atomic transaction (rollback nếu có lỗi)

## 🔗 FILES LIÊN QUAN

- [sql/2025-11-13_work_order_update_atomic.sql](sql/2025-11-13_work_order_update_atomic.sql) - Script tạo function
- [src/lib/repository/workOrdersRepository.ts](src/lib/repository/workOrdersRepository.ts#L366) - Code gọi function
- [src/components/service/components/WorkOrderModal.tsx](src/components/service/components/WorkOrderModal.tsx#L2230) - UI cập nhật phiếu

## ⚠️ LƯU Ý

- Function này cần quyền `authenticated` để execute
- Nếu bạn chưa có table `audit_logs`, function vẫn chạy được (có exception handler)
- Function sử dụng `mc_is_manager_or_owner()` và `mc_current_branch()` - đảm bảo 2 helper functions này đã tồn tại

## 🧪 KIỂM TRA FUNCTION ĐÃ TỒN TẠI

Chạy query này trong Supabase SQL Editor:

```sql
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'work_order_update_atomic';
```

Nếu có kết quả → Function đã tồn tại ✅
Nếu không có kết quả → Cần chạy script tạo function
