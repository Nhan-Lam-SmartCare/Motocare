# B3 (phần 2) — Phân tích lệch số dư quỹ & kế hoạch khắc phục

Ngày: 2026-07-09. Trạng thái: **đã chẩn đoán ra gốc rễ**, cần quyết định mô hình + số liệu thật của chủ shop để sửa (không vá mù).

## Số liệu thực tế (đọc live)

| Nguồn | Σ giao dịch (income−expense) | `payment_sources.balance` (đang coi là "đầu kỳ") | App hiển thị = balance + Σ |
|---|---|---|---|
| cash | **+302.342.002** | −123.919.386 | ≈ **+178.4tr** |
| bank | **−236.228.266** | +18.151.696 | ≈ **−218tr** (phi lý) |

`cash_transactions` đã sạch (chỉ cash/bank, income/expense, 0 null — đã khóa bằng constraint ở `B3_cash_transactions_constraints.sql`).

## Gốc rễ: ĐẾM 2 LẦN

Mô hình hiển thị (`src/hooks/useCashBalance.ts`):
```
số dư = payment_sources.balance (coi là ĐẦU KỲ) + Σ(cash_transactions)
```

Nhưng nhiều luồng giao dịch lại **cộng thêm số tiền vào `payment_sources.balance`** mỗi lần phát sinh — ví dụ `src/lib/repository/salesRepository.ts:1039-1057`:
```ts
await createCashTransaction({ amount: sale.cod_amount, ... });   // (1) vào Σ giao dịch
await updatePaymentSourceBalance(paymentSourceId, branchId, sale.cod_amount); // (2) vào "đầu kỳ"
```
→ Cùng một khoản bị tính ở **cả (1) và (2)** → số dư trôi dần. Để "chữa", trước đây phải đặt lại `balance` bằng số bịa (`FIX_CASH_BALANCE_*`, `FIX_INITIAL_*`) cho khớp thực tế tại một thời điểm — rồi lại trôi tiếp.

### Các nơi cộng nhầm vào balance (cần rà & bỏ)
`updatePaymentSourceBalance(delta = số tiền giao dịch)` trên luồng phát sinh:
- `src/lib/repository/salesRepository.ts:1053, 1161`
- `src/contexts/AppContext.tsx:864, 937`
- `src/components/finance/CashBook.tsx:1190`
- `src/components/finance/CashBookMobile.tsx:472`
- `src/components/finance/LoansManager.tsx:450`
- `src/components/payroll/PayrollManager.tsx:220`, `PayrollManagerMobile.tsx:74`
- `src/components/sales/SalesManager.tsx:762`

**GIỮ LẠI** duy nhất chỗ đặt số dư đầu kỳ: `CashBook.tsx:282 handleSaveInitialBalance` (delta = target − current — đây là ý nghĩa đúng của `balance`).

## Kế hoạch khắc phục (đề xuất — cần bạn duyệt)

**Chọn 1 mô hình** (khuyến nghị Mô hình A):

- **Mô hình A — `balance` là SỐ DƯ ĐẦU KỲ thuần** (khớp `useCashBalance` hiện tại):
  1. Bỏ tất cả lời gọi `updatePaymentSourceBalance` trên luồng giao dịch (danh sách trên). Chỉ giữ form "số dư đầu kỳ".
  2. Đối soát 1 lần: `initialBalance = số_thực_tế − Σ(giao dịch)` cho mỗi nguồn.
  3. Từ đó: hiển thị = đầu kỳ + Σ giao dịch = luôn đúng, không magic number.

- **Mô hình B — `balance` là SỐ DƯ RUNNING**: giữ `updatePaymentSourceBalance`, nhưng sửa `useCashBalance` để hiển thị = `balance` (KHÔNG cộng Σ nữa). Ít file frontend hơn nhưng dễ lệch nếu 1 giao dịch quên gọi update.

## Cần bạn cung cấp để đối soát 1 lần
1. **Tiền mặt thực tế trong két** hiện tại: ? đ
2. **Số dư ngân hàng thực tế** hiện tại: ? đ

Với Mô hình A, migration sẽ là (điền số thật vào `:cash_real`, `:bank_real`):
```sql
-- Σ giao dịch tại thời điểm chạy (tự tính, không hardcode):
WITH net AS (
  SELECT paymentsource,
         sum(CASE WHEN type='income' THEN amount ELSE -amount END) AS delta
  FROM public.cash_transactions WHERE branchid = 'CN1' GROUP BY paymentsource
)
UPDATE public.payment_sources ps
SET balance = jsonb_set(COALESCE(ps.balance,'{}'::jsonb), '{CN1}',
      to_jsonb( (CASE ps.id WHEN 'cash' THEN :cash_real WHEN 'bank' THEN :bank_real END)
                - COALESCE((SELECT delta FROM net WHERE net.paymentsource = ps.id), 0) ))
WHERE ps.id IN ('cash','bank');
```
> Chạy migration này CHỈ SAU KHI đã bỏ các lời gọi double-write ở frontend (nếu không sẽ lệch lại).

## Kết luận
Đây là bug kiến trúc, cần: (1) bạn chọn mô hình, (2) mình bỏ double-write ở frontend, (3) bạn cho số tiền thật để đối soát 1 lần. Mình đã chuẩn hóa & khóa dữ liệu (phần 1) — phần này nên làm thành một đợt riêng, có test kỹ vì đụng tiền.
