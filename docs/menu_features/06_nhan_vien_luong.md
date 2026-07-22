# 👔 Quản Lý Nhân Viên & Lương (Nhân Sự & Bảng Lương)

**Đường dẫn truy cập:** `/employees` và `/payroll`  
**Đối tượng sử dụng chính:** `owner` (Chủ cửa hàng), `manager` (Quản lý)

---

## 1. Tổng Quan Chức Năng
Nhân sự là yếu tố quyết định chất lượng dịch vụ của tiệm sửa xe. Module **Nhân Viên & Lương** giúp tối ưu hóa công tác quản lý nhân sự, theo dõi hiệu suất làm việc, xử lý tạm ứng lương và tự động tính toán bảng lương hàng tháng bao gồm lương cứng và các khoản hoa hồng (chiết khấu doanh thu sửa xe) cho kỹ thuật viên.

---

## 2. Nhiệm Vụ & Tính Năng Chính

### A. Quản Lý Nhân Sự & Phân Quyền (Employees)
*   **Thông tin nhân viên:** Lưu trữ thông tin cá nhân, số điện thoại, địa chỉ, số tài khoản ngân hàng nhận lương, hợp đồng lao động và ngày bắt đầu làm việc.
*   **Phân vai trò truy cập hệ thống (Roles):**
    *   `owner` (Chủ hệ thống): Quyền hạn cao nhất, toàn quyền cấu hình hệ thống, xem mọi dữ liệu tài chính, doanh thu, lợi nhuận.
    *   `manager` (Quản lý chi nhánh): Có quyền quản lý kho, nhân viên, khách hàng, tạo phiếu nhập kho, tính lương nhưng bị giới hạn một số cài đặt sâu của hệ thống.
    *   `staff` (Nhân viên/Thợ kỹ thuật): Chỉ truy cập giao diện bán hàng POS, tạo phiếu sửa chữa, không xem được báo cáo doanh thu tổng hoặc sổ quỹ tài chính.
    *   `accountant` (Kế toán): Có quyền truy cập sâu vào sổ quỹ, báo cáo tài chính, báo cáo thuế để làm việc với cơ quan chức năng.

### B. Quản Lý Tạm Ứng Lương (Employee Advance)
*   Cho phép ghi nhận các khoản tạm ứng giữa tháng của nhân viên.
*   Theo dõi tổng số tiền đã tạm ứng lũy kế trong tháng của từng người để tự động khấu trừ khi lập bảng lương cuối tháng.

### C. Tính Toán Bảng Lương & Hoa Hồng (Payroll)
*   **Cơ cấu tính lương:** Lương thực lĩnh = Lương cứng + Hoa hồng dịch vụ - Khoản tạm ứng - Trừ phạt/Bảo hiểm + Thưởng thêm.
*   **Cơ chế tính hoa hồng (Commissions) cho Thợ:**
    *   **Hoa hồng dịch vụ:** Tính theo tỷ lệ % trên tiền công sửa chữa (ví dụ: thợ được hưởng 10% - 30% giá trị tiền công của các hạng mục đảm nhận).
    *   **Hoa hồng phụ tùng:** Tính theo tỷ lệ % hoặc số tiền cố định trên mỗi phụ tùng thay thế được bán ra (khuyến khích thợ tư vấn phụ tùng cho khách).
*   **Kết xuất bảng lương:** Tự động tạo bảng lương tổng hợp cho toàn bộ nhân viên vào cuối tháng, xuất báo cáo PDF/Excel để ký nhận và theo dõi trạng thái chi trả lương (Chưa trả, Đã trả).

---

## 3. Quy Trình Tính Lương Cuối Tháng (Workflow)
1.  **Cập nhật dữ liệu công việc:** Đảm bảo tất cả các phiếu sửa chữa trong tháng đã được gán đúng tên thợ thực hiện và chuyển trạng thái "Đã hoàn thành".
2.  **Khởi tạo bảng lương:** Vào mục `Payroll` -> Chọn tháng/năm cần tính lương -> Chọn "Tính lương".
3.  **Kiểm tra & Điều chỉnh:**
    *   Hệ thống tự động cộng dồn doanh số dịch vụ để tính hoa hồng cho từng thợ.
    *   Hệ thống tự động trừ đi số tiền tạm ứng trong tháng của thợ đã ghi nhận ở mục `Employee Advance`.
    *   Người quản lý nhập tay các khoản thưởng thêm (thưởng chuyên cần, thưởng tết) hoặc phạt (đi muộn, làm hỏng đồ).
4.  **Phê duyệt & Chi trả:** Nhấn xác nhận duyệt bảng lương, tiến hành chuyển khoản trả lương cho nhân viên và ghi nhận chi tiền lương vào Sổ quỹ (Cash Book).

---

## 4. Lưu Ý Quan Trọng
*   **Cấu hình phần trăm hoa hồng:** Cần thiết lập tỷ lệ hoa hồng cho từng nhân viên trong phần thông tin chi tiết của nhân viên đó trước khi bắt đầu tính lương. Tỷ lệ này có thể khác nhau giữa thợ chính và thợ phụ.
*   **Đồng bộ Sổ Quỹ:** Khi thực hiện chi trả lương trên bảng lương, hệ thống sẽ đề xuất tạo một phiếu chi tương ứng trên **Sổ quỹ (Cash Book)** để ghi nhận dòng tiền ra của cửa hàng. Cần xác nhận tạo phiếu chi này để sổ quỹ luôn cân đối.
