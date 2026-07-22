# Checklist Kiểm Kê Hạ Tầng V1 → V2

**Ngày kiểm kê:** 18/07/2026  
**Trạng thái:** Dựa trên scan tự động codebase + SQL files

---

## 1. Supabase Storage

| Bucket | Đang dùng | Nội dung | Việc cần làm |
|---|---|---|---|
| `images` | ✅ Có | Ảnh phụ tùng (`parts.image_url`), ảnh logo/QR cửa hàng (`store_settings.logo_url`), ảnh khuyến mãi (`promotions.image_url`), ảnh gallery (`gallery.image_url`) | Copy toàn bộ bucket `images` từ V1 sang V2. **Không cần rewrite URL trong database** vì Supabase tạo public URL theo `project_ref` — sau khi copy, URL sẽ khác domain. Cần update tất cả `image_url` / `logo_url` trong database V2 sau migration. |

**Cách rewrite URL sau migration:**

> ⚠️ **Đã sửa 19/07/2026:** bản cũ ghi project ref V2 là `yxohjuezxrpnijypkeaa` — **SAI**. Project V2 thực tế (theo `.env` và Dashboard) là `qogpizqgocghmbxtrfdu`; V1 là `uluxycppxlzdskyklgqt`. Chạy các câu dưới đây trên **SQL Editor của V2**.

```sql
-- Thay project ref V1 bằng project ref V2 trong tất cả các cột URL
UPDATE public.parts
SET image_url = REPLACE(image_url,
  'https://uluxycppxlzdskyklgqt.supabase.co/storage/v1/object/public/',
  'https://qogpizqgocghmbxtrfdu.supabase.co/storage/v1/object/public/')
WHERE image_url IS NOT NULL;

UPDATE public.store_settings
SET logo_url = REPLACE(logo_url, 'uluxycppxlzdskyklgqt', 'qogpizqgocghmbxtrfdu')
WHERE logo_url IS NOT NULL;

UPDATE public.promotions
SET image_url = REPLACE(image_url, 'uluxycppxlzdskyklgqt', 'qogpizqgocghmbxtrfdu')
WHERE image_url IS NOT NULL;

UPDATE public.gallery
SET image_url = REPLACE(image_url, 'uluxycppxlzdskyklgqt', 'qogpizqgocghmbxtrfdu')
WHERE image_url IS NOT NULL;
```

---

## 2. Edge Functions

| Function | Đang dùng | Việc cần làm |
|---|---|---|
| *(không có)* | ❌ Không tìm thấy thư mục `supabase/functions/` | **Không cần làm gì** |

---

## 3. Realtime (Postgres Changes)

| Channel | Table lắng nghe | Component sử dụng | Việc cần làm |
|---|---|---|---|
| `work_orders_debt_changes` | `work_orders` | `DebtManager.tsx` | Bật Realtime cho `work_orders` trên V2 |
| `sales_debt_changes` | `sales` | `DebtManager.tsx` | Bật Realtime cho `sales` trên V2 |
| `sales_realtime` | `sales` | `SalesManager.tsx` | *(bao gồm ở trên)* |
| `notifications-realtime` | `notifications` | `useNotifications.ts` | Bật Realtime cho `notifications` trên V2 |
| `work-orders-realtime-channel` | `work_orders` | `useWorkOrdersRealtime.ts` | *(bao gồm ở trên)* |
| `customer-portal-*` | `work_orders` | `CustomerPortal.tsx` | *(bao gồm ở trên)* |

**Việc cần làm trên Supabase Dashboard V2:**  
Database → Replication → Bật Realtime publication cho các bảng: `work_orders`, `sales`, `notifications`.

---

## 4. Database Webhooks

| Webhook | Đang dùng | Việc cần làm |
|---|---|---|
| *(không tìm thấy `pg_net` hay `http` call trong SQL)* | ❌ Không có | **Không cần làm gì** |

---

## 5. pg_cron Jobs

| Job | Đang dùng | Việc cần làm |
|---|---|---|
| *(không tìm thấy `cron.schedule()` trong SQL files)* | ❌ Không có pg_cron thật | **Không cần làm gì** ngay. Sau Golive cần tạo job đối soát dual-write (mục 3.1 trong `Ke hoach.md`) |

---

## 6. Cấu hình Auth (Supabase Dashboard)

| Hạng mục | Cần kiểm tra & cấu hình lại trên V2 |
|---|---|
| **SMTP / Email provider** | Cấu hình lại nếu dùng SMTP tùy chỉnh |
| **Redirect URLs** | Thêm domain production vào Allow list |
| **Site URL** | Set đúng URL production |
| **Email templates** | Copy nội dung template từ V1 nếu đã tùy chỉnh |
| **Auth providers** | Kiểm tra có dùng Google/Facebook login không |

---

## 7. Tóm Tắt Việc Cần Làm Trước Golive

- [ ] Copy bucket `images` từ V1 sang V2 — chạy `node scripts/maintenance/copy_storage_v1_to_v2.mjs` (idempotent, có `--dry-run`; dry-run 19/07 cho thấy 55 file cần copy, bucket V2 sẽ được tạo tự động)
- [ ] Sau migration chạy 4 câu UPDATE rewrite URL ảnh (mục 1 trên — đã điền sẵn project ref thật)
- [ ] Bật Realtime cho 3 bảng: `work_orders`, `sales`, `notifications` (Dashboard → Database → Replication)
- [ ] Cấu hình Auth: Site URL, Redirect URLs, SMTP nếu cần (Dashboard → Authentication → Settings)
- [ ] **Không cần** setup Edge Functions, Database Webhooks, hay pg_cron (không dùng)
