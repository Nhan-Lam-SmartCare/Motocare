-- FIX CUỐI CÙNG: Đặt balance về đúng 5.945.000 và 14.240.374
-- KHÔNG RELOAD BROWSER SAU KHI CHẠY!

-- Bước 1: Tính lại delta hiện tại
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
    FROM cash_transactions 
    WHERE branchid = 'CN1'
)
SELECT 
    'Current delta' AS note,
    source,
    SUM(delta) AS total_delta
FROM tx_ui
GROUP BY source;

-- Bước 2: Set payment_sources về đúng initial balance
-- initial = target - delta
DO $$
DECLARE
    v_cash_delta NUMERIC;
    v_bank_delta NUMERIC;
BEGIN
    -- Tính delta
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

    -- Set initial = target - delta
    UPDATE payment_sources 
    SET balance = jsonb_set(COALESCE(balance, '{}'::jsonb), '{CN1}', to_jsonb(5945000 - v_cash_delta))
    WHERE id = 'cash';

    UPDATE payment_sources 
    SET balance = jsonb_set(COALESCE(balance, '{}'::jsonb), '{CN1}', to_jsonb(14240374 - v_bank_delta))
    WHERE id = 'bank';

    RAISE NOTICE 'Cash: initial=%, delta=%, final=%', 5945000 - v_cash_delta, v_cash_delta, 5945000;
    RAISE NOTICE 'Bank: initial=%, delta=%, final=%', 14240374 - v_bank_delta, v_bank_delta, 14240374;
END $$;

-- Bước 3: Verify
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
    'FINAL CHECK' AS note,
    (SELECT (balance->>'CN1')::numeric FROM payment_sources WHERE id = 'cash') 
        + COALESCE((SELECT SUM(delta) FROM tx_ui WHERE source = 'cash'), 0) AS tien_mat_should_be_5945000,
    (SELECT (balance->>'CN1')::numeric FROM payment_sources WHERE id = 'bank') 
        + COALESCE((SELECT SUM(delta) FROM tx_ui WHERE source = 'bank'), 0) AS ngan_hang_should_be_14240374;

-- SAU KHI CHẠY: Click vào ⚙️ icon trong UI để mở modal "Cài đặt số dư ban đầu"
-- Chỉ XEM thôi, ĐỪ NG BẤM "Lưu số dư"
-- Sau đó đóng modal lại
-- UI sẽ tự refetch và hiển thị đúng
