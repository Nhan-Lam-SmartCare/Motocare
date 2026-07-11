# Runbook — Vá lỗ hổng bảo mật nghiêm trọng (Mục A)

Ngày: 2026-07-09. Áp dụng cho project Supabase `uluxycppxlzdskyklgqt` (production) và `vljriacfxuvtzfbosebx` (demo).

> ⚠️ **Thứ tự bắt buộc:** làm phần 1 (rotate key) TRƯỚC, rồi mới tới các phần khác. Mọi migration SQL **test trên project demo trước**, xác minh app chạy ổn, rồi mới chạy trên production.

---

## Phần 1 — A1: Rotate & purge service_role key (KHẨN CẤP)

Key `SUPABASE_SERVICE_ROLE_KEY` đã bị commit trong `.env` và **push lên GitHub** (`origin` + `demo`) → phải coi như đã lộ. Gỡ khỏi git là chưa đủ; **bắt buộc đổi key**.

1. **Đổi key trên Supabase** (mỗi project): Dashboard → Project Settings → API → **Roll / Reset** `service_role` (và cân nhắc `anon`). Lưu key mới vào nơi bí mật (Vercel/Netlify env, hoặc `.env` local — KHÔNG commit).
2. **Cập nhật nơi dùng key**: biến môi trường trên hosting (Vercel/Netlify) cho `/api/staff-create`; file `.env` local cho các script (`scripts/**`, `scratch/**`). App frontend chỉ dùng anon key nên không ảnh hưởng.
3. **Đã xử lý sẵn (trong commit này):** `.env`, `.env.demo`, `.env.production` đã được `git rm --cached` (gỡ khỏi tracking, file gốc còn trên đĩa) và `.gitignore` đã chặn tái commit. Chỉ còn `.env.example` / `.env.production.example` là template được track.
4. **Commit thay đổi** (đang ở nhánh `main` — cân nhắc tạo nhánh nếu quy trình yêu cầu):
   ```bash
   git add -A
   git commit -m "security: untrack env secrets + backups, add RLS hardening migrations"
   ```
5. **Xóa key khỏi LỊCH SỬ git** (vì key vẫn nằm trong các commit cũ trên GitHub). Dùng `git filter-repo` (khuyến nghị) hoặc BFG:
   ```bash
   # cài git-filter-repo trước
   git filter-repo --path .env --path .env.demo --path .env.production --invert-paths
   git filter-repo --path backups --path scratch --path exports --invert-paths
   # thêm lại remote (filter-repo xoá remote) rồi force-push CẢ HAI remote:
   git remote add origin https://github.com/Nhan-Lam-SmartCare/Motocare.git
   git remote add demo   https://github.com/Nhan-Lam-SmartCare/MotocarePro-demo.git
   git push origin --force --all && git push origin --force --tags
   git push demo   --force --all && git push demo   --force --tags
   ```
   > Force-push viết lại lịch sử — báo cho mọi người cùng làm việc trên repo clone lại. Kể cả sau khi scrub, **key cũ vẫn phải coi là đã lộ** → việc rotate ở bước 1 là bắt buộc, không bỏ qua.

---

## Phần 2 — Áp dụng migration SQL (Supabase SQL Editor)

Chạy trên **demo trước**, kiểm tra, rồi production. Thứ tự:

| Bước | File | Nội dung |
|---|---|---|
| 2.1 | `sql/2026-07-09_A2_fix_profiles_privilege_escalation.sql` | Chặn staff tự đổi `role`/`branch_id` → không tự lên owner được |
| 2.2 | `sql/2026-07-09_A3_reenable_rls_financial_tables.sql` | Bật lại RLS trên bảng tài chính; finance chỉ owner/manager |
| 2.3 | `sql/2026-07-09_A5_public_exposure_hardening.sql` | View `public_parts` (ẩn giá vốn), khóa `external_parts` cho anon, ẩn giá vốn khỏi RPC tra cứu |

Frontend đi kèm (đã sửa sẵn trong repo): `src/pages/shop/ProductCatalog.tsx` giờ đọc `public_parts` thay vì `parts`. Deploy frontend **cùng lúc** với bước 2.3.

---

## Phần 3 — Kiểm tra sau khi áp dụng

**A2 — thử tự nâng quyền (đăng nhập bằng tài khoản STAFF, mở console app):**
```js
const uid = (await supabase.auth.getUser()).data.user.id;
await supabase.from('profiles').update({ role: 'owner' }).eq('id', uid);
// Kỳ vọng: 0 dòng cập nhật / lỗi. (Trước khi vá: role thành 'owner')
```

**A3 — RLS đã bật (chạy bằng owner trong SQL Editor):**
```sql
SELECT relname, relrowsecurity FROM pg_class
WHERE relnamespace='public'::regnamespace
  AND relname IN ('customer_debts','supplier_debts','loans','loan_payments','employees',
  'sales_installments','installment_payments','capital','fixed_assets','fixed_asset_depreciation',
  'cash_transactions','work_orders','inventory_transactions') ORDER BY relname;
-- Tất cả relrowsecurity = true
```
Smoke test app: STAFF vẫn tạo được đơn bán / phiếu sửa chữa (đi qua RPC); màn hình Tài chính/Lương/Công nợ **trống hoặc bị chặn** với staff; owner/manager vẫn xem đủ.

**A5 — giá vốn không lộ:**
```sql
-- anon không còn đọc được cột giá vốn của bảng gốc:
select public.get_public_work_order('<một order id thật>');
-- workOrder.partsused[*] KHÔNG còn 'costPrice'
```
Mở trang shop `/shop` kiểm tra danh sách sản phẩm vẫn hiển thị bình thường.

---

## Phần 4 — Rollback (nếu app hỏng trên demo)

- A3: nếu một bảng vận hành bị khóa nhầm, tạm mở lại: `ALTER TABLE public.<table> DISABLE ROW LEVEL SECURITY;` rồi rà lại policy trước khi bật lại. (Không khuyến khích để tắt lâu.)
- A5: khôi phục shop bằng cách trỏ lại `ProductCatalog` về `parts` + tạm tạo lại policy đọc — nhưng nên sửa view cho đúng thay vì rollback.
- A2: `DROP POLICY "Users can update own profile" ON public.profiles;` rồi tạo lại bản có `WITH CHECK` cho đúng (không quay về bản không có WITH CHECK).

---

## Việc còn lại (khuyến nghị, ngoài phạm vi mục A)

- **Ẩn theo cột cho staff:** `parts.costPrice/wholesalePrice`, lợi nhuận trong `sales` vẫn để authenticated đọc (staff cần `parts`/`sales` cho POS). Nên tách view staff-safe + thu hồi SELECT cột nhạy cảm — cần đổi thêm ở frontend.
- **Chống dò `get_public_work_order`:** thêm yếu tố thứ 2 (biển số / 4 số cuối SĐT) và thu thập trên trang CustomerPortal.
- **Xóa các script tắt RLS khỏi repo** để không ai chạy lại: `disable_rls_for_testing.sql`, `TEMP_disable_rls.sql`, `2025-11-13_disable_employees_rls.sql`, `fix_rls_profiles.sql`, `DEMO_MASTER_SETUP.sql` (phần DISABLE).
