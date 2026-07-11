# Runbook — Toàn vẹn dữ liệu (Mục B)

Ngày: 2026-07-09. **Test trên project demo trước, xác minh, rồi mới production.**

Trạng thái đã xác minh (đọc live qua service-role, 2026-07-09):
- `parts` có **cả hai** cột `reserved` và `reservedstock`; `reservedstock` giữ dữ liệu thật (15 entry), `reserved` **rỗng hoàn toàn**. Frontend chỉ dùng `reservedstock`.
- Kho hiện **không âm**, không có `reserved > stock`.
- `cash_transactions` (3.118 dòng): `paymentsource`/`type` **đã sạch** (chỉ cash/bank, income/expense, 0 null).
- **Số dư lệch lớn:** cash giao dịch cộng dồn = **+302.342.002** nhưng số dư lưu = **−123.799.386**; bank = **−236.228.266** vs lưu **+18.819.696**.

---

## Phần 1 — Áp dụng được NGAY (an toàn, tự bảo vệ)

| Bước | File | Nội dung | Rủi ro |
|---|---|---|---|
| 1.1 | `sql/2026-07-09_B1_consolidate_reserved_column.sql` | Bỏ cột chết `parts.reserved`. **Tự dừng** nếu còn dữ liệu hoặc còn hàm tham chiếu `reserved`. | Thấp (self-guarding) |
| 1.2 | `sql/2026-07-09_B3_cash_transactions_constraints.sql` | NOT NULL + CHECK cho `paymentsource`/`type`/`amount` → khóa chuẩn hóa, chống lệch tương lai. **Tự dừng** nếu có dòng vi phạm. | Thấp (data đã sạch) |

**B5 (đã làm sẵn trong repo):** 11 script nguy hiểm (tắt RLS / xóa dữ liệu / seed demo) đã chuyển vào `sql/_archive_do_not_run/` để không lỡ chạy lên production. Xem `sql/_archive_do_not_run/README.md`.

---

## Phần 2 — Cần bạn chạy DIAGNOSTIC rồi mình hoàn thiện (B2, B4)

Vì thứ tự các file đã chạy không xác định được, **source hàm RPC live không suy ra từ repo được**. Chạy `sql/2026-07-09_B_diagnostics.sql` trong SQL Editor (read-only) và **gửi mình kết quả** — mình sẽ viết patch chính xác:

- **B2 (chặn bán âm):** theo quyết định của bạn — **đơn bán lẻ (sale_create_atomic): chặn cứng khi thiếu hàng**; **phiếu sửa chữa (work_order_*): cho phép đặt trước, KHÔNG kẹp âm về 0** (lưu số thật + cảnh báo). Cần D3/D4 để sửa đúng thân hàm live.
- **B4 (dọn overload):** D1 liệt kê các overload `work_order_complete_payment`. Chữ ký chuẩn frontend đang dùng (named args): `p_order_id, p_payment_method, p_payment_amount, p_user_id`. Mình sẽ viết lệnh drop chính xác các overload thừa.

---

## Phần 3 — B3 (số dư quỹ): forensic, cần bạn quyết

Chuẩn hóa dữ liệu đã xong (Phần 1.2). Còn **số dư âm −124tr (cash)** là vấn đề kế toán, KHÔNG thể "vá" bằng code vì cần con số tiền mặt thực tế của bạn:

- Số dư đang được "ép" khớp bằng `initialBalance` bịa (magic number) trong các file `FIX_CASH_BALANCE_*`, `FIX_INITIAL_*`.
- Cách đúng: xác định **số dư đầu kỳ thật** của quỹ tiền mặt & ngân hàng tại một mốc, rồi để `balance = initialBalance + Σ(giao dịch)`. Nếu vẫn ra âm phi lý → có **giao dịch thu/chi bị thiếu** cần bổ sung.
- Chạy D5 trong diagnostic để xem chênh lệch → suy ra `initialBalance` ngầm định mỗi nguồn. Cho mình biết số tiền mặt/NH thực tế tại mốc gần nhất, mình sẽ viết migration đặt lại `initialBalance` minh bạch (không magic number) + tùy chọn tạo view số dư authoritative.

---

## Kiểm tra sau khi áp dụng Phần 1

```sql
-- B1: cột reserved đã biến mất
SELECT column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='parts' AND column_name IN ('reserved','reservedstock');
-- chỉ còn 'reservedstock'

-- B3: constraint đã có
SELECT conname FROM pg_constraint WHERE conname IN ('cash_tx_type_chk','cash_tx_source_chk');
```
Smoke test app: tạo đơn bán, phiếu sửa chữa, thu/chi tiền — mọi thứ chạy bình thường (B1/B3 phần 1 không đổi logic, chỉ dọn cột chết + khóa giá trị hợp lệ).
