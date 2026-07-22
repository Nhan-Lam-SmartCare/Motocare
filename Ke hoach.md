# Kế Hoạch Nâng Cấp Hệ Thống Lên Phiên Bản V2 (Bản Hoàn Chỉnh)

**Dự án:** Motocare (Nhạn Lâm SmartCare)
**Phiên bản tài liệu:** 3.0 — Đã chuẩn hóa qua 2 vòng review kiến trúc
**Ngày cập nhật:** 17/07/2026

Kế hoạch này đảm bảo hệ thống V1 hoạt động bình thường trong suốt quá trình phát triển V2. V2 được xây dựng trên một **Supabase Project độc lập hoàn toàn** và một nhánh git riêng (`feature/v2`). Khi V2 hoàn thiện, script di chuyển dữ liệu sẽ chuyển toàn bộ dữ liệu lịch sử từ V1 sang V2 theo chiến lược **Full Re-run** trong đêm Golive.

---

## 1. Thông Tin Môi Trường V2 (Supabase Project Mới)

| Hạng mục | Giá trị |
|---|---|
| URL API V2 | `https://qogpizqgocghmbxtrfdu.supabase.co` *(sửa 19/07 — bản cũ ghi `yxohjuezxrpnijypkeaa` là ref của project đã bỏ)* |
| Anon Key V2 |  |

**Nguyên tắc hạ tầng:**

- Môi trường V2 chạy trên một Supabase Project độc lập hoàn toàn — cách ly tuyệt đối với V1 đang chạy Production.
- **Không dùng prefix `v2.`** trong SQL DDL. Tất cả bảng nằm trong schema `public` của project mới.
- Khóa ngoại `part_id` trên `work_order_items` và `sale_items` **cho phép NULL** (`REFERENCES parts(id) ON DELETE SET NULL`) để xử lý triệt để dữ liệu mồ côi (dịch vụ nhanh, phụ tùng đã xóa).

**Quy tắc bảo mật key (bắt buộc):**

- Anon key được phép xuất hiện phía client (thiết kế của Supabase), nhưng **`service_role` key tuyệt đối không được nằm trong tài liệu, code hay bất kỳ commit nào**. Nếu lỡ lộ → rotate ngay trong Dashboard.
- `SUPABASE_SERVICE_ROLE_KEY_V2` chỉ điền vào file `.env` cục bộ. **Xác nhận `.env` đã nằm trong `.gitignore` trước khi điền key thật.**

---

## 2. Kết Quả Chẩn Đoán Dữ Liệu Thực Tế Trên Database V1

Đã chạy script `diagnose_v1_orphaned_parts.mjs` trực tiếp trên database V1:

| Nguồn dữ liệu | Số dòng mồ côi | Kết luận |
|---|---|---|
| Work Orders (`partsUsed`) | **0** | Tất cả `partId` ánh xạ đúng vào danh mục `parts` |
| Retail Sales (`items`) | **498** | Các giao dịch dịch vụ nhanh (Quick Service) |

**Nguyên nhân 498 dòng mồ côi:** Các giao dịch bán lẻ dịch vụ nhanh (rửa xe, tiền công, sửa chữa nhanh...) được tạo trực tiếp ở màn hình POS với ID có tiền tố `quick_service_` hoặc `quick_service_manual_` — không tồn tại trong bảng `parts` vì không phải phụ tùng vật lý.

**Giải pháp:** `part_id` nullable. Khi migrate, các dòng dịch vụ nhanh có `part_id = NULL` nhưng **bảo lưu 100%** tên dịch vụ (`part_name`), mã `sku` và giá tiền trong các cột text của bảng normalized. Mọi dòng được xử lý theo cách này đều được ghi cảnh báo vào bảng `migration_errors` trên V2 để đối soát.

---

## 3. Nguyên Tắc Cốt Lõi Khi Xây Dựng V2

1. **Những gì V1 làm tốt ➡️ Giữ lại:** giao dịch nguyên tố (atomic transactions), AI Advisor, KMS, kịch bản marketing và luồng nghiệp vụ hiện tại.
2. **Những gì V1 thiếu ➡️ Bổ sung:** khóa ngoại toàn vẹn dữ liệu, hiệu năng truy vấn, báo cáo.
3. **Những gì V1 chồng chéo ➡️ Chuẩn hóa:** chuyển JSONB thành bảng liên kết quan hệ.
4. **Tuyệt đối không đổi tên module:** giữ nguyên menu, nhãn hiển thị, routes — nhân viên không phải học lại phần mềm.
5. **Idempotency:** mọi RPC tài chính/kho bắt buộc có cơ chế chống double-submit (Idempotency Key hoặc Unique Constraint).
6. **Rollback Strategy:** kịch bản di chuyển dữ liệu hai chiều. Giới hạn rollback khả thi: **72 giờ Hypercare sau Golive**.
7. **Auditability:** mọi biến động kho/tiền được ghi Audit Log tự động ở cấp Database (PostgreSQL trigger) — trạng thái trước/sau, nhân viên, thiết bị.
8. **Device-Specific UX:** Mobile cho thợ tối giản, nút to; Desktop cho chủ tiệm mật độ thông tin cao.
9. **Data Cleaning First:** làm sạch dữ liệu lỗi định dạng ở V1 trước khi migration.
10. **Tách biệt phạm vi:** đợt Golive này chỉ chuyển đổi **tầng dữ liệu** (database + RPC + hooks). Việc tách nhỏ God Components trên UI thực hiện **sau Golive** như một chuỗi refactor không đổi hành vi — không gộp hai việc rủi ro cao vào một đợt phát hành.

### 3.1. Chiến lược Dual-Write (Tương Thích Ngược) — kèm kỷ luật chống lệch

- Bảng `work_orders` và `sales` của V2 **giữ nguyên cột JSONB** (`partsUsed` / `items`) song song với bảng liên kết normalized → Frontend V1 chạy nguyên vẹn, không sửa dòng code UI nào.
- **Nguồn sự thật (Source of Truth) là bảng liên kết** (`work_order_items`, `sale_items`). JSONB chỉ là bản chiếu phục vụ tương thích. Mọi báo cáo, đối soát, tính tồn kho đọc từ bảng liên kết.
- Hai bản ghi phải nằm **trong cùng một transaction** ở **mọi** RPC — kiểm tra đủ cả các nhánh create / update / refund / delete, không chỉ create.
- **Job đối soát tự động** (pg_cron chạy đêm): so sánh JSONB với bảng items, ghi cảnh báo nếu lệch. Không có job này, độ lệch sẽ tích tụ âm thầm.
- **Ngày khai tử JSONB:** ấn định mốc gỡ cột JSONB và chuyển UI sang đọc bảng items trong vòng **1–2 tháng sau Golive**. Dual-write không có ngày kết thúc là nợ kỹ thuật vĩnh viễn.
- *Phương án cân nhắc:* sinh JSONB từ bảng items qua view/trigger (chỉ còn một nguồn ghi, triệt tiêu khả năng lệch). Đánh giá chi phí chuyển đổi so với dual-write vật lý hiện tại trước khi chốt.

---

## 4. Thiết Kế Cơ Sở Dữ Liệu V2 (Normalized Schema)

Mã SQL DDL đặt tại thư mục `sql/v2_setup/` (đánh số lại liên tục, không nhảy số):

| File | Nội dung |
|---|---|
| `01_schema.sql` | 30 bảng normalized, tối ưu kiểu dữ liệu, index hiệu năng, casing cột `parts` (`"costPrice"`, `"retailPrice"`, `"wholesalePrice"`) tương thích 100% V1. Bao gồm bảng mới `work_order_items`, `sale_items`, `migration_errors`. |
| `02_views_and_functions.sql` | RPC phần 1: helper phân quyền RLS, WAC, atomic RPC nhập kho, bán lẻ (`sale_create_atomic`), phiếu sửa chữa (`work_order_create_atomic`, `work_order_complete_payment`). |
| `03_views_and_functions_part2.sql` | RPC phần 2: `work_order_update_atomic`, `work_order_refund_atomic`, `sale_update_atomic`, `sale_delete_atomic`. |
| `04_rls_policies.sql` | RLS cho tất cả bảng, cách ly chi nhánh (`branchid = mc_current_branch()`), phân quyền owner/manager. |
| `05_temp_auth_migration.sql` | RPC bảo mật **tạm thời** (`temp_export_users`, `temp_import_users`) di chuyển `auth.users` giữ nguyên password hash và UUID. |
| `06_sequences_and_triggers.sql` | Trigger sinh `sale_code` (port từ V1, pass-through khi migration cấp sẵn mã). |
| `07_dualwrite_reconciliation.sql` | Hàm `reconcile_dualwrite()` + bảng `dualwrite_drift_log` — job đối soát JSONB ↔ bảng items (mục 3.1). Kèm lệnh `cron.schedule` chạy hằng đêm. |
| `08_missing_rpcs.sql` | 4 RPC frontend gọi nhưng thiếu trong bộ setup (phát hiện qua contract audit): `adjust_part_stock`, `stock_ensure_update`, `get_public_work_order` (bản hardened), `get_external_part_categories` + bảng `external_parts`, hàm `normalize_plate`. |

**Cấu trúc bảng liên kết mới:**

```sql
CREATE TABLE work_order_items (
    id TEXT PRIMARY KEY,
    work_order_id TEXT REFERENCES work_orders(id) ON DELETE CASCADE,
    part_id TEXT REFERENCES parts(id) ON DELETE SET NULL,  -- nullable: dịch vụ nhanh / phụ tùng đã xóa
    part_name TEXT NOT NULL,
    sku TEXT NOT NULL,
    category TEXT,
    quantity NUMERIC NOT NULL DEFAULT 1,
    price NUMERIC NOT NULL DEFAULT 0,
    cost_price NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sale_items (
    id TEXT PRIMARY KEY,
    sale_id TEXT REFERENCES sales(id) ON DELETE CASCADE,
    part_id TEXT REFERENCES parts(id) ON DELETE SET NULL,
    part_name TEXT NOT NULL,
    sku TEXT NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 1,
    price NUMERIC NOT NULL DEFAULT 0,
    cost_price NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Quy tắc sinh ID khi bóc tách JSONB:** dùng `id + '_' + <số thứ tự dòng>` (index trong mảng), **không** dùng `id + '_' + partId` — vì một phiếu có thể chứa cùng một phụ tùng ở 2 dòng riêng biệt, ghép theo partId sẽ sinh ID trùng và làm rơi dữ liệu âm thầm. Trong SQL dùng `jsonb_array_elements(...) WITH ORDINALITY`; trong Node.js dùng index của mảng.

**Xử lý lỗi khi migrate:** không dùng `ON CONFLICT DO NOTHING` để nuốt lỗi. Mọi dòng không chèn được hoặc bị chuyển `part_id = NULL` phải ghi vào bảng `migration_errors` (kèm ID gốc, lý do, payload). Nguyên tắc: **mọi dòng bị loại phải nhìn thấy được**, vì "khớp 100%" và "lặng lẽ bỏ qua conflict" là hai thứ đối nghịch.

### 4.1. Bảo mật RPC Auth Migration (điểm nhạy cảm nhất của kế hoạch)

RPC `temp_export_users` xuất **password hash** của toàn bộ người dùng — bắt buộc tuân thủ:

1. `REVOKE EXECUTE ON FUNCTION temp_export_users, temp_import_users FROM anon, authenticated;` — chỉ `service_role` gọi được. Quên dòng này = bất kỳ ai có anon key (vốn công khai) rút được toàn bộ hash mật khẩu.
2. Script migration **DROP cả hai RPC ngay sau khi import xong**, trên cả V1 lẫn V2.
3. Checklist có bước **verify riêng**: query `pg_proc` xác nhận hai RPC đã biến mất trên cả hai project.
4. Bài test nghiệm thu duy nhất có giá trị: **đăng nhập thật trên V2 bằng mật khẩu cũ** — chứng minh `encrypted_password` và UUID được giữ nguyên.
5. Auth migration phải **hoàn thành trước ngày Parallel Run** — nhân viên cần tài khoản để đăng nhập V2.

---

## 5. Kiểm Kê & Di Chuyển Hạ Tầng Ngoài Bảng Dữ Liệu

`pg_dump` bảng không mang theo các thành phần dưới đây. Lập checklist kiểm kê V1, đánh dấu từng mục **"có/không dùng — đã chuyển/không cần chuyển"**:

| Hạng mục | Việc cần làm |
|---|---|
| **Supabase Storage** | Copy toàn bộ bucket (ảnh xe, ảnh hóa đơn, file đính kèm) sang project V2; **rewrite các URL lưu trong database** trỏ sang domain project mới. Nếu bỏ sót → ảnh vỡ hàng loạt ngay ngày đầu Golive. |
| **Edge Functions** | Liệt kê, deploy lại lên project V2, cập nhật secrets. |
| **Database Webhooks** | Tạo lại trên V2, trỏ đúng endpoint. |
| **pg_cron jobs** | Tạo lại trên V2 (bao gồm job đối soát dual-write ở mục 3.1). |
| **Realtime** | Bật lại publication cho các bảng cần realtime. |
| **Sequences số hóa đơn** | ✅ **Đã port** sang `sql/v2_setup/06_sequences_and_triggers.sql` (18/07): hàm `generate_sale_code()` + trigger `trigger_set_sale_code` (BEFORE INSERT), có nhánh **pass-through** khi migration cấp sẵn `sale_code` từ V1, retry tối đa 50 lần chống race, UNIQUE constraint bảo đảm không trùng. Không dùng sequence số mà tính `MAX(...)+1` theo ngày → không cần `setval` sau migration. |
| **RLS Policies** | Đã có trong `04_rls_policies.sql` — xác nhận đủ so với V1. |
| **Cấu hình Auth** | SMTP, redirect URLs, providers, email templates. |

---

## 6. Giải Pháp Chạy Song Song Qua Proxy Switcher (Kèm 3 Chốt Chặn An Toàn)

**Cơ chế:** `supabaseClient.ts` khởi tạo cả 2 client (V1 và V2), bọc JavaScript Proxy quanh export `supabase`. Proxy chuyển hướng mọi truy vấn tới V2 khi `localStorage.getItem('motocare_use_v2') === 'true'`, ngược lại kết nối V1.

```js
// Bật test V2:
localStorage.setItem('motocare_use_v2', 'true'); location.reload();
// Trả về V1:
localStorage.setItem('motocare_use_v2', 'false'); location.reload();
```

**⚠️ Rủi ro cố hữu:** cờ là **per-device**. Kịch bản tai nạn: nhân viên quên tắt cờ sau ngày parallel run → hôm sau ghi hóa đơn thật lên V2 "thử nghiệm" → đêm Golive TRUNCATE V2 theo quy trình → **xóa vĩnh viễn giao dịch thật mà V1 không hề có bản ghi**. Bắt buộc 3 chốt chặn:

1. **Banner cảnh báo cố định:** khi cờ V2 bật, UI hiển thị dải màu đỏ nổi bật *"MÔI TRƯỜNG THỬ NGHIỆM V2 — KHÔNG NHẬP HÓA ĐƠN THẬT"* trên mọi màn hình. Không ai được phép nhầm môi trường.
2. **Đối chiếu trước khi TRUNCATE:** đêm Golive, trước khi xóa dữ liệu test trên V2, chạy query liệt kê **các giao dịch tồn tại trên V2 nhưng không có ở V1**. Nếu xuất hiện dòng lạ phát sinh sau ngày parallel run → **dừng lại điều tra, không xóa mù**.
3. **Golive bằng biến môi trường, không bằng cờ:** chuyển đổi chính thức thực hiện qua `.env.production` lúc build. Sau Golive, **gỡ hẳn Proxy switcher khỏi code** — cơ chế cờ chỉ tồn tại trong giai đoạn thử nghiệm.

**Lưu ý vận hành:** session đăng nhập Supabase lưu theo project ref → mỗi lần lật cờ, nhân viên phải **đăng nhập lại**. Đưa vào hướng dẫn sử dụng để không bị bất ngờ.

---

## 7. Các Script Tự Động (thư mục `scripts/maintenance/`)

### 7.1. `migrate_v1_to_v2.mjs` — Di chuyển V1 → V2

- Xuất/import người dùng qua RPC tạm thời (mục 4.1), dọn dẹp RPC sau khi xong.
- Tải master data và transaction của V1 theo batch (phân trang 1000 dòng) tránh timeout.
- Bóc tách JSONB `partsUsed` / `items` thành `work_order_items` / `sale_items` — ID dạng `id + '_' + index` (mục 4).
- Kiểm tra tồn tại `part_id`; dòng mồ côi (quick service) → `part_id = NULL`, log vào `migration_errors`.
- Migrate theo đúng thứ tự phụ thuộc: users → master data (parts, customers, ...) → transactions → items.
- Reset sequences số hóa đơn sau khi import (mục 5).
- **Idempotent:** chạy lại toàn bộ từ đầu cho kết quả y hệt — nền tảng của chiến lược Full Re-run.

### 7.2. `verify_migration.mjs` — Đối soát tự động (MỚI)

Không đối soát bằng mắt trên Dashboard. Script in bảng so sánh V1 ↔ V2 kèm kết luận **PASS/FAIL từng mục**:

- Số dòng từng bảng (đủ 30 bảng).
- `SUM(total)` doanh thu theo tháng trên `sales` và `work_orders`.
- Tồn kho từng mã phụ tùng (tính qua bảng liên kết mới so với số V1).
- Công nợ từng khách hàng; số dư quỹ tiền mặt / tài khoản ngân hàng.
- Số dòng trong `migration_errors` khớp với số dòng mồ côi đã chẩn đoán (498 + phát sinh mới nếu có).

Dùng cho **cả 3 thời điểm**: sau staging migration, cuối ngày parallel run, và đêm Golive.

### 7.3. `rollback_v2_to_v1.mjs` — Rollback V2 → V1

- Lấy dữ liệu mới phát sinh trên V2 trong 72h Hypercare (ID chưa tồn tại ở V1).
- Gộp ngược (denormalize) `work_order_items` / `sale_items` thành JSONB `partsUsed` / `items` tương thích V1, ghi vào V1.
- Đồng bộ tồn kho (`parts.stock`) và giá vốn WAC (`parts.costPrice`) ngược về V1.
- **Phạm vi (cập nhật 19/07/2026):** ✅ script đã đồng bộ ngược **9 nhóm**: work_orders, sales, cash_transactions, inventory_transactions, stock/WAC parts, **customer_debts** (mục 7), **supplier_debts** (mục 8), **loans + loan_payments** (mục 9). Cảnh báo "chưa đồng bộ công nợ/khoản vay" ở bản kế hoạch cũ đã được xử lý.
- **WAC hai chiều (còn tồn tại — cần nghiệm thu ở Drill):** nếu V2 đã nhập thêm hàng trong 72h, WAC của V1 và V2 khác nhau. Script hiện copy trực tiếp `costPrice` từ V2 sang V1 mà không tính lại (dòng cảnh báo đã in ra cuối script). Đây là hạn chế đã biết, **bắt buộc kiểm tra kỹ khi nghiệm thu Rollback Drill** — chưa phải bug nhưng chưa xử lý triệt để.
- Đảm bảo không mất giao dịch phát sinh khi rollback.

---

## 8. Kế Hoạch Vận Hành & Phát Hành

### 8.1. Chạy Song Song (Parallel Run) — 1 ngày

- **Điều kiện tiên quyết:** auth migration xong, staging migration PASS, banner cảnh báo V2 hoạt động.
- Nhân viên thao tác chính trên V1 (hóa đơn thật cho khách), nhập lại song song trên V2 — **chỉ các luồng tiền mặt và xuất kho chính** để giảm gánh nặng.
- Cuối ngày chạy `verify_migration.mjs` đối soát tổng doanh thu và tồn kho. Chỉ tiến hành Golive khi số liệu V2 tính toán khớp 100% với V1.
- **Cuối ngày: xác nhận mọi thiết bị đã tắt cờ `motocare_use_v2`** (đi từng máy kiểm tra).

### 8.2. Runbook Đêm Golive — Full Re-run Migration

Chiến lược Full Re-run loại bỏ rủi ro đồng bộ delta (dễ sót UPDATE/DELETE phát sinh trong ngày). Các bước theo thứ tự, có người phụ trách và tiêu chí PASS từng bước:

| # | Bước | Chi tiết |
|---|---|---|
| 1 | **Backup V1 lần cuối** | `pg_dump` đầy đủ V1, cất riêng ngoài hệ thống. Lưới an toàn cuối cùng, độc lập với mọi script rollback. |
| 2 | **Đóng băng V1** | 21:00 (tiệm đóng cửa) — chuyển V1 sang Read-Only (khóa quyền ghi). |
| 3 | **Đối chiếu trước xóa** | Query so sánh giao dịch V2 ↔ V1 (chốt chặn số 2, mục 6). Có dòng lạ → DỪNG, điều tra. |
| 4 | **Làm sạch V2 có chọn lọc** | TRUNCATE **theo danh sách bảng giao dịch nằm cứng trong script** — không gõ tay, không `CASCADE` quét nhầm master data và users đã migrate. |
| 5 | **Chạy migration toàn bộ** | `migrate_v1_to_v2.mjs` từ đầu. Quy mô tiệm sửa xe: 5–10 phút. |
| 6 | **Đối soát tự động** | `verify_migration.mjs` — mọi mục phải PASS. Bất kỳ FAIL nào → xử lý hoặc hoãn Golive, mở lại quyền ghi V1. |
| 7 | **Golive** | Cập nhật `.env.production` trỏ sang Supabase V2, build & deploy. Không dùng cờ localStorage. |
| 8 | **Smoke test** | Đăng nhập bằng tài khoản thật, tạo 1 phiếu sửa chữa + 1 đơn bán lẻ thử, kiểm tra ảnh/file hiển thị (Storage), in hóa đơn — số phiếu không trùng số cũ. |
| 9 | **Giữ nguyên V1 Read-Only** | Không tắt project, không dọn dẹp gì trên V1 trong suốt 72 giờ Hypercare. |

Tổng downtime dự kiến: **dưới 30 phút**.

### 8.3. Diễn Tập Rollback (Rollback Drill) — bắt buộc trước Golive

- Chạy trên **staging với dữ liệu có phát sinh giả lập**: tạo 5–10 giao dịch "sau Golive" trên V2 staging → chạy `rollback_v2_to_v1.mjs` → nghiệm thu bằng đối soát đủ **4 nhóm số: doanh thu, tồn kho, quỹ, công nợ**.
- **Định nghĩa trước tiêu chí kích hoạt rollback:** lỗi loại nào thì rollback (sai lệch tiền/kho không sửa được nhanh, mất khả năng vận hành), loại nào thì sửa nóng trên V2 (lỗi UI, lỗi nhỏ không ảnh hưởng số liệu), và **ai là người quyết định**. Đến lúc sự cố mới bàn thì 72 giờ trôi rất nhanh.
- Thời hạn rollback: **tối đa 72 giờ sau Golive**. Quá hạn, V2 là hệ thống duy nhất.

### 8.4. Hypercare — 7 Ngày Hỗ Trợ Đặc Biệt

- Hỗ trợ kỹ thuật trực tuyến liên tục 7 ngày đầu sau Golive.
- Cam kết phản hồi và sửa lỗi phát sinh tại xưởng trong **5–15 phút**.
- Tính năng báo lỗi nhanh (1-click bug report) cho nhân viên xưởng.
- Trong 72 giờ đầu: theo dõi bảng audit log và job đối soát dual-write hằng ngày.

---

## 9. Lộ Trình Triển Khai (4 Giai Đoạn, 21/07 → 21/08/2026)

### Giai đoạn 1: Chuẩn bị & Database V2 (21/07 – 31/07)

- [x] Tạo nhánh git `feature/v2`, cấu hình repo. *(xong 18/07)*
- [ ] Chạy bộ file `sql/v2_setup/01→08` trên project V2. *(code sẵn sàng, chờ chạy trên Dashboard)*
- [x] **Kiểm kê hạ tầng ngoài bảng** (mục 5) — kết quả tại `docs/infrastructure_checklist_v2.md`: chỉ dùng 1 bucket `images`, 3 bảng Realtime, KHÔNG có Edge Functions/webhooks/pg_cron. *(xong 18/07)*
- [ ] Migrate auth.users (mục 4.1) — verify bằng đăng nhập thật, verify RPC tạm đã DROP.
- [ ] Copy Storage bucket `images` + rewrite URL (SQL mẫu trong `docs/infrastructure_checklist_v2.md`).
- [x] Hoàn thiện `migrate_v1_to_v2.mjs`, `verify_migration.mjs`. *(xong 18/07 — kèm `contract_test_rpc.mjs`)*
- [ ] **Chạy staging migration ngay tuần 1–2** — hướng dẫn 8 bước tại `docs/staging_migration_guide.md`.

### Giai đoạn 2: Tầng dữ liệu Frontend (01/08 – 09/08)

- [x] Custom hooks `src/hooks/v2/useWorkOrderManager.ts`, `src/hooks/v2/useSalesPOS.ts` — khung đã dựng trên repository hooks hiện có; còn TODO chuyển logic chi tiết từ God Components. *(khung xong 18/07)*
- [x] Proxy switcher trong `supabaseClient.ts` + **banner cảnh báo môi trường V2** (`src/components/V2EnvironmentBanner.tsx`). *(xong 18/07)*
- [x] Contract test RPC: `scripts/maintenance/contract_test_rpc.mjs` — so sánh chữ ký RPC hai project qua OpenAPI spec, exit code ≠ 0 nếu lệch. *(✅ đã chạy 19/07: HỢP ĐỒNG KHỚP — toàn bộ 10 RPC frontend gọi đều khớp chữ ký trên V2)*
- [ ] *(Sau Golive)* Tách God Components (`ServiceManager.tsx`, `SalesManager.tsx`) thành sub-components — refactor không đổi hành vi, không nằm trong phạm vi đợt Golive này.

### Giai đoạn 3: Kiểm thử & Tích hợp (10/08 – 17/08)

- [ ] Chạy lại staging migration + `verify_migration.mjs` PASS toàn bộ.
- [ ] Đọc bảng `migration_errors` — xác nhận 498 dòng quick service xử lý đúng, không có lỗi mới.
- [ ] **Rollback Drill** trên staging (mục 8.3) — nghiệm thu 4 nhóm số.
- [ ] Kiểm thử tự động (bộ test hiện có) + kiểm thử thủ công tại xưởng theo checklist kịch bản: nhập hàng → sửa xe → in hóa đơn → trả nợ.
- [ ] Kiểm tra job đối soát dual-write hoạt động.
- [ ] Parallel Run 1 ngày (mục 8.1).

### Giai đoạn 4: Chuyển đổi & Golive (18/08 – 21/08)

- [ ] Thông báo lịch bảo trì (buổi tối, tiệm đóng cửa).
- [ ] Thực thi Runbook Đêm Golive (mục 8.2) — đủ 9 bước theo thứ tự.
- [ ] Hypercare 7 ngày; giữ V1 Read-Only trong 72 giờ đầu.
- [ ] Sau 72 giờ ổn định: gỡ Proxy switcher khỏi code; lên lịch gỡ cột JSONB (mục 3.1).

---

## 10. Bảng Tổng Hợp Rủi Ro & Biện Pháp

| Rủi ro | Mức độ | Biện pháp |
|---|---|---|
| Nhân viên quên tắt cờ V2 → dữ liệu thật bị TRUNCATE | 🔴 Cao | Banner cảnh báo + đối chiếu trước xóa + Golive bằng env (mục 6) |
| RPC `temp_export_users` lộ password hash | 🔴 Cao | REVOKE anon/authenticated + DROP sau dùng + verify `pg_proc` (mục 4.1) |
| ID trùng khi bóc tách JSONB → rơi dữ liệu âm thầm | 🔴 Cao | ID theo index dòng + `migration_errors` thay cho `ON CONFLICT DO NOTHING` (mục 4) |
| Dual-write lệch JSONB ↔ bảng items | 🟡 Trung | Cùng transaction + job đối soát đêm + ngày khai tử JSONB (mục 3.1) |
| Bỏ sót Storage/hạ tầng → ảnh vỡ, job không chạy sau Golive | 🟡 Trung | Checklist kiểm kê mục 5 + smoke test bước 8 runbook |
| Trùng số hóa đơn sau Golive | 🟢 Đã xử lý | ✅ Đã port trigger `trigger_set_sale_code` + hàm `generate_sale_code()` vào `06_sequences_and_triggers.sql` (pass-through khi migration cấp mã, UNIQUE + retry). Không dùng sequence số nên không cần `setval`. |
| Rollback thiếu công nợ & khoản vay | 🟢 Đã xử lý | ✅ `rollback_v2_to_v1.mjs` đã đồng bộ ngược `customer_debts`, `supplier_debts`, `loans`, `loan_payments` (mục 7–9 trong script). |
| Rollback ghi ngược WAC sai | 🟡 Trung | Script copy trực tiếp `costPrice` JSONB mà không tính lại WAC nếu V2 đã nhập hàng trong 72h. Kiểm tra khi nghiệm thu drill. |
| Dữ liệu V1 lỗi định dạng làm migration fail | 🟡 Trung | Staging migration ngay tuần 1–2 + Data Cleaning First |
| Lộ `service_role` key | 🔴 Cao | Không đưa vào tài liệu/commit; `.env` trong `.gitignore`; rotate nếu lộ |

---

## 11. Câu Hỏi Đã Chốt

1. **Môi trường:** Supabase Project mới hoàn toàn ✅ (đổi lại phải migrate auth, Storage, RLS, hạ tầng — đã đưa đủ vào kế hoạch).
2. **Thời gian:** ~4,5 tuần (21/07 → 21/08) + tuần đệm Hypercare. Mốc neo quan trọng nhất: staging migration với dữ liệu thật chạy ngay tuần 1–2.
3. **Chiến lược migration đêm Golive:** Full Re-run (không delta) ✅.
4. **Phạm vi Golive:** chỉ tầng dữ liệu; tách UI components thực hiện sau ✅.
