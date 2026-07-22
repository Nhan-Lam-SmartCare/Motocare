# 🛒 Bán Hàng & POS Bán Lẻ (Quản Lý Bán Hàng Nhanh & Giao Hàng)

**Đường dẫn truy cập:** `/sales` và `/delivery`  
**Đối tượng sử dụng chính:** Tất cả các vai trò (`owner`, `manager`, `staff` thu ngân/bán hàng)

---

## 1. Tổng Quan Chức Năng
Module **Bán Hàng** cung cấp giao diện POS (Point of Sale) tối ưu, cho phép nhân viên thực hiện bán lẻ nhanh các mặt hàng phụ tùng, dầu nhớt, đồ chơi xe, mũ bảo hiểm... trực tiếp cho khách hàng mang về hoặc thợ ngoài đến mua buôn, không cần thông qua quy trình tiếp nhận xe và sửa chữa tại xưởng. Đồng thời tích hợp tính năng **Quản lý giao hàng** để kiểm soát các đơn hàng chuyển phát đi xa.

---

## 2. Nhiệm Vụ & Tính Năng Chính

### A. Giao Diện Bán Hàng Tại Quầy (POS)
*   **Tìm kiếm & Quét mã sản phẩm:**
    *   Hỗ trợ tìm kiếm phụ tùng bằng tên, mã vạch (SKU) hoặc quét nhanh qua máy quét barcode chuyên dụng.
    *   Tự động hiển thị hình ảnh, giá bán lẻ/giá sỉ và số lượng tồn kho còn lại của sản phẩm.
*   **Quản lý giỏ hàng:**
    *   Tăng giảm số lượng, xóa mặt hàng, áp dụng giảm giá trực tiếp theo số tiền (VND) hoặc tỷ lệ phần trăm (%) cho từng dòng hàng hoặc cho toàn bộ hóa đơn.
    *   Gắn thông tin khách hàng mua hàng (để tích điểm hoặc ghi nhận công nợ nếu khách mua nợ).
*   **Thanh toán đa dạng & In hóa đơn:**
    *   Phương thức: Tiền mặt, chuyển khoản ngân hàng (tích hợp tạo mã QR động chứa số tiền hóa đơn để khách hàng quét nhanh không sai sót), hoặc quẹt thẻ POS.
    *   Hỗ trợ in hóa đơn nhiệt khổ K80 hoặc khổ giấy A5/A4 ngay lập tức sau khi nhấn thanh toán.

### B. Quản Lý Đơn Giao Hàng (Delivery Manager)
*   **Ghi nhận thông tin giao hàng:** Địa chỉ nhận hàng, số điện thoại người nhận, ghi chú giao hàng (ví dụ: "giao giờ hành chính").
*   **Theo dõi trạng thái đơn hàng:**
    *   `Chờ xử lý` (Pending): Đơn hàng mới tạo, đang chuẩn bị hàng hóa trong kho.
    *   `Đang giao` (Shipping): Hàng đã được bàn giao cho shipper/đơn vị vận chuyển (Giao Hàng Tiết Kiệm, Viettel Post, shipper tự do).
    *   `Đã giao` (Delivered): Khách đã nhận hàng và shipper đã thu hộ tiền (nếu có COD).
    *   `Đã hủy` (Cancelled): Đơn hàng bị hủy do khách đổi ý hoặc không liên lạc được.
*   **Quản lý COD (Thu hộ):** Theo dõi số tiền shipper cần thu và đối soát dòng tiền nộp về sổ quỹ của cửa hàng.

---

## 3. Quy Trình Nghiệp Vụ Tiêu Chuẩn (Workflow)

### Quy trình Bán lẻ nhanh tại quầy:
1.  **Quét/Chọn sản phẩm:** Nhân viên quét mã vạch sản phẩm khách mua.
2.  **Thông tin khách hàng:** Chọn khách hàng trong danh bạ (hoặc tạo mới nhanh nếu khách chưa có thông tin).
3.  **Áp dụng Khuyến mãi (nếu có):** Nhập mã giảm giá hoặc chiết khấu cho khách hàng thân thiết.
4.  **Thanh toán:** Khách quét mã QR chuyển khoản hoặc trả tiền mặt.
5.  **In hóa đơn & Giao hàng:** In hóa đơn bán lẻ trao cho khách cùng hàng hóa. Hệ thống tự động giảm trừ số lượng tồn kho phụ tùng.

---

## 4. Lưu Ý Quan Trọng
*   **Giá bán linh hoạt:** Hệ thống hỗ trợ nhiều mức giá bán (Giá bán lẻ, Giá thợ, Giá sỉ). Khi chọn khách hàng thuộc nhóm tương ứng (ví dụ: nhóm "Thợ ngoài"), hệ thống sẽ tự động áp dụng giá bán sỉ/giá thợ cho hóa đơn.
*   **Bán âm kho:** Tùy thuộc vào cấu hình hệ thống cài đặt bởi Owner, phần mềm có thể cho phép hoặc chặn bán hàng khi số lượng tồn kho của phụ tùng bằng 0. Cần lưu ý cập nhật số liệu nhập kho trước khi bán để tránh sai sót số liệu tồn kho.
