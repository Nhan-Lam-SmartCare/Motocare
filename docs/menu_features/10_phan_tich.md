# 📊 Hệ Thống Phân Tích Thông Minh (Analytics Dashboard)

**Đường dẫn truy cập:** `/analytics`  
**Đối tượng sử dụng chính:** `owner` (Chủ cửa hàng), `manager` (Quản lý)

---

## 1. Tổng Quan Chức Năng
Nếu Command Center cho biết tiệm đang vận hành thế nào trong ngày, thì module **Phân Tích** cung cấp các báo cáo phân tích chuyên sâu về sức khỏe tài chính và hoạt động của cửa hàng theo chu kỳ tuần, tháng, quý, năm. Hệ thống sử dụng biểu đồ trực quan để giúp chủ tiệm nhìn ra xu hướng phát triển, điểm nghẽn trong vận hành và tối ưu hóa chi phí.

---

## 2. Nhiệm Vụ & Tính Năng Chính

### A. Phân Tích Bán Hàng & Doanh Thu (Sales Analytics)
*   **Xu hướng doanh thu:** Biểu đồ đường thể hiện doanh thu tăng trưởng theo từng tháng.
*   **Cơ cấu doanh thu:** Tỷ trọng đóng góp giữa doanh thu bán lẻ phụ tùng và doanh thu từ dịch vụ sửa chữa (tiền công).
*   **Top sản phẩm bán chạy:** Liệt kê những phụ tùng có số lượng bán nhiều nhất hoặc mang lại doanh thu cao nhất để ưu tiên nhập kho.

### B. Phân Tích Dịch Vụ Sửa Chữa (Service Analytics)
*   **Hiệu suất thợ sửa:** Thống kê số lượng xe sửa chữa thành công và tổng tiền công mang lại của từng thợ trong tháng. Giúp chủ tiệm đánh giá tay nghề và năng suất làm việc của thợ để khen thưởng.
*   **Bệnh xe phổ biến:** Thống kê các lỗi kỹ thuật thường gặp nhất của các dòng xe (ví dụ: hỏng côn, mòn má phanh, lỗi Fi). Giúp chuẩn bị sẵn các linh kiện thay thế tương ứng để phục vụ khách nhanh nhất.

### C. Phân Tích Khách Hàng (Customer Analytics)
*   **Tỷ lệ quay lại (Retention Rate):** Thống kê tỷ lệ phần trăm khách hàng quay lại tiệm bảo dưỡng từ lần thứ 2 trở lên.
*   **Cơ cấu khách hàng:** Phân tích tỷ lệ doanh thu đóng góp từ khách lẻ vãng lai và thợ ngoài mua sỉ phụ tùng.
*   **Khách hàng VIP:** Danh sách khách hàng có giá trị chi tiêu lớn nhất để chăm sóc đặc biệt.

### D. Phân Tích Tài Chính (Financial Analytics)
*   **Biểu đồ Lợi nhuận ròng (Net Profit):** Doanh thu trừ đi toàn bộ chi phí (giá vốn, lương nhân viên, khấu hao, chi phí điện nước...).
*   **Cơ cấu chi phí:** Biểu đồ tròn phân tích các khoản chi của cửa hàng (chi nhập phụ tùng chiếm bao nhiêu %, chi lương bao nhiêu %, chi phí khác...).
*   **Sự biến động dòng tiền (Cashflow):** Dòng tiền vào và dòng tiền ra thực tế giúp đánh giá khả năng thanh toán ngắn hạn của tiệm.

### E. Phân Tích Tồn Kho (Inventory Analytics)
*   **Vòng quay hàng tồn kho (Inventory Turnover):** Tốc độ luân chuyển hàng tồn kho của tiệm.
*   **Hàng chậm luân chuyển:** Danh sách các phụ tùng tồn kho lâu ngày không bán được, giúp chủ tiệm đưa ra phương án khuyến mãi xả kho để thu hồi vốn.

---

## 3. Quy Trình Trích Xuất Dữ Liệu Quyết Định (Workflow)
1.  **Định kỳ đầu tháng:** Chủ cửa hàng truy cập màn hình `Analytics` để đánh giá kết quả kinh doanh của tháng trước.
2.  **Xem biểu đồ Cơ cấu chi phí:** Nếu chi phí vận hành tăng đột biến, tiến hành bấm xem chi tiết dòng chi thủ công trong Sổ quỹ để tìm nguyên nhân.
3.  **Xem hiệu suất thợ:** Dựa trên biểu đồ hiệu suất thợ sửa xe để đưa ra chính sách thưởng đạt doanh số tiền công cho nhân viên.
4.  **Lập kế hoạch mua hàng:** Dựa trên phân tích hàng tồn kho để loại bỏ các mặt hàng khó bán và tăng tỷ trọng nhập các linh kiện thuộc Top bán chạy.

---

## 4. Lưu Ý Quan Trọng
*   **Độ chính xác của dữ liệu:** Dữ liệu phân tích hoàn toàn phụ thuộc vào việc nhân viên nhập liệu đầy đủ và chính xác tất cả các hóa đơn bán hàng, phiếu chi phí vận hành và bảng tính lương hàng tháng. Nếu bỏ sót thu chi ngoài, các biểu đồ phân tích tài chính sẽ bị sai lệch.
*   **Bộ lọc thời gian:** Luôn kiểm tra bộ lọc thời gian (Từ ngày... Đến ngày...) ở góc trên màn hình để đảm bảo đang xem đúng chu kỳ dữ liệu cần phân tích.
