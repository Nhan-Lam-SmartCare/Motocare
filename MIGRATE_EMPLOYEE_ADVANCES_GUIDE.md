# Hướng dẫn Migration Ứng lương cũ

## Vấn đề

Các đơn ứng lương có trạng thái **"Đã duyệt" (approved)** trước đây chưa được ghi vào sổ quỹ (cash_transactions).

## Giải pháp

Chạy script SQL một lần duy nhất trong Supabase để tự động:
- Tạo phiếu chi cho tất cả đơn đã duyệt
- Chuyển trạng thái thành "Đã chi trả" (paid)

## Các bước thực hiện

### 1. Mở Supabase Dashboard
- Truy cập: https://supabase.com/dashboard
- Chọn project của bạn

### 2. Vào SQL Editor
- Menu bên trái → **SQL Editor**
- Hoặc: https://supabase.com/dashboard/project/[PROJECT_ID]/sql/new

### 3. Copy và chạy script

Mở file `migrate_employee_advances.sql` và copy toàn bộ nội dung, paste vào SQL Editor rồi nhấn **Run** (hoặc Ctrl+Enter).

### 4. Kiểm tra kết quả

Script sẽ hiển thị:
```
Migration hoàn tất! Đã xử lý X đơn ứng lương cũ.
```

### 5. Verify trong app

- Vào trang **Ứng lương** → Tất cả đơn cũ giờ có trạng thái "Đã chi trả"
- Vào trang **Sổ quỹ** → Thấy các phiếu chi với ghi chú `[Migration từ đơn cũ]`

## Lưu ý quan trọng

⚠️ **Chỉ chạy script này MỘT LẦN DUY NHẤT**

- Script có kiểm tra trùng lặp (`ON CONFLICT DO NOTHING`) nên an toàn khi chạy nhiều lần
- Nhưng tốt nhất chỉ chạy 1 lần để tránh nhầm lẫn

## Nếu có lỗi

Nếu script báo lỗi, kiểm tra:
1. Branch ID có đúng không?
2. Các đơn ứng lương có đầy đủ thông tin không?
3. Bảng `cash_transactions` có tồn tại không?

Liên hệ dev để được hỗ trợ.
