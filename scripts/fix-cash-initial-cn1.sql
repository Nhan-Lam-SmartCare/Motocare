-- Quick fix for CN1 cash initial balance
-- Based on current logs:
--   cashTransactionsDelta = 9,178,000
--   target cash balance    = 9,170,000
-- => required initial cash = -8,000

UPDATE payment_sources
SET balance = jsonb_set(
  COALESCE(balance, '{}'::jsonb),
  '{CN1}',
  to_jsonb(-8000)
)
WHERE id = 'cash';

SELECT id, (balance->>'CN1')::numeric AS initial_balance_cn1
FROM payment_sources
WHERE id IN ('cash', 'bank');
