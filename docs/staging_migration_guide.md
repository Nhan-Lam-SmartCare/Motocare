# Hướng Dẫn Chạy Staging Migration (Tuần 1-2)

**Mục đích:** Chạy thử script migration với dữ liệu thật của V1 trên môi trường staging trước khi Golive. Đây là bước quan trọng nhất để phát hiện sớm vấn đề chất lượng dữ liệu.

---

## Bước 1: Chuẩn Bị Database V2

> 🔄 **Nếu đã lỡ chạy bộ setup phiên bản CŨ** (trước 18/07): bảng đã tạo với
> `CREATE TABLE IF NOT EXISTS` nên chạy đè sẽ KHÔNG cập nhật cột mới.
> Chạy `sql/v2_setup/00_reset_v2.sql` trước (xóa sạch bảng + hàm, GIỮ NGUYÊN
> auth.users và Storage), rồi mới chạy bộ file dưới đây từ đầu.

Vào **Supabase Dashboard V2** → SQL Editor, chạy lần lượt theo thứ tự:

```
sql/v2_setup/01_schema.sql
sql/v2_setup/02_views_and_functions.sql
sql/v2_setup/03_views_and_functions_part2.sql
sql/v2_setup/04_rls_policies.sql
sql/v2_setup/06_sequences_and_triggers.sql
sql/v2_setup/07_dualwrite_reconciliation.sql
sql/v2_setup/08_missing_rpcs.sql
sql/v2_setup/09_auth_profiles.sql
```

> ⚠️ File `05_temp_auth_migration.sql` chạy riêng theo hướng dẫn Bước 2.
> File `09_auth_profiles.sql` tạo bảng `profiles` + `staff_permissions` —
> bắt buộc phải có, nếu thiếu mọi user đăng nhập sẽ thành 'staff' không branch.

---

## Bước 2: Migrate Auth.Users (Giữ Nguyên Password & UUID)

**Trên Supabase V1 (Production) SQL Editor**, chạy phần PART 1 của file:
```
sql/v2_setup/05_temp_auth_migration.sql
```
*(copy từ đầu file đến dòng comment `-- PART 2`)*

**Trên Supabase V2 SQL Editor**, chạy phần PART 2:
*(copy từ dòng comment `-- PART 2` đến cuối file)*

> ✅ Verify ngay: đăng nhập thử vào V2 bằng tài khoản + mật khẩu thật của V1.  
> Script migration sẽ tự DROP 2 RPC này sau khi hoàn thành.

---

## Bước 3: Cấu Hình Realtime Trên V2

Vào **Supabase Dashboard V2** → Database → Replication, bật publication cho:
- `work_orders`
- `sales`  
- `notifications`

---

## Bước 4: Điền Credentials Vào `.env`

Mở file `.env` ở thư mục gốc dự án, bổ sung (không commit file này):

```env
# V1 — đã có sẵn, kiểm tra lại
SUPABASE_URL=https://<V1_PROJECT_REF>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<V1_SERVICE_ROLE_KEY>

# V2 — thêm mới
SUPABASE_URL_V2=https://yxohjuezxrpnijypkeaa.supabase.co
SUPABASE_SERVICE_ROLE_KEY_V2=<LẤY_TỪ_DASHBOARD_V2_Settings_API>

# Cho browser (parallel run)
VITE_SUPABASE_URL_V2=https://yxohjuezxrpnijypkeaa.supabase.co
VITE_SUPABASE_ANON_KEY_V2=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Lấy `SUPABASE_SERVICE_ROLE_KEY_V2` tại:  
`https://supabase.com/dashboard/project/yxohjuezxrpnijypkeaa/settings/api`  
→ mục **Project API keys** → `service_role` → Reveal → Copy

---

## Bước 5: Chạy Staging Migration

```bash
node scripts/maintenance/migrate_v1_to_v2.mjs
```

Script sẽ tự động:
1. Export/import `auth.users` (giữ password hash + UUID)
2. Wipe toàn bộ bảng transaction trên V2 (staging = chạy lại được)
3. Migrate master data (parts, customers, vehicles, suppliers...)
4. Migrate work orders + bóc tách `partsUsed` → `work_order_items`
5. Migrate sales + bóc tách `items` → `sale_items`
6. Migrate các bảng tài chính (cash, inventory, debts, loans...)
7. Reset trigger `sale_code` (tự động qua `06_sequences_and_triggers.sql`)
8. Flush toàn bộ cảnh báo vào bảng `migration_errors`

**Thời gian dự kiến:** 5–15 phút tùy kích thước dữ liệu.

---

## Bước 6: Đối Soát Kết Quả

```bash
node scripts/maintenance/verify_migration.mjs
```

Script in bảng **PASS/FAIL** cho từng hạng mục. Kết quả mẫu kỳ vọng:

```
Hạng mục                                  V1            V2            KQ
--------------------------------------------------------------------------
rows: sales                               1.247         1.247         ✅
rows: work_orders                         3.891         3.891         ✅
...
doanh thu bán lẻ (SUM sales.total)        2.847.350.000 2.847.350.000 ✅
doanh thu sửa chữa (SUM work_orders...)   1.204.750.000 1.204.750.000 ✅
số dư quỹ (payment_sources.balance)       45.200.000    45.200.000    ✅
công nợ khách (remaining_amount)          12.500.000    12.500.000    ✅
công nợ NCC (remaining_amount)            8.750.000     8.750.000     ✅
sale_items (V1 JSONB → V2 rows)           8.432         8.432         ✅
work_order_items (V1 JSONB → V2 rows)     15.673        15.673        ✅
migration_errors (thông tin)              -             498           ✅
    ↳ xem chi tiết trong bảng migration_errors
```

> ✅ **498 dòng** trong `migration_errors` là kết quả đúng — đây là 498 quick service items đã chẩn đoán từ trước (xem mục 2 trong `Ke hoach.md`).

---

## Bước 7: Kiểm Tra Bảng migration_errors

Trên **Supabase Dashboard V2** → Table Editor → `migration_errors`:

- **Kỳ vọng:** 498 dòng với `reason = 'orphan_part_id_quick_service'`
- **Cờ đỏ:** Bất kỳ dòng nào có `severity = 'error'` hoặc `reason` khác với `orphan_part_id_quick_service` → điều tra ngay

---

## Bước 8: Copy Storage Bucket

1. Vào **Supabase Dashboard V1** → Storage → bucket `images` → Download/Export
2. Vào **Supabase Dashboard V2** → Storage → tạo bucket `images` (public) → Upload
3. Sau khi upload xong, chạy SQL rewrite URL (xem [docs/infrastructure_checklist_v2.md](infrastructure_checklist_v2.md) mục 1)

---

## Checklist Hoàn Thành Staging

- [ ] Đã chạy 6 file SQL setup trên V2
- [ ] Auth migration thành công — đăng nhập thật được trên V2
- [ ] `node scripts/maintenance/migrate_v1_to_v2.mjs` chạy không có lỗi `ERROR`
- [ ] `node scripts/maintenance/verify_migration.mjs` — tất cả PASS
- [ ] `migration_errors` chỉ có 498 dòng quick service, không có `severity=error` lạ
- [ ] Storage bucket `images` đã copy, URL đã rewrite
- [ ] Realtime đã bật cho 3 bảng
- [ ] Thử bật cờ V2 trên browser, banner đỏ hiện, đăng nhập được, tạo thử 1 phiếu

---

## Nếu Có Lỗi

| Triệu chứng | Nguyên nhân phổ biến | Cách xử lý |
|---|---|---|
| `verify_migration` FAIL ở `rows: sales` | Wipe chưa sạch hoặc FK constraint cản insert | Kiểm tra log script, chạy lại từ đầu |
| `sale_items` lệch nhiều | Có `sales.items` là NULL hoặc không phải array | Chạy `SELECT id FROM sales WHERE jsonb_typeof(items) <> 'array'` trên V1 |
| Auth migration lỗi `permission denied` | REVOKE chưa có, chạy bằng tài khoản thiếu quyền | Đảm bảo chạy SQL bằng `postgres` role trên Dashboard |
| `SUPABASE_SERVICE_ROLE_KEY_V2 missing` | Chưa điền vào `.env` | Xem lại Bước 4 |
