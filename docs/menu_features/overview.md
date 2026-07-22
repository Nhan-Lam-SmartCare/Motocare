# Hướng Dẫn Chức Năng & Nhiệm Vụ Các Mục Trên Menu
## Motocare (Nhạn Lâm SmartCare)

Tài liệu này cung cấp cái nhìn tổng quan và chi tiết về chức năng, nhiệm vụ cũng như phân quyền sử dụng của từng mục trên thanh menu (Navigation) của hệ thống quản lý tiệm sửa xe máy **Nhạn Lâm SmartCare (Motocare)**.

---

### 📌 Bản Đồ Phân Quyền Hệ Thống

| Mục Menu | Đường dẫn (Route) | Vai trò được phép truy cập | Tài liệu chi tiết |
| :--- | :--- | :--- | :--- |
| **Command Center** | `/dashboard` | `owner`, `manager` | [Chi tiết](./01_command_center.md) |
| **Sửa chữa** | `/service` | Tất cả (`owner`, `manager`, `staff`) | [Chi tiết](./02_sua_chua.md) |
| **Bán hàng & POS** | `/sales` | Tất cả (`owner`, `manager`, `staff`) | [Chi tiết](./03_ban_hang.md) |
| **Quản lý kho** | `/inventory` | `owner`, `manager` | [Chi tiết](./04_quan_ly_kho.md) |
| **Khách hàng** | `/customers` | Tất cả (`owner`, `manager`, `staff`) | [Chi tiết](./05_khach_hang.md) |
| **Nhân viên & Lương** | `/employees` & `/payroll` | `owner`, `manager` | [Chi tiết](./06_nhan_vien_luong.md) |
| **Tài chính** | `/finance` | `owner`, `manager` | [Chi tiết](./07_tai_chinh.md) |
| **Marketing & AI** | `/marketing` | `owner`, `manager` | [Chi tiết](./08_marketing_ai.md) |
| **Công nợ** | `/debt` | `owner`, `manager` | [Chi tiết](./09_cong_no.md) |
| **Phân tích** | `/analytics` | `owner`, `manager` | [Chi tiết](./10_phan_tich.md) |
| **Báo cáo & Thuế** | `/reports` & `/tax-report` | `owner`, `manager`, `accountant` | [Chi tiết](./11_bao_cao_thue.md) |
| **Khuyến mãi & Web** | `/admin/khuyen-mai` | `owner`, `manager` | [Chi tiết](./12_khuyen_mai_gallery.md) |
| **Cài đặt hệ thống** | `/settings` | Tất cả (`owner`, `manager`, `staff` hạn chế) | [Chi tiết](./13_cai_dat.md) |

---

### 📂 Hướng Dẫn Sử Dụng Thư Mục Tài Liệu

Mỗi file tài liệu trong thư mục này được cấu trúc chi tiết bao gồm:
1. **Tổng quan chức năng**: Giới thiệu vai trò và tầm quan trọng của mục menu.
2. **Nhiệm vụ chính**: Các tác vụ nghiệp vụ có thể thực hiện trên màn hình này.
3. **Quy trình nghiệp vụ tiêu chuẩn (Workflow)**: Hướng dẫn các bước thao tác thực tế.
4. **Các chỉ số / Trường dữ liệu quan trọng**: Làm rõ các khái niệm kỹ thuật và nghiệp vụ trong phần mềm.
5. **Lưu ý & Mẹo sử dụng**: Giúp vận hành cửa hàng hiệu quả, tránh sai sót dữ liệu.
