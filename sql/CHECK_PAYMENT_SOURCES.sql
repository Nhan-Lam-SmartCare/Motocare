-- Kiểm tra payment_sources có đúng chưa
SELECT 
    id,
    name,
    balance->>'CN1' AS balance_CN1
FROM payment_sources
WHERE id IN ('cash', 'bank');

-- Kiểm tra lại delta
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
SELECT source, SUM(delta) AS transaction_delta
FROM tx_ui
GROUP BY source;

-- Kiểm tra tổng kết
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
    'UI sẽ hiển thị' AS note,
    (SELECT (balance->>'CN1')::numeric FROM payment_sources WHERE id = 'cash') AS cash_initial,
    COALESCE((SELECT SUM(delta) FROM tx_ui WHERE source = 'cash'), 0) AS cash_delta,
    (SELECT (balance->>'CN1')::numeric FROM payment_sources WHERE id = 'cash') 
        + COALESCE((SELECT SUM(delta) FROM tx_ui WHERE source = 'cash'), 0) AS tien_mat_final,
    (SELECT (balance->>'CN1')::numeric FROM payment_sources WHERE id = 'bank') AS bank_initial,
    COALESCE((SELECT SUM(delta) FROM tx_ui WHERE source = 'bank'), 0) AS bank_delta,
    (SELECT (balance->>'CN1')::numeric FROM payment_sources WHERE id = 'bank') 
        + COALESCE((SELECT SUM(delta) FROM tx_ui WHERE source = 'bank'), 0) AS ngan_hang_final;
