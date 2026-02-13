-- Debug: Tại sao UI hiển thị sai?
-- UI hiện: Cash 141.873.251, Bank 12.584.374
-- SQL tính: Cash 5.945.000, Bank 14.240.374

-- 1. Kiểm tra payment_sources hiện tại
SELECT 
    'payment_sources initial' AS step,
    id,
    (balance->>'CN1')::numeric AS balance_cn1
FROM payment_sources
WHERE id IN ('cash', 'bank');

-- 2. Tính delta giống UI (paymentsource NULL → 'cash')
WITH tx_ui AS (
    SELECT 
        COALESCE(paymentsource, 'cash') AS source,
        CASE 
            WHEN COALESCE(type, 
                CASE WHEN category IN ('sale_income','service_income','other_income','debt_collection','general_income') 
                THEN 'income' ELSE 'expense' END
            ) IN ('income','deposit') 
            THEN ABS(amount) ELSE -ABS(amount)
        END AS delta,
        id,
        date,
        category,
        type,
        amount
    FROM cash_transactions 
    WHERE branchid = 'CN1'
    ORDER BY date DESC
    LIMIT 20
)
SELECT * FROM tx_ui;

-- 3. Tổng delta theo source
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
    'transaction_delta' AS step,
    source,
    SUM(delta) AS total_delta,
    COUNT(*) AS tx_count
FROM tx_ui
GROUP BY source;

-- 4. Tính final balance (phải ra 5.945.000 và 14.240.374)
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
    'EXPECTED (SQL)' AS note,
    (SELECT (balance->>'CN1')::numeric FROM payment_sources WHERE id = 'cash') AS cash_initial,
    COALESCE((SELECT SUM(delta) FROM tx_ui WHERE source = 'cash'), 0) AS cash_delta,
    (SELECT (balance->>'CN1')::numeric FROM payment_sources WHERE id = 'cash') 
        + COALESCE((SELECT SUM(delta) FROM tx_ui WHERE source = 'cash'), 0) AS cash_final,
    (SELECT (balance->>'CN1')::numeric FROM payment_sources WHERE id = 'bank') AS bank_initial,
    COALESCE((SELECT SUM(delta) FROM tx_ui WHERE source = 'bank'), 0) AS bank_delta,
    (SELECT (balance->>'CN1')::numeric FROM payment_sources WHERE id = 'bank') 
        + COALESCE((SELECT SUM(delta) FROM tx_ui WHERE source = 'bank'), 0) AS bank_final;

-- 5. Reverse engineer: nếu UI hiển thị 141.873.251, delta phải là bao nhiêu?
SELECT 
    'REVERSE (UI showing)' AS note,
    141873251 AS ui_cash_showing,
    75488185 AS cash_initial,
    141873251 - 75488185 AS required_cash_delta,
    12584374 AS ui_bank_showing,
    153698676.59814662 AS bank_initial,
    12584374 - 153698676.59814662 AS required_bank_delta;
