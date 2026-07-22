# 🏷️ Khuyến Mãi & Thư Viện Ảnh (Quản Lý Nội Dung Website)

**Đường dẫn truy cập:** `/admin/khuyen-mai` và `/admin/thu-vien`  
**Đối tượng sử dụng chính:** `owner` (Chủ cửa hàng), `manager` (Quản lý)

---

## 1. Tổng Quan Chức Năng
Bên cạnh hệ thống quản lý nội bộ, **Motocare** tích hợp trang web công cộng dành riêng cho khách hàng của tiệm (tra cứu lịch sử xe, xem sản phẩm, khuyến mãi). Module **Khuyến Mãi & Thư Viện Ảnh** là công cụ quản trị dành cho chủ tiệm để chủ động cập nhật các chương trình ưu đãi mới nhất và đăng tải hình ảnh các dự án sửa chữa xe thực tế lên trang web công cộng, giúp gia tăng uy tín và thu hút khách hàng mới qua internet.

---

## 2. Nhiệm Vụ & Tính Năng Chính

### A. Quản Lý Chương Trình Khuyến Mãi (PromotionManager)
*   **Tạo chương trình ưu đãi:** Đăng tải các chiến dịch khuyến mãi của tiệm (ví dụ: "Giảm 20% tiền công thay dầu nhớt dịp lễ", "Tặng lọc gió khi làm gói bảo dưỡng toàn bộ").
*   **Thiết lập thông tin khuyến mãi:**
    *   Tiêu đề chương trình, hình ảnh banner quảng cáo thu hút.
    *   Mô tả chi tiết thể lệ chương trình (áp dụng cho những dòng xe nào, điều kiện đi kèm).
    *   Thời gian hiệu lực (Ngày bắt đầu, Ngày kết thúc). Hệ thống tự động ẩn khuyến mãi trên website khi hết hạn.
*   **Trạng thái hoạt động:** Bật/tắt hiển thị chương trình chỉ bằng 1 nút gạt.

### B. Quản Lý Thư Viện Ảnh Thực Tế (GalleryManager)
*   **Tạo bộ sưu tập (Portfolio):** Đăng tải hình ảnh chất lượng cao về các dòng xe đã được phục dựng, độ chế hoặc xử lý thành công các bệnh khó tại tiệm (ví dụ: Album phục hồi xe Honda Cub cổ, Album độ pô kiểng Exciter).
*   **Nội dung bộ sưu tập:**
    *   Hình ảnh Trước (Before) và Sau (After) khi sửa chữa/dọn xe để khách hàng dễ so sánh chất lượng.
    *   Mô tả ngắn gọn về quy trình làm việc, linh kiện nâng cấp và cảm nhận của khách hàng.
    *   Gắn nhãn dòng xe để khách hàng dễ dàng tìm kiếm bộ sưu tập tương ứng với loại xe họ đang đi.

---

## 3. Quy Trình Cập Nhật Quảng Bá (Workflow)
1.  **Chụp ảnh thực tế:** Khi thợ tại xưởng hoàn thành một dự án sửa xe xuất sắc (dọn mới nguyên con, độ xe kiểng), tiến hành chụp hình ảnh xe sạch sẽ tại tiệm.
2.  **Đăng tải Gallery:** Chủ tiệm truy cập `Gallery Manager` -> Chọn "Thêm dự án mới" -> Tải ảnh lên -> Nhập mô tả các hạng mục đã làm -> Nhấn "Xuất bản".
3.  **Tạo Khuyến mãi kích cầu:** Nếu có chiến dịch giảm giá phụ tùng tồn kho, vào `Promotion Manager` -> Tạo chương trình giảm giá -> Nhập thời hạn áp dụng -> Lưu lại để thông tin lập tức hiển thị trên website công cộng phục vụ khách hàng tra cứu.

---

## 4. Lưu Ý Quan Trọng
*   **Dung lượng hình ảnh:** Để trang web công cộng tải nhanh, hình ảnh chụp bằng điện thoại nên được giảm dung lượng hoặc nén nhẹ trước khi tải lên mục Khuyến mãi & Thư viện. Tránh tải lên các file ảnh gốc dung lượng quá lớn (trên 5MB).
*   **Nội dung rõ ràng:** Phần mô tả khuyến mãi cần nêu rõ điều kiện áp dụng để tránh trường hợp hiểu nhầm gây tranh cãi khi khách mang xe đến thanh toán thực tế tại tiệm.
