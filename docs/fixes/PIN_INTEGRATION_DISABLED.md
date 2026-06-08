# Pin Integration - Tạm Vô Hiệu Hóa

**Ngày:** February 13, 2026  
**Lý do:** Tách biệt dữ liệu để sửa chính xác Sổ Quỹ trước khi sync với Pin

---

## ✅ Những gì đã vô hiệu hóa

### 1. **FinanceManager.tsx** (Desktop)
- ❌ Removed tab "Tổng hợp" (combined)
- ❌ Commented out `import CombinedFinance`
- ✅ Changed default tab: `"combined"` → `"cashbook"`
- ✅ Commented out render: `{activeTab === "combined" && <CombinedFinance />}`

### 2. **FinanceManagerMobile.tsx** (Mobile)
- ❌ Removed tab "Tổng hợp" from mobile tabs
- ❌ Commented out `import CombinedFinance`
- ✅ Changed default tab: `"combined"` → `"cashbook"`
- ✅ Commented out render for combined view

### 3. **Files KHÔNG sửa** (giữ nguyên cho sau)
- ✅ `src/lib/pinSupabase.ts` - Pin database client (giữ nguyên)
- ✅ `src/lib/syncCashTransactions.ts` - Sync functions (giữ nguyên)
- ✅ `src/components/finance/CombinedFinance.tsx` - Component (giữ nguyên)

---

## 🎯 Kết quả

1. Người dùng mở **Finance** → tự động vào tab **"Sổ quỹ"**
2. Không có tab **"Tổng hợp"** nữa (đã ẩn)
3. Sổ quỹ CHỈ hiển thị dữ liệu từ **database chính** (không trộn Pin)
4. Không có auto-sync Pin nào chạy

---

## 🔄 Cách ENABLE LẠI Pin Integration (sau này)

Khi đã sửa xong số liệu và muốn bật lại tích hợp Pin:

### Bước 1: Enable FinanceManager.tsx
```typescript
// Uncomment import
import CombinedFinance from "./CombinedFinance";

// Add "combined" back to Tab type
type Tab = "combined" | "cashbook" | "loans" | "assets" | "capital";

// (Optional) Change default back to combined
const [activeTab, setActiveTab] = useState<Tab>("combined");

// Uncomment TAB_CONFIGS.combined
const TAB_CONFIGS: Record<Tab, TabConfig> = {
  combined: {
    label: "Tổng hợp",
    Icon: LayoutDashboard,
    activeClass: "bg-gradient-to-r from-indigo-600 to-purple-500 text-white border-transparent shadow-lg shadow-indigo-500/40",
    inactiveClass: "bg-white/90 dark:bg-slate-900/60 text-indigo-700 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-50/80 dark:hover:bg-indigo-900/20",
    dotClass: "bg-indigo-400",
  },
  // ... rest of tabs
};

// Uncomment render
{activeTab === "combined" && <CombinedFinance />}
```

### Bước 2: Enable FinanceManagerMobile.tsx
```typescript
// Uncomment import
import CombinedFinance from "./CombinedFinance";

// Add "combined" back to Tab type
type Tab = "combined" | "cashbook" | "loans" | "assets" | "capital";

// (Optional) Change default back
const [activeTab, setActiveTab] = useState<Tab>("combined");

// Add tab back
const tabs = [
  { key: "combined", label: "Tổng hợp", icon: LayoutDashboard },
  // ... rest of tabs
];

// Uncomment render
{activeTab === "combined" && <CombinedFinance />}
```

### Bước 3: Test sync functions
- Kiểm tra `syncMotocareToPin()` hoạt động đúng
- Kiểm tra `syncPinToMotocare()` hoạt động đúng
- Verify không có duplicate data

---

## 📝 Checklist trước khi enable lại

- [ ] Số dư Sổ Quỹ hiển thị chính xác (9,170,000 cash + 22,666,000 bank)
- [ ] Tất cả giao dịch trong database đã clean, không duplicate
- [ ] Initial balance đã set đúng trong `payment_sources`
- [ ] Test thoroughly với filter "Tất cả" và "30 ngày"
- [ ] Verify RLS policies hoạt động đúng
- [ ] Test trên cả desktop và mobile

---

## ⚡ Quick Enable (one-liner)

Nếu cần enable nhanh, search & replace trong 2 files:

**Find:** `// DISABLED:`  
**Replace with:** (delete the line)

**Find:** `"cashbook"`  (where default tab is set)  
**Replace with:** `"combined"`

---

**Status:** ✅ Pin integration DISABLED  
**Next step:** Fix cash book data accuracy, then re-enable
