# 📋 Báo Cáo Hoạt Động & Xuất Dữ Liệu Thuế

**Đường dẫn truy cập:** `/reports` và `/tax-report`  
**Đối tượng sử dụng chính:** `owner` (Chủ), `manager` (Quản lý), `accountant` (Kế toán)

---

## 1. Tổng Quan Chức Năng
Module **Báo Cáo Hoạt Động & Thuế** giúp xuất ra các biểu mẫu báo cáo số liệu chuẩn kế toán phục vụ cho việc đối soát nội bộ định kỳ hoặc lưu trữ hồ sơ. Đặc biệt, phân hệ **Báo cáo Thuế** hỗ trợ kết xuất dữ liệu kinh doanh của cửa hàng sang các tệp Excel/CSV định dạng chuẩn để dễ dàng nộp cho cơ quan thuế hoặc phục vụ kê khai thuế khoán, thuế GTGT hộ kinh doanh.

---

## 2. Nhiệm Vụ & Tính Năng Chính

### A. Quản Lý Báo Cáo Định Kỳ (ReportsManager)
*   **Báo cáo Bán hàng:** Chi tiết doanh số bán phụ tùng, số lượng hóa đơn, doanh thu theo nhân viên bán hàng và lợi nhuận gộp tương ứng.
*   **Báo cáo Dịch vụ:** Thống kê chi tiết các phiếu sửa xe đã thực hiện, tổng tiền dịch vụ (tiền công) và phụ tùng đi kèm trong từng phiếu.
*   **Báo cáo Kho (Xuất-Nhập-Tồn):**
    *   Báo cáo tồn kho hiện tại kèm tổng giá trị kho tính theo giá vốn nhập.
    *   Báo cáo chi tiết lượng phụ tùng nhập kho và xuất kho trong kỳ để theo dõi hao hụt.
*   **Báo cáo Sổ quỹ:** Tổng hợp các khoản thu, chi thực tế phát sinh trong kỳ theo từng tài khoản thanh toán để đối chiếu số dư tiền gửi ngân hàng và tiền mặt két.

### B. Kết Xuất Báo Cáo Thuế (TaxReportExport)
*   Đối với các tiệm sửa xe đăng ký hộ kinh doanh cá thể hoặc doanh nghiệp nhỏ, việc kê khai thuế cần số liệu hóa đơn bán ra và mua vào rõ ràng.
*   **Tính năng xuất dữ liệu thuế:**
    *   **Bảng kê hàng hóa bán ra:** Kết xuất danh sách toàn bộ hóa đơn bán lẻ và phiếu sửa chữa đã hoàn thành trong kỳ (tháng/quý), bao gồm thông tin doanh thu trước thuế, thuế suất (nếu có), thuế GTGT và tổng tiền thanh toán.
    *   **Bảng kê hàng hóa mua vào:** Kết xuất danh sách các hóa đơn nhập kho phụ tùng từ nhà cung cấp để phục vụ khấu trừ thuế hoặc chứng minh nguồn gốc hàng hóa đầu vào.
    *   **Định dạng xuất:** File Excel (.xlsx) hoặc CSV được cấu trúc chuẩn hóa, dễ dàng chỉnh sửa hoặc tải lên hệ thống khai thuế điện tử của Tổng cục Thuế.

---

## 3. Quy Trình Trích Xuất & Khai Thuế (Workflow)
1.  **Lựa chọn kỳ báo cáo:** Kế toán chọn kỳ báo cáo thuế (ví dụ: Quý I/2026 hoặc Tháng 07/2026).
2.  **Đối soát dữ liệu nội bộ:** Chạy báo cáo Sổ quỹ và Báo cáo bán hàng ở mục `Reports` để đảm bảo số liệu thu chi khớp với ngân hàng.
3.  **Tạo báo cáo thuế:** Vào mục `Tax Report` -> Chọn khoảng thời gian -> Nhấn "Tải Bảng Kê Bán Ra / Mua Vào".
4.  **Kê khai:** Kế toán sử dụng file Excel vừa tải xuống để đối chiếu, làm hồ sơ nộp thuế theo phương pháp kê khai hoặc nộp thuế khoán theo quy định của chi cục thuế địa phương.

---

## 4. Lưu Ý Quan Trọng
*   **Thông tin hóa đơn:** Để báo cáo thuế chính xác, khi tạo phiếu nhập kho hoặc hóa đơn bán hàng, nếu có hóa đơn VAT đi kèm, nhân viên cần tích chọn "Có hóa đơn VAT" và nhập đúng Thuế suất (5%, 8%, 10%) cùng Số hóa đơn đỏ.
*   **Hóa đơn chưa thanh toán:** Hệ thống báo cáo thuế sẽ ghi nhận doanh thu tính thuế tại thời điểm xuất hóa đơn/phiếu hoàn thành, không phụ thuộc vào việc khách hàng đã thanh toán hết nợ hay chưa (nguyên tắc kế toán dồn tích).
