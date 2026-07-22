# 🚀 Command Center (Trung Tâm Điều Hành)

**Đường dẫn truy cập:** `/dashboard`  
**Đối tượng sử dụng chính:** `owner` (Chủ cửa hàng), `manager` (Quản lý chi nhánh)

---

## 1. Tổng Quan Chức Năng
Command Center là màn hình trang chủ quản trị dành cho chủ cửa hàng và quản lý. Mục tiêu của trang này là cung cấp cái nhìn toàn cảnh về tình hình kinh doanh của tiệm theo thời gian thực (Real-time). Qua đó giúp người quản lý nhanh chóng đưa ra các quyết định vận hành chính xác mà không cần đi sâu vào từng báo cáo chi tiết.

---

## 2. Nhiệm Vụ & Tính Năng Chính
*   **Theo dõi KPI trong ngày:**
    *   **Doanh thu bán hàng:** Tổng số tiền thu được từ hóa đơn bán lẻ phụ tùng và dịch vụ sửa chữa.
    *   **Lợi nhuận gộp dự tính:** Tính toán dựa trên doanh thu trừ đi giá vốn phụ tùng đã sử dụng.
    *   **Số lượng giao dịch:** Số lượng hóa đơn POS và phiếu sửa chữa đã hoàn thành.
    *   **Xe đang làm dịch vụ:** Số xe hiện tại đang được kỹ thuật viên thao tác sửa chữa tại xưởng.
*   **Biểu đồ xu hướng:**
    *   Biểu đồ cột/đường trực quan thể hiện biến động doanh thu theo tuần hoặc theo tháng.
    *   So sánh hiệu suất doanh thu giữa các ngày hoặc giữa các chi nhánh (nếu là chuỗi cửa hàng).
*   **Hệ thống cảnh báo thông minh (Alerts):**
    *   **Cảnh báo tồn kho:** Danh sách phụ tùng sắp hết hàng (số lượng tồn kho thực tế chạm hoặc dưới mức tối thiểu thiết lập).
    *   **Cảnh báo công nợ:** Các khoản nợ đến hạn thanh toán từ khách hàng hoặc đến hạn trả nhà cung cấp.
*   **Lịch hẹn dịch vụ:**
    *   Hiển thị danh sách khách hàng đã đặt lịch hẹn sửa xe/bảo dưỡng trong ngày hoặc ngày kế tiếp để chủ động chuẩn bị nhân sự và phụ tùng.
*   **Nhật ký hoạt động gần đây (Recent Activities):**
    *   Ghi nhận các thao tác mới nhất trên hệ thống (Tạo phiếu sửa chữa mới, xuất kho phụ tùng, nhân viên thanh toán lương...) để tăng tính giám sát.

---

## 3. Quy Trình Vận Hành Tiêu Chuẩn (Workflow)
1.  **Đầu ngày:** Người quản lý truy cập Command Center để kiểm tra lịch hẹn khách hàng trong ngày và phân bổ thợ sửa chữa phù hợp.
2.  **Giữa ngày:**
    *   Xem số lượng xe đang làm dịch vụ tại xưởng để điều phối khu vực làm việc (bàn nâng).
    *   Kiểm tra danh mục phụ tùng cảnh báo hết hàng để làm việc với nhà cung cấp nhập thêm hàng kịp thời.
3.  **Cuối ngày:** Đối soát tổng doanh thu và lợi nhuận gộp trong ngày so với mục tiêu đề ra trực tiếp trên các thẻ KPI.

---

## 4. Lưu Ý Quan Trọng
*   Các chỉ số doanh thu và lợi nhuận gộp hiển thị trên Command Center chỉ mang tính chất **hoạt động thời gian thực** (chưa trừ các chi phí gián tiếp như lương nhân viên, tiền điện nước, mặt bằng). Để xem lợi nhuận ròng cuối cùng, người quản lý cần truy cập mục **Tài chính** hoặc **Phân tích**.
*   Để cảnh báo tồn kho hoạt động chính xác, cần khai báo trường "Số lượng tối thiểu" trong mục **Quản lý kho** cho từng loại phụ tùng.
