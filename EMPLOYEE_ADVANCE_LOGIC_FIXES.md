# PHÂN TÍCH VÀ ĐỀ XUẤT CẢI THIỆN HỆ THỐNG ỨNG LƯƠNG

## 🔴 CÁC VẤN ĐỀ PHÁT HIỆN

### 1. **BUG NGHIÊM TRỌNG: remaining_amount không được cập nhật khi duyệt đơn**

**Tình huống:**
- Tạo đơn ứng lương 7,000,000đ → `remaining_amount = 7,000,000đ`
- Duyệt đơn → `status = "paid"` NHƯNG `remaining_amount` vẫn = 7,000,000đ (!!)
- Hệ thống hiển thị: "Đã chi trả" nhưng "Còn nợ: 7,000,000đ" ❌

**Nguyên nhân:**
```typescript
// handleApprove - CHỈ cập nhật status
await updateAdvance({
  id: advanceId,
  updates: {
    status: "paid",
    approvedBy: profile.full_name,
    approvedDate: new Date().toISOString(),
    // ❌ THIẾU: remaining_amount: 0
    // ❌ THIẾU: paid_amount: advance.advanceAmount
  },
});
```

**Ảnh hưởng:**
- ✅ Phiếu chi được tạo đúng
- ✅ Sổ quỹ chính xác
- ❌ Số liệu hiển thị SAI: "Còn phải thu" vẫn tính đơn đã chi
- ❌ Không theo dõi được tiến độ trả nợ

---

### 2. **Trigger database thiếu logic xử lý khi duyệt đơn**

**Trigger hiện tại:**
```sql
CREATE TRIGGER trigger_update_advance_on_payment
  AFTER INSERT ON employee_advance_payments  -- ❌ Chỉ chạy khi insert payment
  FOR EACH ROW
  EXECUTE FUNCTION update_advance_amounts_on_payment();
```

**Vấn đề:**
- Trigger CHỈ chạy khi nhân viên TRẢ NỢ (insert vào `employee_advance_payments`)
- KHÔNG chạy khi DUYỆT ĐƠN (chỉ update `employee_advances`)
- Dẫn đến dữ liệu không nhất quán

**Cần thêm:**
- Trigger khi UPDATE status = 'paid' → Tự động set `remaining_amount = 0`

---

### 3. **Logic kiểm tra trả hết nợ có race condition**

**Code hiện tại:**
```typescript
// Trigger đã UPDATE remaining_amount trong database
await supabase.from("employee_advance_payments").insert(...);

// ❌ Tính toán trên dữ liệu CŨ (trước khi trigger chạy)
const newRemainingAmount = selectedAdvance.remainingAmount - amount;
if (newRemainingAmount <= 0) {
  await supabase.from("employee_advances").update({ status: "paid" })
}
```

**Vấn đề:**
- `selectedAdvance.remainingAmount` là giá trị CŨ từ state
- Trigger đã UPDATE `remaining_amount` mới trong database
- So sánh có thể SAI!

**Giải pháp:**
- Query lại `remaining_amount` mới từ database SAU khi trigger chạy
- Hoặc để trigger tự động UPDATE status

---

### 4. **Migration script thiếu cập nhật remaining_amount**

**Script hiện tại:**
```sql
-- Tạo phiếu chi ✅
INSERT INTO cash_transactions ...

-- Update status ✅
UPDATE employee_advances SET status = 'paid' WHERE status = 'approved';

-- ❌ THIẾU: Set remaining_amount = 0, paid_amount = advance_amount
```

**Hậu quả:**
- Các đơn cũ migration xong vẫn có `remaining_amount > 0`
- Dẫn đến số liệu báo cáo SAI

---

### 5. **Tính toán "Còn phải thu" không chính xác**

**Code hiện tại:**
```typescript
const totalRemaining = useMemo(() => {
  return advances
    .filter((adv) => adv.status === "paid" || adv.status === "approved") // ❌ Cả "paid"?
    .reduce((sum, adv) => sum + adv.remainingAmount, 0);
}, [advances]);
```

**Vấn đề:**
- Lọc cả đơn `status = "paid"` để tính "Còn phải thu"
- Nhưng với bug #1, đơn "paid" vẫn có `remaining_amount > 0`
- Dẫn đến SỐ LIỆU SAI HOÀN TOÀN!

**Logic đúng:**
- Chỉ tính đơn `status = "paid"` VÀ `remaining_amount > 0`
- Hoặc chỉ tính approved (chưa chi)

---

## ✅ ĐỀ XUẤT GIẢI PHÁP HOÀN CHỈNH

### **Giải pháp 1: Sửa handleApprove (QUAN TRỌNG NHẤT)**

```typescript
const handleApprove = async (advanceId: string) => {
  const advance = advances.find((a) => a.id === advanceId);
  if (!advance) return;

  try {
    // 1. Update đơn: status + remaining/paid amounts
    await updateAdvance({
      id: advanceId,
      updates: {
        status: "paid",
        approvedBy: profile.full_name || profile.email,
        approvedDate: new Date().toISOString(),
        // ✅ THÊM: Cập nhật remaining và paid amounts
        remainingAmount: 0,
        paidAmount: advance.advanceAmount,
      },
    });

    // 2. Tạo phiếu chi...
    // (giữ nguyên code hiện tại)
  } catch (error) {
    console.error("Error approving advance:", error);
    showToast.error("Có lỗi khi duyệt ứng lương");
  }
};
```

**Lợi ích:**
- ✅ Đảm bảo dữ liệu nhất quán ngay khi duyệt
- ✅ Không phụ thuộc vào trigger
- ✅ Đơn giản, dễ debug

---

### **Giải pháp 2: Thêm trigger UPDATE status = 'paid'**

```sql
-- Trigger tự động set remaining_amount = 0 khi status = 'paid'
CREATE OR REPLACE FUNCTION auto_update_amounts_on_status_paid()
RETURNS TRIGGER AS $$
BEGIN
  -- Khi status chuyển thành 'paid', tự động set amounts
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    NEW.remaining_amount = 0;
    NEW.paid_amount = NEW.advance_amount;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_update_on_paid
  BEFORE UPDATE ON employee_advances
  FOR EACH ROW
  WHEN (NEW.status = 'paid' AND OLD.status != 'paid')
  EXECUTE FUNCTION auto_update_amounts_on_status_paid();
```

**Lợi ích:**
- ✅ Đảm bảo data consistency ở tầng database
- ✅ Tự động áp dụng cho mọi UPDATE (từ app, SQL, API)
- ✅ Backup layer nếu frontend quên cập nhật

---

### **Giải pháp 3: Sửa logic kiểm tra trả hết nợ**

```typescript
const handleMakePayment = async () => {
  const amount = parseFloat(paymentAmount);
  
  try {
    // 1. Tạo payment record (trigger sẽ tự động update amounts)
    await supabase.from("employee_advance_payments").insert({...});

    // 2. Tạo phiếu thu
    await supabase.from("cash_transactions").insert({...});

    // 3. ✅ Query lại remaining_amount MỚI từ database
    const { data: updatedAdvance } = await supabase
      .from("employee_advances")
      .select("remaining_amount")
      .eq("id", selectedAdvance.id)
      .single();

    // 4. Kiểm tra nếu đã trả hết → đổi status
    if (updatedAdvance && updatedAdvance.remaining_amount <= 0) {
      await supabase
        .from("employee_advances")
        .update({ status: "paid" })
        .eq("id", selectedAdvance.id);
    }

    // Refresh data...
  } catch (error) {
    showToast.error("Đã xảy ra lỗi");
  }
};
```

---

### **Giải pháp 4: Sửa migration script**

```sql
-- Migration Script - PHIÊN BẢN CẢI THIỆN

-- Bước 1: Tạo phiếu chi
INSERT INTO cash_transactions (...) ...

-- Bước 2: Update status VÀ amounts
UPDATE employee_advances
SET 
    status = 'paid',
    remaining_amount = 0,              -- ✅ THÊM
    paid_amount = advance_amount,      -- ✅ THÊM
    updated_at = NOW()
WHERE status = 'approved';

-- Bước 3: Verify
SELECT 
    id,
    employee_name,
    advance_amount,
    remaining_amount,  -- Phải = 0
    paid_amount,       -- Phải = advance_amount
    status             -- Phải = 'paid'
FROM employee_advances
WHERE status = 'paid' AND remaining_amount > 0;  -- Không được có record nào
```

---

### **Giải pháp 5: Sửa logic tính "Còn phải thu"**

```typescript
const totalRemaining = useMemo(() => {
  return advances
    // ✅ CHỈ tính đơn "paid" còn nợ (trả góp) HOẶC đơn "approved" chưa chi
    .filter((adv) => 
      (adv.status === "paid" && adv.remainingAmount > 0) || // Đang trả góp
      adv.status === "approved"  // Chưa chi tiền
    )
    .reduce((sum, adv) => sum + adv.remainingAmount, 0);
}, [advances]);

// HOẶC đơn giản hơn: Chỉ cần lọc remaining > 0
const totalRemaining = useMemo(() => {
  return advances
    .filter((adv) => adv.remainingAmount > 0)  // ✅ Đơn giản, chính xác
    .reduce((sum, adv) => sum + adv.remainingAmount, 0);
}, [advances]);
```

---

## 🎯 KẾ HOẠCH TRIỂN KHAI

### **Bước 1: Sửa code frontend (QUAN TRỌNG)**
1. ✅ Sửa `handleApprove` cập nhật `remaining_amount` và `paid_amount`
2. ✅ Sửa `handleMakePayment` query lại amounts sau khi insert payment
3. ✅ Sửa `totalRemaining` chỉ lọc `remaining_amount > 0`

### **Bước 2: Sửa migration script**
1. ✅ Thêm UPDATE `remaining_amount = 0` và `paid_amount = advance_amount`
2. ✅ Chạy lại script trong Supabase

### **Bước 3: Thêm trigger database (Optional nhưng nên làm)**
1. ✅ Tạo trigger tự động update amounts khi status = 'paid'
2. ✅ Đảm bảo data consistency ở tầng database

### **Bước 4: Testing**
1. ✅ Test tạo đơn mới → duyệt → kiểm tra amounts
2. ✅ Test trả góp → kiểm tra amounts và status
3. ✅ Verify số liệu "Còn phải thu"

---

## 📊 SO SÁNH TRƯỚC/SAU

### **TRƯỚC (Có bug):**
```
1. Tạo đơn 7,000,000đ
   → remaining_amount = 7,000,000đ ✅
   
2. Duyệt đơn
   → status = "paid" ✅
   → remaining_amount = 7,000,000đ ❌ (KHÔNG đổi!)
   → Hiển thị: "Đã chi trả, còn nợ 7,000,000đ" ❌
   
3. Báo cáo "Còn phải thu"
   → Tính cả đơn "paid" → SAI ❌
```

### **SAU (Đã sửa):**
```
1. Tạo đơn 7,000,000đ
   → remaining_amount = 7,000,000đ ✅
   
2. Duyệt đơn
   → status = "paid" ✅
   → remaining_amount = 0 ✅
   → paid_amount = 7,000,000đ ✅
   → Hiển thị: "Đã chi trả, còn nợ 0đ" ✅
   
3. Báo cáo "Còn phải thu"
   → Chỉ tính đơn còn nợ → CHÍNH XÁC ✅
```

---

## ⚠️ LƯU Ý QUAN TRỌNG

1. **Sửa migration script TRƯỚC KHI chạy** - Nếu đã chạy script cũ, cần chạy lại với logic mới
2. **Test kỹ trên môi trường dev** trước khi deploy production
3. **Backup database** trước khi chạy migration
4. **Thông báo user** nếu có downtime khi migration

---

## 🏆 KẾT LUẬN

Sau khi sửa, hệ thống sẽ:
- ✅ Dữ liệu chính xác 100%
- ✅ Không còn bug hiển thị sai
- ✅ Báo cáo đáng tin cậy
- ✅ Dễ bảo trì và mở rộng

**Ưu tiên:** Sửa handleApprove và migration script NGAY để đảm bảo dữ liệu đúng!
