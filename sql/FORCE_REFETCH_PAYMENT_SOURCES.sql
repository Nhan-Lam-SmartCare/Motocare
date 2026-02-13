-- Kiểm tra payment_sources sau khi update
SELECT 
    id,
    name,
    balance->>'CN1' AS balance_CN1_numeric,
    balance
FROM payment_sources
WHERE id IN ('cash', 'bank');

-- Copy kết quả này, close browser tab, mở lại, paste vào console:
-- location.reload(true);
