# Fix: Lỗi Hiển Thị Danh Sách Xe Khách Hàng Sai

## Vấn Đề

Khi mở chi tiết phiếu sửa chữa, danh sách xe hiển thị không đúng - thay vì hiển thị xe của khách hàng trong phiếu, lại hiển thị xe của khách hàng khác.

### Nguyên Nhân

**WorkOrderModal.tsx** (Desktop):
- Logic tìm `currentCustomer` sử dụng thuật toán match `customerPhone` với nhiều điều kiện phức tạp (includes, contains)
- Dẫn đến match nhầm với khách hàng có số điện thoại tương tự
- Không ưu tiên `customerId` đủ cao, dẫn đến có thể fallback sang phone matching khi không cần thiết

**WorkOrderMobileModal.tsx** (Mobile):
- Tìm customer bằng OR logic: `phone === ... || name === ...`
- Nếu phone không khớp nhưng name trùng → match nhầm khách hàng khác cùng tên
- Không ưu tiên `customerId` của work order

### Ví Dụ Lỗi

```
Work Order:
- customerId: "CUST-123"
- customerName: "NGA"
- customerPhone: "0774674335"

Customers trong database:
1. id: "CUST-123", name: "NGA", phone: "0774674335" ✅ ĐÚNG
2. id: "CUST-456", name: "NGA", phone: "0987654321" ❌ Cùng tên

Logic cũ có thể match nhầm customer #2 vì:
- Không ưu tiên customerId
- Match theo name trước
```

## Giải Pháp

### WorkOrderModal.tsx
```typescript
// TRƯỚC:
const customerByPhone = formData.customerPhone
  ? allCustomers.find((c) => {
      // Logic phức tạp với includes(), có thể match nhầm
      return customerPhones.some(cp => 
        searchPhones.some(sp => 
          cp === sp || cp.includes(sp) || sp.includes(cp)
        )
      );
    })
  : undefined;

const currentCustomer = customerById || customerByPhone || null;

// SAU:
const customerById = formData.customerId
  ? allCustomers.find((c) => c.id === formData.customerId)
  : undefined;

// Chỉ tìm theo phone khi KHÔNG có customerId
const customerByPhone = !formData.customerId && formData.customerPhone
  ? allCustomers.find((c) => {
      const normalizePhone = (p: string) => p.replace(/\D/g, "");
      const formPhone = normalizePhone(formData.customerPhone);
      const customerPhones = c.phone.split(",").map(p => normalizePhone(p.trim()));
      // Match HOÀN TOÀN, không dùng includes
      return customerPhones.some(cp => cp === formPhone);
    })
  : undefined;

const currentCustomer = customerById || customerByPhone || null;
```

### WorkOrderMobileModal.tsx
```typescript
// TRƯỚC:
const foundCustomer = customers.find(
  (c) =>
    c.phone === workOrder.customerPhone || c.name === workOrder.customerName
);

// SAU:
// Ưu tiên customerId → phone → name
let foundCustomer = workOrder.customerId
  ? customers.find((c) => c.id === workOrder.customerId)
  : undefined;

if (!foundCustomer && workOrder.customerPhone) {
  foundCustomer = customers.find((c) => c.phone === workOrder.customerPhone);
}

if (!foundCustomer && workOrder.customerName) {
  foundCustomer = customers.find((c) => c.name === workOrder.customerName);
}
```

## Các Cải Tiến

1. **Ưu tiên customerId**: Luôn tìm theo ID trước (unique, tin cậy nhất)
2. **Phone matching chính xác**: Chỉ match khi phone khớp HOÀN TOÀN (không dùng includes/contains)
3. **Tránh fallback không cần thiết**: Nếu có customerId thì KHÔNG fallback sang phone matching
4. **Thứ tự ưu tiên rõ ràng**: ID → Phone → Name (từ tin cậy nhất đến ít tin cậy nhất)

## Kiểm Tra

### Desktop (WorkOrderModal)
1. Mở chi tiết phiếu sửa chữa có `customerId` hợp lệ
2. Kiểm tra danh sách xe hiển thị đúng khách hàng
3. Thử với khách hàng có:
   - Cùng tên nhưng khác phone
   - Phone tương tự (VD: 0987654321 vs 09876543210)

### Mobile (WorkOrderMobileModal)
1. Mở chi tiết phiếu sửa chữa trên mobile
2. Kiểm tra danh sách xe hiển thị đúng
3. Thử với nhiều khách hàng cùng tên

## Files Thay Đổi

- [src/components/service/components/WorkOrderModal.tsx](src/components/service/components/WorkOrderModal.tsx#L478-L502)
- [src/components/service/WorkOrderMobileModal.tsx](src/components/service/WorkOrderMobileModal.tsx#L223-L242)

## Ngày Sửa
30/01/2026
