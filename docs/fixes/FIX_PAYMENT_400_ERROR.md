# 🔧 SỬA LỖI 400 KHI THANH TOÁN PHIẾU SỬA CHỮA

## 🐛 VẤN ĐỀ

Khi thanh toán phiếu sửa chữa, gặp lỗi:
```
Failed to load resource: the server responded with a status of 400 ()
[CompleteOrderPayment] Invalid RPC result: Object
```

## 🔍 NGUYÊN NHÂN

Function `work_order_complete_payment` trong database trả về sai format:

**❌ Format cũ (SAI):**
```json
{
  "success": true,
  "orderId": "SC-xxx",
  "paymentStatus": "paid",
  "totalPaid": 150000,
  "remainingAmount": 0,
  "inventoryDeducted": true,
  "paymentTransactionId": "uuid"
}
```

**✅ Format đúng (mà TypeScript code expect):**
```json
{
  "workOrder": { ...toàn bộ data phiếu sửa chữa... },
  "paymentTransactionId": "uuid",
  "newPaymentStatus": "paid",
  "inventoryDeducted": true
}
```

TypeScript code trong [workOrdersRepository.ts](src/lib/repository/workOrdersRepository.ts#L797-L820) đang tìm property `workOrder`:
```typescript
const workOrderRow = (data as any).workOrder as WorkOrder | undefined;
const paymentTransactionId = (data as any).paymentTransactionId as string | undefined;
const newPaymentStatus = (data as any).newPaymentStatus as string | undefined;
const inventoryDeducted = (data as any).inventoryDeducted as boolean | undefined;

if (!workOrderRow) {
  console.error("[completeWorkOrderPayment] Invalid RPC result:", { data, orderId, paymentMethod, paymentAmount });
  return failure({
    code: "unknown",
    message: `Kết quả RPC không hợp lệ...`,
  });
}
```

## ✅ GIẢI PHÁP

### Bước 1: Chạy SQL Script

1. Mở **Supabase Dashboard** → **SQL Editor**
2. Copy toàn bộ nội dung file [sql/RUN_THIS_FIX.sql](sql/RUN_THIS_FIX.sql)
3. Paste vào SQL Editor
4. Click **RUN**

Script này sẽ:
- ✅ Tạo cột `inventory_deducted` nếu chưa có
- ✅ Cập nhật function `work_order_complete_payment` để trả về đúng format
- ✅ Sửa các phiếu đã thanh toán nhưng chưa trừ kho (nếu có)

### Bước 2: Kiểm tra

Sau khi chạy script, bạn sẽ thấy output:
```
========================================
📊 BÁO CÁO KẾT QUẢ
========================================
✅ Đã sửa thành công: X phiếu
========================================
```

### Bước 3: Test lại

1. **Refresh** lại website (Ctrl+F5)
2. Thử thanh toán phiếu sửa chữa
3. Kiểm tra xem lỗi còn xuất hiện không

## 📝 THAY ĐỔI CHI TIẾT

### File đã sửa: `sql/RUN_THIS_FIX.sql`

**Thay đổi dòng 358-372:**

```sql
-- TRƯỚC:
UPDATE work_orders
SET ...
WHERE id = p_order_id;

RETURN jsonb_build_object(
  'success', true,
  'orderId', p_order_id,
  'paymentStatus', v_new_status,
  ...
);

-- SAU:
UPDATE work_orders
SET ...
WHERE id = p_order_id
RETURNING * INTO v_order;  -- ✅ Lấy toàn bộ data phiếu

RETURN jsonb_build_object(
  'workOrder', row_to_json(v_order),  -- ✅ Trả về object phiếu
  'paymentTransactionId', v_payment_tx_id,
  'newPaymentStatus', v_new_status,
  'inventoryDeducted', v_should_deduct_inventory
);
```

## 🧪 TEST

Sau khi chạy script, test các trường hợp:

1. ✅ Thanh toán phiếu mới (chưa thanh toán gì)
2. ✅ Thanh toán tiếp phiếu đã đặt cọc (partial → paid)
3. ✅ Kiểm tra kho có bị trừ đúng không
4. ✅ Kiểm tra cash transactions có được tạo không

## 🔗 FILES LIÊN QUAN

- [sql/RUN_THIS_FIX.sql](sql/RUN_THIS_FIX.sql) - Script sửa lỗi
- [src/lib/repository/workOrdersRepository.ts](src/lib/repository/workOrdersRepository.ts#L720-L846) - Function gọi RPC
- [src/components/service/components/WorkOrderModal.tsx](src/components/service/components/WorkOrderModal.tsx#L2165-L2188) - UI thanh toán

## ⚠️ LƯU Ý

- Script này **an toàn** và có thể chạy nhiều lần
- Nếu đã chạy rồi, chạy lại cũng không sao
- Script sẽ tự động bỏ qua các phiếu đã được xử lý

## 📞 HỖ TRỢ

Nếu vẫn gặp lỗi sau khi chạy script:
1. Kiểm tra console log để xem error message chi tiết
2. Kiểm tra Supabase logs
3. Đảm bảo user có quyền `authenticated` để execute function
