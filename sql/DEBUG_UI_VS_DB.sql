-- So sánh số liệu UI đang hiển thị vs Database thực tế

-- UI đang hiển thị (từ screenshot):
-- Thu: 113.211.000
-- Chi: -131.690.810
-- Chênh lệch: -18.479.810

-- ====================================
-- 1. KIỂM TRA THÁNG HIỆN TẠI (2026-02)
-- ====================================
SELECT 
  'Tháng 02/2026' as period,
  SUM(CASE WHEN type IN ('income','deposit') THEN amount ELSE 0 END) as income,
  -SUM(CASE WHEN type NOT IN ('income','deposit') THEN amount ELSE 0 END) as expense,
  SUM(CASE WHEN type IN ('income','deposit') THEN amount ELSE -amount END) as net
FROM cash_transactions
WHERE branchid='CN1'
  AND date >= '2026-02-01'
  AND date < '2026-03-01';

-- ====================================
-- 2. KIỂM TRA TẤT CẢ GIAO DỊCH
-- ====================================
SELECT 
  'Tất cả thời gian' as period,
  SUM(CASE WHEN type IN ('income','deposit') THEN amount ELSE 0 END) as income,
  -SUM(CASE WHEN type NOT IN ('income','deposit') THEN amount ELSE 0 END) as expense,
  SUM(CASE WHEN type IN ('income','deposit') THEN amount ELSE -amount END) as net
FROM cash_transactions
WHERE branchid='CN1';

-- ====================================
-- 3. TÁCH RIÊNG CASH VÀ BANK
-- ====================================
SELECT 
  COALESCE(paymentsource, 'cash') as source,
  '2026-02' as period,
  COUNT(*) as count,
  SUM(CASE WHEN type IN ('income','deposit') THEN amount ELSE 0 END) as income,
  -SUM(CASE WHEN type NOT IN ('income','deposit') THEN amount ELSE 0 END) as expense,
  SUM(CASE WHEN type IN ('income','deposit') THEN amount ELSE -amount END) as net
FROM cash_transactions
WHERE branchid='CN1'
  AND date >= '2026-02-01'
  AND date < '2026-03-01'
GROUP BY COALESCE(paymentsource, 'cash');

-- ====================================
-- 4. XEM CÁC GIAO DỊCH INITIAL
-- ====================================
SELECT 
  id,
  date,
  type,
  amount,
  paymentsource,
  description,
  EXTRACT(YEAR FROM date) as year,
  EXTRACT(MONTH FROM date) as month
FROM cash_transactions
WHERE branchid='CN1' 
  AND (id LIKE 'INITIAL-%' OR description ILIKE '%dư ban đầu%')
ORDER BY date;

-- ====================================
-- 5. TÍNH BALANCE ĐÚNG (TẤT CẢ + INITIAL)
-- ====================================
SELECT 
  COALESCE(paymentsource, 'cash') as source,
  SUM(CASE WHEN type IN ('income','deposit') THEN amount ELSE -amount END) as total_balance
FROM cash_transactions
WHERE branchid='CN1'
GROUP BY COALESCE(paymentsource, 'cash');
