-- KIỂM TRA CHÍNH XÁC GIÁ TRỊ TRONG PAYMENT_SOURCES

SELECT 
  id,
  balance,
  balance->'CN1' as cn1_balance_raw,
  (balance->'CN1')::text as cn1_balance_text,
  (balance->'CN1')::text::numeric as cn1_balance_number
FROM payment_sources
WHERE id IN ('cash', 'bank');
