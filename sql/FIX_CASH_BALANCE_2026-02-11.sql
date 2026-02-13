-- =============================================
-- ĐIỀU CHỈNH SỐ DƯ TÀI CHÍNH VỀ ĐÚNG THỰC TẾ (v2)
-- Ngày: 2026-02-11 | Chi nhánh: CN1
-- =============================================
-- Công thức UI: cashBalance = initialBalance (payment_sources) + transactionDelta
-- UI fallback: paymentsource NULL → đếm là 'cash'
-- Target: Tiền mặt = 5.945.000 | Ngân hàng = 14.240.374

-- =============================================
-- Bước 1: Kiểm tra có bao nhiêu giao dịch paymentsource NULL
-- =============================================
SELECT 
    COALESCE(paymentsource, 'NULL') AS paymentsource_value,
    COUNT(*) AS so_luong,
    SUM(amount) AS tong_tien
FROM cash_transactions
WHERE branchid = 'CN1'
GROUP BY paymentsource
ORDER BY so_luong DESC;

-- =============================================
-- Bước 2: Tính transaction delta GIỐNG HỆT UI
-- UI: paymentsource NULL → 'cash' (fallback)
-- UI: type NULL → infer từ category
-- UI: income/deposit → +ABS(amount), else → -ABS(amount)
-- =============================================
WITH tx_ui AS (
    SELECT 
        COALESCE(paymentsource, 'cash') AS source,
        ABS(amount) AS abs_amount,
        CASE 
            WHEN COALESCE(type, 
                CASE WHEN category IN ('sale_income','service_income','other_income','debt_collection','general_income') 
                THEN 'income' ELSE 'expense' END
            ) IN ('income','deposit') 
            THEN 1 ELSE -1 
        END AS sign
    FROM cash_transactions
    WHERE branchid = 'CN1'
)
SELECT 
    source,
    SUM(sign * abs_amount) AS transaction_delta
FROM tx_ui
GROUP BY source;

-- =============================================
-- Bước 3: Cập nhật payment_sources
-- initialBalance = target - transactionDelta
-- =============================================
DO $$
DECLARE
    v_cash_delta NUMERIC;
    v_bank_delta NUMERIC;
    v_new_cash_initial NUMERIC;
    v_new_bank_initial NUMERIC;
    v_target_cash NUMERIC := 5945000;
    v_target_bank NUMERIC := 14240374;
BEGIN
    -- Cash delta: paymentsource = 'cash' OR NULL (UI fallback)
    SELECT COALESCE(SUM(
        CASE 
            WHEN COALESCE(type, 
                CASE WHEN category IN ('sale_income','service_income','other_income','debt_collection','general_income') 
                THEN 'income' ELSE 'expense' END
            ) IN ('income','deposit') 
            THEN ABS(amount)
            ELSE -ABS(amount)
        END
    ), 0)
    INTO v_cash_delta
    FROM cash_transactions
    WHERE branchid = 'CN1' 
      AND COALESCE(paymentsource, 'cash') = 'cash';

    -- Bank delta: paymentsource = 'bank' only
    SELECT COALESCE(SUM(
        CASE 
            WHEN COALESCE(type, 
                CASE WHEN category IN ('sale_income','service_income','other_income','debt_collection','general_income') 
                THEN 'income' ELSE 'expense' END
            ) IN ('income','deposit') 
            THEN ABS(amount)
            ELSE -ABS(amount)
        END
    ), 0)
    INTO v_bank_delta
    FROM cash_transactions
    WHERE branchid = 'CN1' 
      AND paymentsource = 'bank';

    v_new_cash_initial := v_target_cash - v_cash_delta;
    v_new_bank_initial := v_target_bank - v_bank_delta;

    RAISE NOTICE '📊 Cash delta: %, Bank delta: %', v_cash_delta, v_bank_delta;
    RAISE NOTICE '💰 New cash initial: %, New bank initial: %', v_new_cash_initial, v_new_bank_initial;
    RAISE NOTICE '✅ Cash: % + % = %', v_new_cash_initial, v_cash_delta, v_target_cash;
    RAISE NOTICE '✅ Bank: % + % = %', v_new_bank_initial, v_bank_delta, v_target_bank;

    UPDATE payment_sources 
    SET balance = jsonb_set(COALESCE(balance, '{}'::jsonb), '{CN1}', to_jsonb(v_new_cash_initial))
    WHERE id = 'cash';

    UPDATE payment_sources 
    SET balance = jsonb_set(COALESCE(balance, '{}'::jsonb), '{CN1}', to_jsonb(v_new_bank_initial))
    WHERE id = 'bank';

    RAISE NOTICE '✅ Đã cập nhật payment_sources!';
END $$;

-- =============================================
-- Bước 4: VERIFY - Tính giống hệt UI
-- Phải ra: Tiền mặt = 5.945.000 | Ngân hàng = 14.240.374
-- =============================================
WITH tx_ui AS (
    SELECT 
        COALESCE(paymentsource, 'cash') AS source,
        CASE 
            WHEN COALESCE(type, 
                CASE WHEN category IN ('sale_income','service_income','other_income','debt_collection','general_income') 
                THEN 'income' ELSE 'expense' END
            ) IN ('income','deposit') 
            THEN ABS(amount)
            ELSE -ABS(amount)
        END AS delta
    FROM cash_transactions
    WHERE branchid = 'CN1'
)
SELECT 
    'KẾT QUẢ' AS note,
    (SELECT (balance->>'CN1')::numeric FROM payment_sources WHERE id = 'cash') 
        + COALESCE((SELECT SUM(delta) FROM tx_ui WHERE source = 'cash'), 0) AS tien_mat,
    (SELECT (balance->>'CN1')::numeric FROM payment_sources WHERE id = 'bank') 
        + COALESCE((SELECT SUM(delta) FROM tx_ui WHERE source = 'bank'), 0) AS ngan_hang,
-- =============================================
-- Bước 5: Sửa giao dịch paymentsource sai ('Tiền mặt' → 'cash')
-- =============================================
UPDATE cash_transactions 
SET paymentsource = 'cash'
WHERE paymentsource = 'Tiền mặt';

-- =============================================
-- Bước 6: Sau khi sửa, tính lại payment_sources (delta thay đổi)
-- =============================================
DO $$
DECLARE
    v_cash_delta NUMERIC;
    v_bank_delta NUMERIC;
    v_target_cash NUMERIC := 5945000;
    v_target_bank NUMERIC := 14240374;
BEGIN
    SELECT COALESCE(SUM(
        CASE 
            WHEN COALESCE(type, 
                CASE WHEN category IN ('sale_income','service_income','other_income','debt_collection','general_income') 
                THEN 'income' ELSE 'expense' END
            ) IN ('income','deposit') 
            THEN ABS(amount) ELSE -ABS(amount)
        END
    ), 0) INTO v_cash_delta
    FROM cash_transactions
    WHERE branchid = 'CN1' AND COALESCE(paymentsource, 'cash') = 'cash';

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

    UPDATE payment_sources 
    SET balance = jsonb_set(COALESCE(balance, '{}'::jsonb), '{CN1}', to_jsonb(v_target_cash - v_cash_delta))
    WHERE id = 'cash';

    UPDATE payment_sources 
    SET balance = jsonb_set(COALESCE(balance, '{}'::jsonb), '{CN1}', to_jsonb(v_target_bank - v_bank_delta))
    WHERE id = 'bank';

    RAISE NOTICE '✅ Cash delta: %, initial: %', v_cash_delta, v_target_cash - v_cash_delta;
    RAISE NOTICE '✅ Bank delta: %, initial: %', v_bank_delta, v_target_bank - v_bank_delta;
END $$;

-- =============================================
-- Bước 7: VERIFY CUỐI CÙNG
-- =============================================
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
    'VERIFY' AS note,
    (SELECT (balance->>'CN1')::numeric FROM payment_sources WHERE id = 'cash') 
        + COALESCE((SELECT SUM(delta) FROM tx_ui WHERE source = 'cash'), 0) AS tien_mat,
    (SELECT (balance->>'CN1')::numeric FROM payment_sources WHERE id = 'bank') 
        + COALESCE((SELECT SUM(delta) FROM tx_ui WHERE source = 'bank'), 0) AS ngan_hang;
