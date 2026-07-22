# Tài Liệu Cấu Trúc Kỹ Thuật & Schema Hệ Thống
## Motocare (Nhạn Lâm SmartCare)

Tài liệu này tổng hợp thông tin chi tiết về cấu trúc thư mục, tệp cấu hình, thiết kế cơ sở dữ liệu PostgreSQL (Supabase) bao gồm: các bảng dữ liệu, hàm RPC, trigger, view và chính sách bảo hành RLS của dự án **Nhạn Lâm SmartCare (Motocare)**.

---

### 1. File cấu hình dự án (`package.json`)

Dự án được xây dựng trên nền tảng **React 19** kết hợp với **Vite**, sử dụng **TypeScript** và **TailwindCSS**. Kết nối cơ sở dữ liệu và xác thực thông qua **Supabase**.

```json
{
  "name": "motocarepro-standalone",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src --ext ts,tsx",
    "lint:strict": "eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint src --ext ts,tsx --fix",
    "test": "vitest run --environment jsdom",
    "test:watch": "vitest --environment jsdom",
    "test:integration": "vitest run --mode integration --environment jsdom tests/integration",
    "db:backup": "node scripts/maintenance/export-all-tables.mjs"
  },
  "dependencies": {
    "@capacitor/android": "^8.3.4",
    "@capacitor/core": "^8.3.4",
    "@supabase/supabase-js": "^2.76.1",
    "@tanstack/react-query": "^5.90.5",
    "@tanstack/react-query-devtools": "^5.90.2",
    "date-fns": "^4.1.0",
    "dotenv": "^17.2.3",
    "html2canvas": "^1.4.1",
    "html5-qrcode": "^2.3.8",
    "jsbarcode": "^3.12.1",
    "jspdf": "^4.2.1",
    "jspdf-autotable": "^5.0.2",
    "lucide-react": "^0.469.0",
    "papaparse": "^5.5.3",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "react-native-webview": "13.16.0",
    "react-router-dom": "^7.9.3",
    "react-toastify": "^11.0.5",
    "recharts": "^3.3.0",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "@capacitor/assets": "^3.0.5",
    "@capacitor/cli": "^8.3.4",
    "@eslint/js": "^9.17.0",
    "@playwright/test": "^1.57.0",
    "@tailwindcss/typography": "^0.5.19",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "@types/node": "^22.19.0",
    "@types/react": "19.2.2",
    "@types/react-dom": "19.2.2",
    "@vitejs/plugin-react": "^5.0.0",
    "autoprefixer": "^10.4.0",
    "baseline-browser-mapping": "^2.10.0",
    "eslint": "^9.17.0",
    "eslint-plugin-react-hooks": "^5.0.0",
    "eslint-plugin-react-refresh": "^0.4.16",
    "globals": "^15.14.0",
    "jsdom": "^27.1.0",
    "pg": "^8.19.0",
    "postcss": "^8.4.0",
    "puppeteer": "^24.33.0",
    "tailwindcss": "^3.4.4",
    "typescript": "~5.8.2",
    "typescript-eslint": "^8.18.2",
    "vite": "^6.2.0",
    "vitest": "^4.1.8"
  },
  "overrides": {
    "react": "19.2.4",
    "react-dom": "19.2.4"
  }
}
```

---

### 2. Cấu trúc thư mục mã nguồn (`src/`)

```text
src/
├── App.tsx                     # Định tuyến chính (React Router) & Cấu trúc layout trang
├── main.tsx                    # Điểm khởi chạy của ứng dụng web
├── index.css                   # Định nghĩa CSS gốc, biến CSS & cấu hình Tailwind
├── supabaseClient.ts           # Khởi tạo kết nối SDK Supabase Client
├── types.ts                    # Khai báo TypeScript interfaces toàn hệ thống (WorkOrder, Part, Customer...)
│
├── constants/                  # Chứa các hằng số cấu hình hệ thống, phân quyền (Roles)
├── contexts/                   # Quản lý React Context (AuthContext, ThemeContext, AppContext)
│
├── components/                 # Chứa các component React phân bổ theo tính năng:
│   ├── layout/                 # Thanh điều hướng (Nav, BottomNav, ShopLayout)
│   ├── auth/                   # Giao diện đăng nhập, phân quyền, khôi phục mật khẩu
│   ├── dashboard/              # Màn hình Command Center, StaffDashboard & các widget thống kê
│   ├── service/                # Quản lý phiếu sửa chữa (ServiceManager, ServiceHistory)
│   ├── sales/                  # Màn hình POS bán hàng nhanh & DeliveryManager
│   ├── inventory/              # Quản lý hàng tồn kho, nhập xuất, in mã vạch (Barcode)
│   ├── customer/               # Quản lý thông tin khách hàng và danh sách xe máy
│   ├── employee/               # Quản lý hồ sơ nhân viên, thợ sửa xe & tạm ứng
│   ├── payroll/                # Quản lý bảng tính lương hàng tháng & hoa hồng thợ
│   ├── finance/                # Sổ quỹ (CashBook), Khoản vay (Loans), Nguồn vốn & Khấu hao tài sản
│   ├── marketing/              # Trợ lý AI (AiAdvisor), Kịch bản video, Lịch đăng bài, KMS
│   ├── debt/                   # Quản lý công nợ khách hàng và nhà cung cấp
│   ├── analytics/              # Biểu đồ phân tích tài chính, bán hàng, kho, hiệu suất thợ
│   ├── reports/                # Báo cáo nội bộ & Kết xuất dữ liệu báo cáo thuế
│   └── common/                 # Các component dùng chung (ErrorBoundary, NotificationDropdown...)
│
├── hooks/                      # Các React Custom Hooks (useSupabase, useStoreSettings, useConfirm...)
│
├── lib/                        # Thư viện logic xử lý cốt lõi của ứng dụng
│   ├── auditQueue.ts           # Hàng đợi ghi nhật ký hoạt động (Audit Logs)
│   ├── supabase.ts             # Các hàm tương tác trực tiếp với Supabase
│   ├── syncCashTransactions.ts # Đồng bộ giao dịch dòng tiền
│   └── repository/             # Các lớp Repository thực thi giao tiếp Supabase API & RPC:
│       ├── salesRepository.ts
│       ├── workOrdersRepository.ts
│       ├── partsRepository.ts
│       ├── debtsRepository.ts
│       ├── marketingRepository.ts
│       ├── aiRepository.ts
│       └── ...
│
├── pages/                      # Các trang cấp cao (Shop công cộng, Admin điều hành trang web)
│   ├── admin/                  # GalleryManager, PromotionManager
│   └── shop/                   # ProductCatalog, PromotionsPage, CustomerPortal (tra cứu lịch sử)
│
├── theme/                      # Cấu hình màu sắc, Preset giao diện
└── utils/                      # Các hàm tiện ích (Format tiền tệ, thời gian, lazy import...)
```

---

### 3. Cấu trúc thư mục dữ liệu (`sql/`)

Thư mục này chứa toàn bộ các file SQL Migration và SQL Script để cấu hình trên Supabase:
*   **Dựng khung schema cơ sở:** `2025-11-10_schema_setup_clean.sql`, `2025-11-13_ALL_MISSING_TABLES.sql`, `supabase_setup.sql`.
*   **Các Migration sửa đổi theo thời gian:** Chứa hàng loạt file có tiền tố thời gian (`2025-11-11_...` đến `2026-07-10_...`) thực thi nâng cấp cấu trúc bảng (thêm cột barcode, cột delivery, bổ sung RLS, tối ưu chỉ mục index).
*   **Bổ sung phân hệ chức năng:** Các file chuyên biệt để dựng phân hệ Marketing & AI (`2026-07-10_marketing_module.sql`), tài sản cố định (`2025-11-24_fixed_assets_management.sql`), nợ vay (`2025-11-13_loans_tables.sql`), v.v.

---

### 4. Danh sách bảng PostgreSQL (Schema)

| Tên bảng | Chức năng nhiệm vụ |
| :--- | :--- |
| **`profiles`** | Quản lý thông tin tài khoản người dùng, phân vai trò (`role`) và chi nhánh (`branch_id`). |
| **`customers`** | Hồ sơ khách hàng (Tên, số điện thoại, địa chỉ, tổng tiền tích lũy). |
| **`vehicles`** | Phương tiện của khách hàng (Biển số, dòng xe, số khung, số máy, liên kết với `customers`). |
| **`parts`** | Danh mục phụ tùng trong kho (SKU, giá bán lẻ, giá thợ, giá nhập WAC, mức tồn tối thiểu). |
| **`categories`** | Danh mục nhóm ngành hàng (Dầu nhớt, săm lốp, linh kiện điện...). |
| **`work_orders`** | Phiếu sửa chữa dịch vụ (Trạng thái, thợ chính, thợ phụ, chi phí phụ tùng, tiền công, giảm giá). |
| **`sales`** | Đơn bán lẻ phụ tùng qua POS quầy (Hóa đơn mua mang về, giảm giá, VAT, tiền thanh toán). |
| **`cash_transactions`** | Sổ cái thu chi thực tế dòng tiền (Liên kết két tiền mặt hoặc tài khoản ngân hàng). |
| **`payment_sources`** | Danh sách nguồn tiền (Ví dụ: `cash` - Tiền mặt, `bank` - Chuyển khoản chi nhánh). |
| **`inventory_transactions`** | Lịch sử xuất nhập tồn của kho phụ tùng (Thẻ kho). |
| **`purchase_orders`** | Đơn nhập hàng từ nhà cung cấp. |
| **`purchase_order_items`** | Chi tiết phụ tùng nhập kho đi kèm trong đơn nhập. |
| **`suppliers`** | Danh mục nhà cung cấp phụ tùng. |
| **`customer_debts`** | Công nợ phải thu từ khách hàng. |
| **`supplier_debts`** | Công nợ phải trả cho nhà cung cấp hàng hóa. |
| **`loans`** | Các khoản nợ vay kinh doanh của tiệm. |
| **`loan_payments`** | Lịch sử thanh toán lãi & gốc của các khoản vay. |
| **`employees`** | Hồ sơ nhân viên, cấu hình tỷ lệ % hoa hồng công thợ và hoa hồng bán phụ tùng. |
| **`employee_advances`** | Nhật ký tạm ứng lương của nhân viên. |
| **`payroll_records`** | Bảng lương hàng tháng (Lương cứng + hoa hồng thợ - tạm ứng - phạt). |
| **`notifications`** | Thông báo hệ thống gửi đến người dùng (Cảnh báo hết hàng, nhắc nợ, lịch hẹn). |
| **`store_settings`** | Thiết lập thông tin cửa hàng, mẫu in K80/A5, thông tin quét QR ngân hàng. |
| **`promotions`** | Các chương trình khuyến mãi hiển thị lên trang web công cộng. |
| **`gallery`** | Bộ sưu tập hình ảnh dự án sửa xe thực tế của tiệm. |
| **`marketing_ideas` / `_scripts` / `_shot_lists`** | Quản lý ý tưởng, kịch bản quay video TikTok/Reels, phân cảnh. |
| **`knowledge_articles`** | Kho bài viết hướng dẫn sửa chữa nội bộ hoặc cẩm nang xe cho khách. |
| **`audit_logs`** | Nhật ký hoạt động ghi nhận các thao tác thêm/sửa/xóa của nhân viên. |

---

### 5. Danh sách Supabase Database Functions (RPC)

Dự án áp dụng cấu trúc **Atomic Transactions** (các giao dịch nguyên tố thông qua Database Function viết bằng PL/pgSQL) để đảm bảo tính toàn vẹn dữ liệu khi bán hàng/nhập kho/hoàn tiền:

*   **`sale_create_atomic`**: Tạo đơn bán lẻ nhanh. Trong 1 transaction sẽ thực thi: kiểm tra tồn kho -> giảm số lượng tồn kho phụ tùng -> tạo đơn `sales` -> tạo phiếu xuất kho `inventory_transactions` -> tạo phiếu thu `cash_transactions` -> cập nhật số dư `payment_sources`.
*   **`sale_update_atomic` / `sale_delete_atomic`**: Cập nhật hoặc hủy đơn hàng, tự động hoàn trả lại tồn kho phụ tùng và cấn trừ tiền thu/chi trên Sổ quỹ.
*   **`work_order_create_atomic` / `work_order_update_atomic`**: Tạo/Cập nhật phiếu sửa chữa, tự động chuyển đổi giữa giữ chỗ phụ tùng (Reserved stock) và trừ kho thực tế.
*   **`work_order_complete_payment`**: Nhận tiền thanh toán dịch vụ sửa chữa, cập nhật trạng thái phiếu và ghi nhận doanh thu vào Sổ quỹ.
*   **`work_order_refund_atomic`**: Hoàn trả phiếu dịch vụ sửa chữa, tự động xử lý trả lại kho phụ tùng và chi tiền hoàn cho khách.
*   **`receipt_create_atomic`**: Tạo phiếu nhập hàng từ nhà cung cấp, tăng tồn kho phụ tùng và tự động tính toán lại Giá vốn bình quân gia quyền (WAC - Weighted Average Cost).
*   **`adjust_part_stock`**: Điều chỉnh tăng giảm trực tiếp số lượng tồn kho phụ tùng (thao tác kiểm kho).
*   **`get_public_work_order`**: Hàm RPC bảo mật cho phép khách hàng không cần đăng nhập vẫn tra cứu được thông tin sửa xe của mình qua mã tra cứu ngẫu nhiên.
*   **`admin_create_user`**: RPC giúp chủ tiệm tạo trực tiếp tài khoản đăng nhập cho nhân viên mới mà không cần nhân viên kích hoạt email thủ công.

---

### 6. Danh sách Edge Functions / API phía Server

*   Dự án **không sử dụng** Supabase Edge Functions trực tiếp.
*   Tuy nhiên, dự án sử dụng cấu trúc **Serverless API** nội bộ chạy trên máy chủ:
    *   **`api/staff-create.ts`**: API đầu cuối dùng để hỗ trợ chức năng tạo tài khoản nhân viên an toàn bằng quyền admin của Supabase Auth.

---

### 7. Triggers, Views và RLS Policies

#### A. Triggers (Trình kích hoạt tự động)
*   **`update_work_orders_updated_at`**: Tự động cập nhật trường thời gian chỉnh sửa `updated_at` trên các bảng `work_orders`, `categories`, `store_settings`.
*   **`trigger_handle_parts_stock`**: Tự động đồng bộ số lượng tồn kho thực tế của phụ tùng dựa trên việc tính toán tổng lịch sử giao dịch trong bảng `inventory_transactions`.
*   **`trigger_check_low_stock`**: Kích hoạt khi xuất kho phụ tùng. Nếu tồn kho thực tế rơi xuống dưới mức tồn tối thiểu (`min_stock`), trigger sẽ tự động chèn một bản ghi thông báo cảnh báo vào bảng `notifications`.
*   **`trigger_auto_debt`**: Tự động tính toán công nợ khi một đơn bán hàng hoặc phiếu sửa xe có trạng thái ghi nợ được hoàn thành.

#### B. Views (Bảng ảo)
*   **`inventory_summary_view`**: Tổng hợp dữ liệu kho hàng nhanh chóng (Tính tổng giá trị kho theo giá vốn nhập, số lượng hàng đang chờ/đang có).
*   **`cash_transactions_ledger_view`**: Sổ cái tổng hợp, tính toán số dư lũy kế theo thời gian thực của từng tài khoản thanh toán (Tiền mặt, Ngân hàng).
*   **`audit_logs_with_user_view`**: Kết hợp bảng `audit_logs` với thông tin tài khoản nhân viên từ `profiles` để hiển thị trực quan ai đã thực hiện thao tác gì.

#### C. RLS Policies (Row Level Security - Bảo mật cấp hàng)
Supabase RLS được bật trên tất cả các bảng lõi để phân quyền chặt chẽ theo chi nhánh (`branch_id`) và vai trò:
*   **`owner` & `manager`**: Có toàn quyền (SELECT, INSERT, UPDATE, DELETE) trên tất cả các bảng, đặc biệt là các bảng tài chính nhạy cảm (`cash_transactions`, `loans`, `payroll_records`).
*   **`staff` (Kỹ thuật viên / Thu ngân)**:
    *   Được phép SELECT và INSERT trên các bảng nghiệp vụ bán lẻ và sửa chữa (`sales`, `work_orders`, `customers`, `vehicles`) tại chi nhánh làm việc của mình.
    *   **Bị chặn hoàn toàn** quyền truy cập vào các bảng tài chính nội bộ, khoản vay và bảng lương của nhân viên khác.
*   **Anonymous (Khách vãng lai)**:
    *   Chỉ được phép SELECT hạn chế trên các bảng quảng bá công cộng (`parts`, `promotions`, `gallery`) và gọi RPC `get_public_work_order` để phục vụ hoạt động của website bán hàng và tra cứu trực tuyến.
