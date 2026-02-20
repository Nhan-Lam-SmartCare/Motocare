-- Migration Script: Xử lý các đơn ứng lương đã duyệt cũ chưa ghi sổ quỹ
-- Chạy script này MỘT LẦN DUY NHẤT trong Supabase SQL Editor

-- Bước 1: Tạo phiếu chi trong cash_transactions cho các đơn đã duyệt
INSERT INTO cash_transactions (
    id,
    type,
    category,
    amount,
    date,
    description,
    branchid,
    paymentsource
)
SELECT 
    'ADV-MIGRATE-' || ea.id || '-' || EXTRACT(EPOCH FROM NOW())::bigint,
    'expense',
    'employee_advance',
    ea.advance_amount,
    COALESCE(ea.advance_date, NOW()),
    'Ứng lương - ' || ea.employee_name || 
        CASE 
            WHEN ea.reason IS NOT NULL THEN ' (' || ea.reason || ')'
            ELSE ''
        END || ' [Migration từ đơn cũ]',
    ea.branch_id,
    CASE 
        WHEN ea.payment_method = 'cash' THEN 'cash'
        ELSE 'bank'
    END
FROM employee_advances ea
WHERE ea.status = 'approved'
ON CONFLICT (id) DO NOTHING;

-- Bước 2: Cập nhật trạng thái đơn từ 'approved' thành 'paid'
-- ✅ FIX: Cập nhật cả remaining_amount và paid_amount
UPDATE employee_advances
SET 
    status = 'paid',
    remaining_amount = 0,
    paid_amount = advance_amount,
    updated_at = NOW()
WHERE status = 'approved';

-- Bước 3: Kiểm tra kết quả
SELECT 
    COUNT(*) as total_migrated,
    SUM(advance_amount) as total_amount,
    SUM(remaining_amount) as total_remaining,  -- Phải = 0
    SUM(paid_amount) as total_paid             -- Phải = total_amount
FROM employee_advances
WHERE status = 'paid'
    AND EXISTS (
        SELECT 1 FROM cash_transactions ct
        WHERE ct.description LIKE '%Migration từ đơn cũ%'
            AND ct.amount = employee_advances.advance_amount
    );

-- Kiểm tra có đơn nào bị sai không
SELECT 
    id,
    employee_name,
    advance_amount,
    remaining_amount,  -- Phải = 0
    paid_amount,       -- Phải = advance_amount
    status
FROM employee_advances
WHERE status = 'paid' 
    AND (remaining_amount != 0 OR paid_amount != advance_amount);
-- Không được có record nào!

-- Thông báo hoàn tất
DO $$
DECLARE
    migrated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO migrated_count
    FROM cash_transactions
    WHERE description LIKE '%Migration từ đơn cũ%';
    
    RAISE NOTICE 'Migration hoàn tất! Đã xử lý % đơn ứng lương cũ.', migrated_count;
END $$;
