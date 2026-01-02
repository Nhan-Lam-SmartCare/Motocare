-- Add supplierId column to inventory_transactions if not exists
-- This allows tracking supplier for each inventory transaction

ALTER TABLE inventory_transactions 
  ADD COLUMN IF NOT EXISTS supplierId TEXT;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_tx_supplier 
  ON inventory_transactions(supplierId);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
