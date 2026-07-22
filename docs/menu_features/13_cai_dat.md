# ⚙️ Cài Đặt Hệ Thống

**Đường dẫn truy cập:** `/settings`  
**Đối tượng sử dụng chính:** `owner` (Toàn quyền), `manager` (Quản lý hạn chế), `staff` (Chỉ xem/chỉnh sửa thông tin cá nhân)

---

## 1. Tổng Quan Chức Năng
Module **Cài Đặt** là nơi thiết lập các tham số vận hành nền tảng cho toàn bộ hệ thống **Motocare**. Tại đây, chủ tiệm có thể cấu hình thông tin hiển thị trên hóa đơn, thiết lập phương thức in ấn, điều chỉnh tỷ lệ tích điểm khách hàng và thực hiện các tác vụ quản trị cơ sở dữ liệu như sao lưu (backup) và đồng bộ.

---

## 2. Nhiệm Vụ & Tính Năng Chính

### A. Thiết Lập Thông Tin Cửa Hàng (Store Profile)
*   **Thông tin cơ bản:** Khai báo Tên tiệm, số điện thoại, địa chỉ, logo, khẩu hiệu (Slogan), số tài khoản ngân hàng nhận chuyển khoản. Thông tin này sẽ tự động được lấy để hiển thị lên đầu các hóa đơn K80/A5 in ra cho khách hàng.
*   **Quản lý chi nhánh:** Định cấu hình thông tin cho từng chi nhánh độc lập trong chuỗi cửa hàng Nhạn Lâm SmartCare.

### B. Cấu Hình In Ấn (Print Template Settings)
*   **Mẫu in hóa đơn:** Hỗ trợ đa dạng khổ giấy:
    *   `K80 (80mm)`: Khổ máy in nhiệt thông dụng tại quầy thu ngân.
    *   `A5 (Ngang/Dọc)`: Thường dùng in phiếu tiếp nhận xe hoặc hóa đơn sửa chữa chi tiết.
    *   `A4`: Dành cho các đơn hàng bán buôn số lượng lớn.
*   **Tùy chọn hiển thị hóa đơn:** Bật/tắt hiển thị mã QR chuyển khoản ngân hàng trên hóa đơn, hiển thị cột chiết khấu, hiển thị ghi chú chính sách bảo hành ở chân trang.

### C. Cài Đặt Tham Số Nghiệp Vụ
*   **Quy đổi Điểm Tích Lũy:** Thiết lập tỷ lệ tích lũy (ví dụ: chi tiêu 100.000 VND được 1 điểm) và giá trị quy đổi điểm ra tiền mặt (ví dụ: 1 điểm tương đương 1.000 VND khi thanh toán).
*   **Thuế suất mặc định:** Cấu hình thuế VAT mặc định cho các hóa đơn (0%, 5%, 8%, 10%).

### D. Quản Trị Dữ Liệu (Backup & Restore)
*   **Sao lưu dữ liệu:** Cho phép tải xuống tệp sao lưu (Backup) toàn bộ dữ liệu của cửa hàng (danh sách khách hàng, kho hàng, hóa đơn) để lưu trữ ngoại tuyến phòng sự cố.
*   **Khôi phục dữ liệu:** Cho phép khôi phục lại dữ liệu hệ thống từ một tệp sao lưu đã lưu trước đó.

---

## 3. Quy Trình Cấu Hình Ban Đầu Khi Sử Dụng (Workflow)
1.  **Thông tin cửa hàng:** Đầu tiên, truy cập `Settings` cập nhật tên cửa hàng, logo và số điện thoại liên hệ.
2.  **Thông tin ngân hàng:** Nhập chính xác số tài khoản và mã ngân hàng để hệ thống tự động tạo mã QR chuyển khoản động trên hóa đơn K80.
3.  **Kiểm tra máy in:** Kết nối máy in nhiệt K80 với máy tính, thực hiện in thử một hóa đơn mẫu từ phần mềm để kiểm tra căn lề và cỡ chữ.
4.  **Tích lũy điểm:** Thiết lập chính sách tích lũy điểm thưởng phù hợp với kế hoạch marketing của tiệm.

---

## 4. Lưu Ý Quan Trọng
*   **Mã QR thanh toán:** Thông tin số tài khoản và ngân hàng cần được nhập chính xác tuyệt đối. Nếu nhập sai, mã QR tạo ra trên hóa đơn in cho khách hàng quét thanh toán sẽ chuyển tiền sai tài khoản.
*   **Sao lưu định kỳ:** Chủ cửa hàng nên tải file sao lưu cơ sở dữ liệu về máy tính cá nhân định kỳ (ví dụ: mỗi tuần 1 lần) để đảm bảo an toàn thông tin tuyệt đối trước các sự cố lỗi mạng hoặc máy tính hỏng.
*   **Quyền thay đổi cài đặt:** Chức năng thay đổi cấu hình thuế suất, xóa dữ liệu hoặc khôi phục dữ liệu chỉ mở duy nhất cho tài khoản có vai trò là **Owner** (Chủ cửa hàng).
