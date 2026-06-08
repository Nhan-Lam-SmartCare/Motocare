# Fix: Phiếu Sửa Chữa Không Tự Động Hiển Thị Sau Khi Tạo

## Vấn Đề

Sau khi tạo phiếu sửa chữa mới, phiếu không hiển thị ngay trên danh sách. Người dùng phải bấm nút "Đồng bộ" thủ công mới thấy phiếu vừa tạo.

## Nguyên Nhân

Trong `WorkOrderModal.tsx`, có 3 flows xử lý lưu phiếu:

1. **handleSaveOnly()** - Lưu phiếu không thanh toán ✅ Có gọi `invalidateWorkOrders()`
2. **handleSave() - UPDATE flow** - Cập nhật phiếu cũ ✅ Có gọi `invalidateWorkOrders()` 
3. **handleSave() - CREATE flow** - Tạo phiếu mới với thanh toán ❌ **THIẾU** `invalidateWorkOrders()`
4. **handleDeposit()** - Tạo phiếu đặt cọc ❌ **THIẾU** `invalidateWorkOrders()`

### Code Lỗi

```typescript
// CREATE flow (dòng 2165)
// Call onSave to update the workOrders state
onSave(finalOrder);  // ❌ Chỉ gọi onSave, không gọi invalidateWorkOrders

// FIX: Nếu tạo phiếu mới với paymentStatus = 'paid'...
if (paymentStatus === "paid" && selectedParts.length > 0) {
  // ...
}

// Close modal after successful save
clearDraft();
onClose();  // ❌ Đóng modal mà không invalidate
```

### Tại Sao Vấn Đề Xảy Ra?

- React Query cache không được invalidate sau khi tạo phiếu mới
- Component không biết cần refetch data từ server
- Danh sách phiếu sửa chữa vẫn hiển thị data cũ từ cache
- Chỉ khi người dùng bấm "Đồng bộ" (refresh) thì mới gọi `refetch()` để load data mới

## Giải Pháp

### 1. CREATE Flow (Tạo Phiếu Mới Có Thanh Toán)

```typescript
// TRƯỚC:
onSave(finalOrder);

// SAU:
// 🔹 Invalidate queries để refresh danh sách ngay
if (invalidateWorkOrders) {
  invalidateWorkOrders();
}

onSave(finalOrder);
```

### 2. CREATE Flow - Trước Khi Đóng Modal

```typescript
// TRƯỚC:
// Close modal after successful save
clearDraft();
onClose();

// SAU:
// 🔹 Invalidate queries trước khi đóng modal để đảm bảo data mới được fetch
if (invalidateWorkOrders) {
  invalidateWorkOrders();
}

// Close modal after successful save
clearDraft();
onClose();
```

### 3. Deposit Flow (Đặt Cọc)

```typescript
// TRƯỚC:
workOrderData.depositTransactionId = depositTxId;
onSave(workOrderData);

showToast.success("Đã đặt cọc thành công!");
clearDraft();
onClose();

// SAU:
workOrderData.depositTransactionId = depositTxId;

// 🔹 Invalidate queries để refresh danh sách
if (invalidateWorkOrders) {
  invalidateWorkOrders();
}

onSave(workOrderData);

showToast.success("Đã đặt cọc thành công!");
clearDraft();
onClose();
```

## Cơ Chế Hoạt Động

### invalidateWorkOrders()

Function này được truyền từ `ServiceManager.tsx`:

```typescript
<WorkOrderModal
  // ...
  invalidateWorkOrders={() =>
    queryClient.invalidateQueries({ queryKey: ["workOrdersRepo"] })
  }
/>
```

Khi gọi, nó sẽ:
1. Đánh dấu cache của query `workOrdersRepo` là stale (cũ)
2. React Query tự động trigger refetch data mới từ server
3. Component ServiceManager tự động re-render với data mới
4. Danh sách phiếu sửa chữa cập nhật ngay lập tức

### So Sánh Với handleSaveOnly()

```typescript
// handleSaveOnly() - ĐÃ CÓ invalidateWorkOrders từ trước
async handleSaveOnly() {
  // ... save logic ...
  
  // Invalidate queries to refresh the list
  if (invalidateWorkOrders) {
    invalidateWorkOrders();  // ✅ Có sẵn
  }

  onSave(workOrderData);
  showToast.success("Đã lưu phiếu thành công");
  clearDraft();
  onClose();
}
```

## Kiểm Tra

### Desktop (WorkOrderModal)

1. **Tạo phiếu mới không thanh toán**
   - Nhập thông tin → Bấm "Lưu Phiếu"
   - ✅ Phiếu hiển thị ngay trên danh sách

2. **Tạo phiếu mới có thanh toán**
   - Nhập thông tin + thanh toán đủ → Bấm "Thanh toán"
   - ✅ Phiếu hiển thị ngay trên danh sách

3. **Tạo phiếu đặt cọc**
   - Nhập thông tin + đặt cọc → Bấm "Đặt cọc"
   - ✅ Phiếu hiển thị ngay trên danh sách

4. **Cập nhật phiếu cũ**
   - Mở phiếu → Sửa → Lưu
   - ✅ Thay đổi hiển thị ngay

### Mobile (WorkOrderMobileModal)

Mobile modal không bị vấn đề này vì `ServiceManager.legacy.tsx` đã gọi `invalidateQueries` trong `handleMobileSave`:

```typescript
// handleMobileSave() - ĐÃ ĐÚNG
// 🔄 Force refresh data immediately after save
queryClient.invalidateQueries({ queryKey: ["workOrdersRepo"] });
queryClient.invalidateQueries({ queryKey: ["workOrdersFiltered"] });
```

## Lợi Ích

✅ **Không cần đồng bộ thủ công**: Phiếu hiển thị ngay sau khi tạo  
✅ **UX tốt hơn**: Người dùng thấy kết quả ngay lập tức  
✅ **Ít lỗi**: Tránh trường hợp người dùng tưởng phiếu không được lưu  
✅ **Nhất quán**: Tất cả flows đều tự động refresh giống nhau

## Files Thay Đổi

- [src/components/service/components/WorkOrderModal.tsx](src/components/service/components/WorkOrderModal.tsx)
  - Dòng ~2165: Thêm `invalidateWorkOrders()` trong CREATE flow
  - Dòng ~2218: Thêm `invalidateWorkOrders()` trước khi đóng modal  
  - Dòng ~1307: Thêm `invalidateWorkOrders()` trong deposit flow

## Ngày Sửa

30/01/2026
