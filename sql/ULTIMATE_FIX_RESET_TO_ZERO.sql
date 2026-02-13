-- ================================================================
-- GIẢI PHÁP TRIỆT ĐỂ: Reset về 0 + tạo giao dịch "Số dư ban đầu"
-- ================================================================
-- Thay vì phụ thuộc vào payment_sources.balance (bị cache/Pin ghi đè),
-- ta set balance=0 rồi tạo giao dịch income đúng số tiền target.
-- Như vậy: 0 + delta = target (đơn giản, không bị ghi đè)

-- Bước 1: XÓA giao dịch "Số dư ban đầu" cũ nếu có
DELETE FROM cash_transactions
WHERE notes LIKE '%Số dư ban đầu%' 
  OR notes LIKE '%số dư ban đầu%'
  OR notes LIKE '%Initial balance%';

-- Bước 2: Set payment_sources về 0
UPDATE payment_sources
SET balance = jsonb_set(COALESCE(balance, '{}'::jsonb), '{CN1}', '0'::jsonb)
WHERE id IN ('cash', 'bank');

-- Bước 3: Tính số dư ban đầu = target - current_delta
DO $$
DECLARE
    v_cash_delta NUMERIC;
    v_bank_delta NUMERIC;
    v_cash_initial NUMERIC;
    v_bank_initial NUMERIC;
BEGIN
    -- Tính delta hiện tại
    SELECT COALESCE(SUM(
        CASE 
            WHEN COALESCE(type, 
                CASE WHEN category IN ('sale_income','service_income','other_income','debt_collection','general_income') 
                THEN 'income' ELSE 'expense' END
            ) IN ('income','deposit') 
            THEN ABS(amount) ELSE -ABS(amount)
        END
    ), 0) INTO v_cash_delta
    FROM cash_transactions WHERE branchid = 'CN1' AND COALESCE(paymentsource, 'cash') = 'cash';

    SELECT COALESCE(SUM(
        CASE 
            WHEN COALESCE(type, 
                CASE WHEN category IN ('sale_income','service_income','other_income','debt_collection','general_income') 
                THEN 'income' ELSE 'expense' END
            ) IN ('income','deposit') 
            THEN ABS(amount) ELSE -ABS(amount)
        END
    ), 0) INTO v_bank_delta
    FROM cash_transactions WHERE branchid = 'CN1' AND paymentsource = 'bank';

    -- Tính số dư ban đầu = target - delta
    v_cash_initial := 5945000 - v_cash_delta;
    v_bank_initial := 14240374 - v_bank_delta;

    RAISE NOTICE 'Cash delta: %, initial needed: %', v_cash_delta, v_cash_initial;
    RAISE NOTICE 'Bank delta: %, initial needed: %', v_bank_delta, v_bank_initial;

    -- Tạo 2 giao dịch "Số dư ban đầu"
    INSERT INTO cash_transactions (
        id, type, amount, paymentsource, branchid, 
        date, notes, category
    ) VALUES
    (
        'INITIAL-CASH-CN1',
        'income',
        v_cash_initial,
        'cash',
        'CN1',
        '2024-01-01 00:00:00+00',
        'Số dư ban đầu - Tiền mặt (2026-02-11)',
        'general_income'
    ),
    (
        'INITIAL-BANK-CN1',
        'income',
        v_bank_initial,
        'bank',
        'CN1',
        '2024-01-01 00:00:00+00',
        'Số dư ban đầu - Ngân hàng (2026-02-11)',
        'general_income'
    );

    RAISE NOTICE '✅ Đã tạo 2 giao dịch số dư ban đầu';
END $$;

-- Bước 4: Verify
WITH tx_ui AS (
    SELECT 
        COALESCE(paymentsource, 'cash') AS source,
        CASE 
            WHEN COALESCE(type, 
                CASE WHEN category IN ('sale_income','service_income','other_income','debt_collection','general_income') 
                THEN 'income' ELSE 'expense' END
            ) IN ('income','deposit') 
            THEN ABS(amount) ELSE -ABS(amount)
        END AS delta
    FROM cash_transactions WHERE branchid = 'CN1'
)
SELECT 
    'BALANCE CHECK' AS note,
    (SELECT (balance->>'CN1')::numeric FROM payment_sources WHERE id = 'cash') AS cash_initial_should_be_0,
    COALESCE((SELECT SUM(delta) FROM tx_ui WHERE source = 'cash'), 0) AS cash_delta_should_equal_target,
    (SELECT (balance->>'CN1')::numeric FROM payment_sources WHERE id = 'bank') AS bank_initial_should_be_0,
    COALESCE((SELECT SUM(delta) FROM tx_ui WHERE source = 'bank'), 0) AS bank_delta_should_equal_target;

-- ================================================================
-- SAU KHI CHẠY: RESTART DEV SERVER (Ctrl+C → npm run dev)
-- Không cần click gì cả, chỉ mở lại localhost:4310/finance
-- ================================================================
