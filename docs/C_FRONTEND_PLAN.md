# Mục C — Kiến trúc & chất lượng frontend

Ngày: 2026-07-10. Trạng thái: đã làm các việc AN TOÀN ngay được; các refactor lớn (C1/C2/C4) được chuẩn hóa thành kế hoạch tăng dần vì đụng nhiều file, cần làm theo lô + test.

## Đã làm trong đợt này (an toàn, build vẫn xanh)
- **Xóa file rác**: `src/components/inventory/hooks/useInventoryManager.ts.backup` (51KB, lẫn trong repo).
- **Bỏ debug log** `console.debug` ở `ReportsManager.tsx` (cảnh báo lint duy nhất) + gỡ import thừa.
- **C3 – rào lint**: thêm `no-restricted-imports` (mức **warn**) chặn UI `import` thẳng `supabaseClient` (`eslint.config.js`). Không phá CI; hiện ~34 chỗ sẽ hiện cảnh báo để migrate dần.
- **C2 – hạ tầng gõ kiểu**: sinh `src/types/database.types.ts` (55 bảng) từ schema live + script tái tạo `scripts/maintenance/gen-supabase-types.mjs`.

## Vì sao chưa bật `createClient<Database>` toàn cục
Đã thử: bật generic làm **typecheck báo 205 lỗi** (chủ yếu: cột JSONB theo chi nhánh `stock/retailPrice...` bị coi là `Json` không index được bằng `[branch]`; và `.rpc()` chưa có type). Bật ngay sẽ phá build. → Đây là **migration nhiều đợt**, không one-shot.

---

## C1 — Bỏ "2 nguồn sự thật" (AppContext localStorage vs react-query)
**Vấn đề:** `src/contexts/AppContext.tsx` (~1018 dòng) giữ cả 15 mảng thực thể (`parts, customers, sales, workOrders, cashTransactions...`) trong `useState` + localStorage (`"motocare-data"`), lại tự `supabase.from(...)` khi mount — song song với lớp react-query. Cùng 1 thực thể tồn tại 2 nơi, không đồng bộ. 45 component đọc từ context.

**Cách làm tăng dần (mỗi thực thể 1 PR, có sẵn hook react-query để thay):**
1. Chọn 1 thực thể ít phụ thuộc trước (vd `categories` hoặc `suppliers`).
2. Thay `useAppContext().categories` bằng hook tương ứng trong `src/hooks/*` (đã tồn tại, dùng `useQuery`).
3. Xóa mảng đó khỏi `AppContext` + khỏi ghi localStorage.
4. Chạy `typecheck` + `test` + click thử màn hình liên quan.
5. Lặp lại cho `parts → customers → sales → workOrders → cashTransactions...` (nặng dần).
6. Cuối cùng `AppContext` chỉ còn state UI (branch hiện tại, menu, cờ hiển thị).

## C2 — Gõ kiểu Supabase (giảm ~1105 `any`)
**Đã có:** `src/types/database.types.ts`.
**Lộ trình an toàn (opt-in, không phá toàn cục):**
1. Trong từng **repository** (`src/lib/repository/*`), import `Database` và ép kiểu cục bộ:
   `const rows = data as Database["public"]["Tables"]["parts"]["Row"][]` thay cho `as any`.
2. Khi 1 repo đã sạch `any`, thay `Result<any>` bằng `Result<Row>` để hook/UI hưởng type.
3. Bổ sung dần khối `Functions` trong `database.types.ts` cho các RPC hay dùng (`sale_create_atomic`, `work_order_complete_payment`...) để `.rpc()` có type.
4. Chỉ khi phần lớn `.from()` đã có type cục bộ mới cân nhắc bật `createClient<Database>` toàn cục (sẽ còn ít lỗi để dọn).
> Regenerate type khi schema đổi: `node scripts/maintenance/gen-supabase-types.mjs`.

## C3 — Ép data-access qua repository (đang là warn)
- 34 component `import` thẳng `supabaseClient` (vd `inventory/InventoryManager.tsx`, `service/ServiceManager.tsx`, `service/components/WorkOrderModal.tsx`, `settings/components/StaffSettings.tsx`).
- Với mỗi chỗ: chuyển truy vấn vào repo `src/lib/repository/*` + hook `src/hooks/*`, rồi component chỉ gọi hook.
- Khi hết cảnh báo, nâng rule từ `warn` → `error` để khóa vĩnh viễn.

## C4 — Component "khổng lồ" & bản sao *Mobile
**Nặng nhất:** `service/ServiceHistory.tsx` (2078), `service/components/WorkOrderModal.tsx` (2036), `service/WorkOrderMobileModal.tsx` (1775), `debt/DebtManager.tsx` (1739), `inventory/hooks/useInventoryManager.ts` (1620). Cộng ~15 cặp `*Mobile` nhân đôi logic.
**Cách làm:**
1. Tách **logic nghiệp vụ** ra hook dùng chung (vd `useWorkOrderForm`) để desktop + mobile xài chung — xóa nhân đôi.
2. Tách khối con render thành component (WorkOrderModal đã có mẫu: `workorder/CustomerVehicleSection.tsx`).
3. Mỗi lần tách 1 mảng, giữ nguyên hành vi, chạy test + click thử. Không đổi hành vi trong lúc tách.

## Ưu tiên đề xuất
C3/C1 trước (giảm rối data-flow, rủi ro thấp khi làm từng thực thể) → C2 (gõ kiểu theo repo) → C4 (tách component, tốn công nhất). Mỗi bước 1 PR nhỏ, test kỹ; không gộp.
