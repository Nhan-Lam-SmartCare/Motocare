# Cash Book Testing Checklist

## Test Date: February 13, 2026

### ✅ Pre-Testing Setup

1. **Deploy Database View (if needed)**
   - [ ] Run `scripts/verify-cash-book-setup.sql` in Supabase SQL Editor
   - [ ] If view missing, deploy `sql/2026-01-09_cash_transactions_ledger_view.sql`
   - [ ] Verify view permissions granted to `authenticated` role

2. **Clear Browser Cache**
   - [ ] Clear browser cache or use Incognito mode
   - [ ] Hard refresh (Ctrl+Shift+R) after opening app

---

### 📱 Desktop Testing (CashBook.tsx)

#### Test 1: Actual Balance Display (Số dư thực tế)
- [ ] Open Finance → Sổ Quỹ
- [ ] Verify "Số dư thực tế (Tổng cộng từ đầu)" section is visible at top
- [ ] Check 3 cards displayed:
  - [ ] Tiền mặt (with amber border)
  - [ ] Ngân hàng (with purple border)
  - [ ] Tổng cộng (with blue border)
- [ ] Verify numbers match database query:
  ```sql
  -- Run in Supabase SQL Editor
  SELECT 
    SUM(CASE WHEN paymentsourceid = 'cash' AND type = 'income' THEN amount ELSE 0 END) -
    SUM(CASE WHEN paymentsourceid = 'cash' AND type = 'expense' THEN amount ELSE 0 END) AS cash_balance,
    SUM(CASE WHEN paymentsourceid = 'bank' AND type = 'income' THEN amount ELSE 0 END) -
    SUM(CASE WHEN paymentsourceid = 'bank' AND type = 'expense' THEN amount ELSE 0 END) AS bank_balance
  FROM cash_transactions_ledger
  WHERE branchid = 'your-branch-id';
  ```
- [ ] If balance is negative, verify warning "⚠️ Số dư âm - cần kiểm tra" appears

#### Test 2: Filter = "Tất cả" (No Filter)
- [ ] Set all filters to:
  - Thời gian: Tất cả
  - Loại: Tất cả
  - Nguồn tiền: Tất cả
- [ ] Verify "Tóm tắt kỳ lọc" section is HIDDEN (not displayed)
- [ ] Verify all transactions from beginning are shown
- [ ] Verify transaction count matches database

#### Test 3: Filter = "30 ngày" (Default)
- [ ] Refresh page (default filter should be "30 ngày")
- [ ] Verify "Số dư thực tế" remains UNCHANGED (shows total from all time)
- [ ] Verify "Tóm tắt kỳ lọc" section IS VISIBLE
- [ ] Check "Tóm tắt kỳ lọc" displays:
  - [ ] Thu (income in last 30 days)
  - [ ] Chi (expense in last 30 days)
  - [ ] Chênh lệch (income - expense)
  - [ ] TM trong kỳ (cash change in period)
  - [ ] NH trong kỳ (bank change in period)
- [ ] Verify transaction list only shows last 30 days
- [ ] Verify "(X giao dịch)" count is correct

#### Test 4: Filter = "7 ngày"
- [ ] Set filter to "7 ngày"
- [ ] Verify "Số dư thực tế" still shows total (unchanged)
- [ ] Verify "Tóm tắt kỳ lọc" updates with 7-day numbers
- [ ] Verify only transactions from last 7 days shown

#### Test 5: Filter = "Hôm nay"
- [ ] Set filter to "Hôm nay"
- [ ] Verify "Số dư thực tế" still shows total (unchanged)
- [ ] Verify "Tóm tắt kỳ lọc" shows only today's transactions
- [ ] If no transactions today, list should be empty but balance still correct

#### Test 6: Filter by Payment Source
- [ ] Set "Nguồn tiền" to "Tiền mặt"
- [ ] Verify "Số dư thực tế" still shows BOTH cash AND bank totals
- [ ] Verify "Tóm tắt kỳ lọc" section appears (filtered view)
- [ ] Verify transaction list shows only cash transactions

#### Test 7: Filter by Type (Thu/Chi)
- [ ] Set "Loại" to "Thu"
- [ ] Verify "Số dư thực tế" unchanged
- [ ] Verify "Tóm tắt kỳ lọc" appears
- [ ] Verify only income transactions shown
- [ ] Repeat with "Chi" (expense)

#### Test 8: Search Filter
- [ ] Enter search query (e.g., "lương", "khách hàng")
- [ ] Verify "Số dư thực tế" unchanged
- [ ] Verify "Tóm tắt kỳ lọc" appears with filtered results
- [ ] Verify search works across: notes, description, reference, recipient, category

#### Test 9: Add New Transaction
- [ ] Click "Thêm giao dịch"
- [ ] Add a new income transaction (e.g., 100,000đ cash)
- [ ] Save transaction
- [ ] Verify "Số dư thực tế" → Tiền mặt increases by 100,000đ immediately
- [ ] Verify transaction appears in list
- [ ] Verify "Tóm tắt kỳ lọc" updates if filter active

#### Test 10: Edit Transaction
- [ ] Edit an existing transaction (change amount)
- [ ] Save changes
- [ ] Verify "Số dư thực tế" updates correctly
- [ ] Verify "Tóm tắt kỳ lọc" updates if transaction in filtered period

#### Test 11: Delete Transaction
- [ ] Delete a transaction
- [ ] Verify "Số dư thực tế" adjusts accordingly
- [ ] Verify transaction removed from list

---

### 📱 Mobile Testing (CashBookMobile.tsx)

#### Test 12: Mobile - Actual Balance Card
- [ ] Open app on mobile device or resize browser to mobile view
- [ ] Verify "Balance Card" (blue gradient) displays:
  - Title: "Tổng số dư thực tế"
  - Total balance in large text
  - Two sub-cards: Tiền mặt & Ngân hàng
- [ ] Verify balance matches desktop version

#### Test 13: Mobile - Filtered Summary Card
- [ ] Horizontal scroll to second card
- [ ] Card title: "Thu chi trong kỳ"
- [ ] Verify it shows:
  - [ ] Tổng thu (green, with up arrow)
  - [ ] Tổng chi (red, with down arrow)
  - [ ] Chênh lệch (blue, with wallet icon)
- [ ] When filter = "Tất cả", these should equal actualBalance totals
- [ ] When filtered, should show only filtered period

#### Test 14: Mobile - Filters
- [ ] Tap filter button (top right)
- [ ] Change filters (Thời gian, Loại, Nguồn tiền)
- [ ] Verify "Balance Card" (top) never changes
- [ ] Verify "Thu chi trong kỳ" card updates with filtered data
- [ ] Verify transaction list updates

#### Test 15: Mobile - Add/Edit/Delete
- [ ] Test same scenarios as desktop (Test 9-11)
- [ ] Verify balance updates work correctly on mobile

---

### 🔐 RLS & Multi-Branch Testing

#### Test 16: Branch Isolation
- [ ] Login as staff user (restricted to one branch)
- [ ] Verify they only see transactions for their branch
- [ ] Verify "Số dư thực tế" only shows their branch balance

#### Test 17: Manager/Owner View
- [ ] Login as Manager or Owner
- [ ] Switch between branches
- [ ] Verify "Số dư thực tế" updates per branch
- [ ] Verify each branch shows correct isolated data

---

### 🐛 Edge Cases

#### Test 18: Negative Balance Warning
- [ ] If you have transaction with balance going negative:
  - [ ] Verify warning icon appears in "Số dư thực tế" cards
  - [ ] Warning text: "⚠️ Số dư âm - cần kiểm tra"

#### Test 19: Empty Transactions
- [ ] Create new branch with no transactions
- [ ] Verify "Số dư thực tế" shows 0
- [ ] Verify empty state message: "Không có giao dịch nào"

#### Test 20: Large Numbers
- [ ] Test with transaction amounts > 1 billion
- [ ] Verify formatting displays correctly
- [ ] Verify calculations are accurate (no overflow)

#### Test 21: Date Edge Cases
- [ ] Test with transactions on Dec 31 → Jan 1 (year boundary)
- [ ] Test "Theo tháng" filter with current month
- [ ] Test timezone consistency (transactions at midnight)

---

### ✅ Final Verification

#### Performance Check
- [ ] Page loads in < 2 seconds
- [ ] Filter changes are instant (< 100ms)
- [ ] No console errors in browser DevTools
- [ ] No TypeScript errors in terminal

#### Data Consistency Check
Run this query in Supabase and compare with UI:
```sql
-- Total balance verification
SELECT 
  branchid,
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS total_income,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS total_expense,
  SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) AS net_balance
FROM cash_transactions_ledger
GROUP BY branchid
ORDER BY branchid;
```

- [ ] Numbers match UI "Số dư thực tế"
- [ ] No discrepancies between database and display

---

## 🎯 Success Criteria

All tests pass if:
1. ✅ "Số dư thực tế" always displays total from ALL transactions (never filtered)
2. ✅ "Tóm tắt kỳ lọc" only appears when filter is active (not "Tất cả")
3. ✅ "Tóm tắt kỳ lọc" shows correct numbers for filtered period only
4. ✅ Filters affect transaction list and summary, but NOT actual balance
5. ✅ Mobile and desktop versions behave identically
6. ✅ RLS properly isolates branches
7. ✅ No console errors or TypeScript errors
8. ✅ Numbers match database queries

---

## 🐛 Known Issues (if any)

- None currently identified

---

## 📝 Test Results

Tested by: _______________
Date: _______________
Browser: _______________
Device: _______________

Overall Result: [ ] PASS  [ ] FAIL

Notes:
_______________________________
_______________________________
_______________________________
