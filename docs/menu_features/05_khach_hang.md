# 👥 Quản Lý Khách Hàng & Xe (Phương Tiện)

**Đường dẫn truy cập:** `/customers`  
**Đối tượng sử dụng chính:** Tất cả các vai trò (`owner`, `manager`, `staff` cố vấn dịch vụ/thu ngân)

---

## 1. Tổng Quan Chức Năng
Module **Quản Lý Khách Hàng** giúp xây dựng và lưu trữ cơ sở dữ liệu khách hàng trung thành, quản lý chi tiết thông tin phương tiện (xe máy, ô tô) của từng khách. Điều này giúp cửa hàng triển khai các chương trình chăm sóc khách hàng sau sửa chữa, nhắc lịch bảo dưỡng định kỳ và tra cứu nhanh lịch sử bệnh án của xe để chẩn đoán chính xác.

---

## 2. Nhiệm Vụ & Tính Năng Chính

### A. Quản Lý Hồ Sơ Khách Hàng (Customer Profile)
*   **Lưu trữ thông tin liên hệ:** Họ tên, số điện thoại, địa chỉ, email và ngày sinh (để gửi tin nhắn chúc mừng sinh nhật hoặc tặng voucher).
*   **Phân nhóm khách hàng:** Phân loại khách hàng thành các nhóm khác nhau:
    *   `Khách lẻ`: Khách hàng vãng lai sửa chữa thông thường.
    *   `Thợ ngoài`: Thợ sửa xe tự do mua phụ tùng về làm cho khách (áp dụng chính sách giá sỉ).
    *   `Khách VIP / Thân thiết`: Nhận các ưu đãi đặc biệt hoặc chiết khấu định kỳ.
*   **Quản lý điểm tích lũy:** Tích lũy điểm thưởng dựa trên giá trị hóa đơn thanh toán để quy đổi thành quà tặng hoặc trừ tiền trực tiếp ở lần sửa sau.

### B. Quản Lý Danh Sách Xe (Vehicle Management)
*   **Thông tin phương tiện:** Một khách hàng có thể sở hữu một hoặc nhiều phương tiện. Mỗi phương tiện được quản lý bằng các thông tin:
    *   **Biển số xe:** Khóa định danh chính để tra cứu nhanh.
    *   **Dòng xe:** Honda SH, Honda Lead, Yamaha Exciter, Piaggio Vespa...
    *   **Số khung / Số máy:** Hỗ trợ đặt mua phụ tùng thay thế chính hãng chuẩn xác theo đời xe.
    *   **Màu sơn, năm sản xuất, số km hiện tại.**

### C. Tra Cứu Toàn Diện Lịch Sử & Công Nợ
*   Trực tiếp xem lịch sử mua sắm phụ tùng và lịch sử sửa chữa của khách hàng ngay trên giao diện hồ sơ khách hàng.
*   Theo dõi số dư công nợ hiện tại của khách (nợ chưa thanh toán từ các lần sửa chữa trước).

---

## 3. Quy Trình Nghiệp Vụ Tiêu Chuẩn (Workflow)
1.  **Tiếp nhận khách mới:** Khi khách hàng đến cửa hàng lần đầu, cố vấn dịch vụ nhập Số điện thoại. Nếu hệ thống báo chưa tồn tại, tiến hành tạo mới hồ sơ khách hàng và thêm thông tin xe của họ.
2.  **Liên kết xe với phiếu:** Khi tạo phiếu sửa chữa mới, hệ thống yêu cầu chọn đúng Biển số xe. Phiếu sửa chữa này sẽ tự động được liên kết vào lịch sử của phương tiện đó.
3.  **Tích lũy điểm:** Khi hóa đơn sửa xe hoặc hóa đơn POS được thanh toán thành công, hệ thống tự động cộng điểm tích lũy vào tài khoản khách hàng dựa trên tỷ lệ quy đổi được thiết lập trong **Cài đặt**.

---

## 4. Lưu Ý Quan Trọng
*   **Biển số xe là khóa chính:** Cần nhập biển số xe viết liền, không dấu cách hoặc ký tự đặc biệt (ví dụ: `29A112345` thay vì `29-A1 123.45`) để việc tìm kiếm qua camera nhận diện biển số (nếu có) hoặc tìm kiếm nhanh của nhân viên đạt độ chính xác cao nhất.
*   **Đồng bộ công nợ:** Mọi hóa đơn ghi nợ cho khách hàng sẽ tự động tăng số dư nợ trên hồ sơ khách hàng đó. Khi khách đến trả nợ, thu ngân phải thực hiện ghi nhận thu nợ tại mục **Công nợ** để giảm trừ số dư nợ tương ứng của khách hàng.
