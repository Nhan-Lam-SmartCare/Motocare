# CHECKLIST: Triển khai Fix Logic Ứng Lương

## ✅ ĐÃ HOÀN THÀNH (Tự động)

### 1. Sửa Code Frontend
- ✅ [EmployeeAdvanceManager.tsx](src/components/employee/EmployeeAdvanceManager.tsx)
  - Fixed `handleApprove`: Cập nhật `remaining_amount = 0` và `paid_amount = advance_amount`
  - Fixed `handleMakePayment`: Query lại amounts sau khi trigger chạy
  - Fixed `totalRemaining`: Chỉ tính đơn còn nợ (`remaining_amount > 0`)

- ✅ [EmployeeAdvanceManagerMobile.tsx](src/components/employee/EmployeeAdvanceManagerMobile.tsx)
  - Fixed `handleApprove`: Cập nhật amounts khi duyệt
  - Fixed `totalRemaining`: Logic tính toán chính xác

### 2. Cập nhật Migration Script
- ✅ [migrate_employee_advances.sql](migrate_employee_advances.sql)
  - Thêm UPDATE `remaining_amount = 0` và `paid_amount = advance_amount`
  - Thêm query verify kiểm tra data sau migration

### 3. Tạo Database Trigger Mới
- ✅ [2026-02-20_fix_advance_amounts_on_approve.sql](sql/2026-02-20_fix_advance_amounts_on_approve.sql)
  - Trigger tự động cập nhật amounts khi status = 'paid'
  - Backup layer đảm bảo data consistency

---

## 📋 CẦN LÀM (Thủ công)

### Bước 1: Test trên môi trường Dev (10 phút)

```bash
# 1. Commit code mới
git add .
git commit -m "Fix: Cập nhật logic tính toán ứng lương"

# 2. Test trên localhost
npm run dev

# 3. Test cases:
# - Tạo đơn ứng lương mới
# - Duyệt đơn → Kiểm tra "Còn nợ" phải = 0
# - Trả nợ ứng lương → Kiểm tra amounts cập nhật đúng
# - Kiểm tra "Tổng còn phải thu" hiển thị chính xác
```

### Bước 2: Chạy Database Trigger (5 phút)

**Vào Supabase Dashboard → SQL Editor:**

```sql
-- Copy và chạy file: sql/2026-02-20_fix_advance_amounts_on_approve.sql
-- Hoặc chạy trực tiếp:

CREATE OR REPLACE FUNCTION auto_update_amounts_on_status_paid()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    NEW.remaining_amount = 0;
    NEW.paid_amount = NEW.advance_amount;
    NEW.updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_update_on_paid ON employee_advances;

CREATE TRIGGER trigger_auto_update_on_paid
  BEFORE UPDATE ON employee_advances
  FOR EACH ROW
  WHEN (NEW.status = 'paid' AND OLD.status != 'paid')
  EXECUTE FUNCTION auto_update_amounts_on_status_paid();
```

✅ Verify: `SELECT * FROM pg_trigger WHERE tgname = 'trigger_auto_update_on_paid';`

### Bước 3: Migration Đơn Cũ (5 phút)

**⚠️ LƯU Ý: Chỉ chạy NẾU có đơn đã duyệt cũ chưa update amounts!**

```sql
-- 1. Kiểm tra có đơn cũ không
SELECT COUNT(*) FROM employee_advances 
WHERE status = 'paid' AND remaining_amount > 0;

-- 2. Nếu có, chạy migration script
-- Copy file: migrate_employee_advances.sql
-- Hoặc chạy:

UPDATE employee_advances
SET 
    remaining_amount = 0,
    paid_amount = advance_amount,
    updated_at = NOW()
WHERE status = 'paid' AND remaining_amount > 0;

-- 3. Verify
SELECT 
    COUNT(*) as fixed_count,
    SUM(advance_amount) as total_amount
FROM employee_advances
WHERE status = 'paid' 
    AND remaining_amount = 0 
    AND paid_amount = advance_amount;
```

### Bước 4: Verify Toàn Bộ Hệ Thống (5 phút)

**Kiểm tra:**
1. ✅ Tạo đơn mới → Duyệt → "Còn nợ" = 0
2. ✅ Đơn cũ đã được fix → "Còn nợ" = 0
3. ✅ Báo cáo "Còn phải thu" chính xác
4. ✅ Sổ quỹ đầy đủ phiếu chi

**Query kiểm tra:**
```sql
-- Không được có đơn nào sai
SELECT * FROM employee_advances 
WHERE status = 'paid' 
    AND (remaining_amount != 0 OR paid_amount != advance_amount);
-- Expected: 0 rows

-- Tổng còn phải thu
SELECT 
    SUM(remaining_amount) as total_remaining,
    COUNT(*) as count_with_debt
FROM employee_advances 
WHERE remaining_amount > 0;
```

### Bước 5: Deploy Production (5 phút)

```bash
# 1. Merge code
git push origin main

# 2. Chạy trigger SQL trên production database

# 3. Chạy migration nếu cần

# 4. Monitor logs
```

---

## 🐛 Troubleshooting

### Vấn đề: Trigger không chạy

```sql
-- Kiểm tra trigger có tồn tại không
SELECT * FROM pg_trigger WHERE tgname = 'trigger_auto_update_on_paid';

-- Xóa và tạo lại
DROP TRIGGER IF EXISTS trigger_auto_update_on_paid ON employee_advances;
-- Rồi chạy lại CREATE TRIGGER...
```

### Vấn đề: Migration không update

```sql
-- Kiểm tra đơn nào chưa fix
SELECT id, employee_name, status, remaining_amount, paid_amount 
FROM employee_advances 
WHERE status = 'paid' AND remaining_amount > 0;

-- Fix thủ công từng đơn nếu cần
UPDATE employee_advances 
SET remaining_amount = 0, paid_amount = advance_amount 
WHERE id = 'xxx-xxx-xxx';
```

### Vấn đề: Số liệu vẫn sai sau khi fix

```sql
-- Force refresh data
REFRESH MATERIALIZED VIEW IF EXISTS employee_advances_summary;

-- Clear cache (nếu có)
-- Hoặc hard refresh app (Ctrl+Shift+R)
```

---

## 📊 Timeline

| Bước | Thời gian | Người thực hiện |
|------|-----------|----------------|
| Test Dev | 10 phút | Developer |
| Chạy Trigger | 5 phút | Developer/Admin |
| Migration | 5 phút | Admin |
| Verify | 5 phút | QA/Admin |
| Deploy | 5 phút | DevOps |
| **Tổng** | **30 phút** | |

---

## ✅ Hoàn tất

Sau khi làm xong tất cả, đánh dấu:

- [ ] Code frontend đã fix
- [ ] Trigger database đã tạo
- [ ] Migration đã chạy (nếu có đơn cũ)
- [ ] Test pass 100%
- [ ] Số liệu chính xác
- [ ] Deployed production

**Người thực hiện:** _________________  
**Ngày hoàn thành:** _________________  
**Ghi chú:** _________________
