-- Migration: Update old inventory transactions from purchase orders
-- Add supplier info and create cash transactions for already received POs
-- Date: 2026-01-02

-- Step 1: Ensure supplierId column exists
ALTER TABLE inventory_transactions 
  ADD COLUMN IF NOT EXISTS supplierId TEXT;

CREATE INDEX IF NOT EXISTS idx_inventory_tx_supplier 
  ON inventory_transactions(supplierId);

-- Step 2: Update supplierId for inventory transactions from purchase orders
-- Match by notes containing PO number
UPDATE inventory_transactions it
SET supplierId = po.supplier_id
FROM purchase_orders po
WHERE 
  it.type = 'Nhập kho'
  AND it.supplierId IS NULL
  AND it.notes LIKE '%' || po.po_number || '%'
  AND po.status = 'received';

-- Step 3: Create cash transactions for received POs that don't have payment records
-- Only for POs that were received but don't have corresponding cash transaction
INSERT INTO cash_transactions (
  id,
  type,
  category,
  amount,
  date,
  description,
  branchId,
  paymentSource,
  reference,
  supplierId,
  created_at
)
SELECT 
  'CT-MIGRATE-' || po.id,
  'expense',
  'supplier_payment',
  COALESCE(po.final_amount, po.total_amount, 0),
  po.received_date,
  'Chi trả NCC ' || COALESCE(s.name, 'Không xác định') || ' - Đơn ' || po.po_number || ' (Bổ sung)',
  po.branch_id,
  'cash', -- Default to cash, user can update later
  po.po_number,
  po.supplier_id,
  po.received_date
FROM purchase_orders po
LEFT JOIN suppliers s ON s.id = po.supplier_id
LEFT JOIN cash_transactions ct ON ct.reference = po.po_number
WHERE 
  po.status = 'received'
  AND po.received_date IS NOT NULL
  AND ct.id IS NULL -- Don't create if already exists
ON CONFLICT (id) DO NOTHING;

-- Step 4: Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Summary query to show results
SELECT 
  'Inventory transactions updated' as action,
  COUNT(*) as count
FROM inventory_transactions
WHERE supplierId IS NOT NULL AND type = 'Nhập kho'
UNION ALL
SELECT 
  'Cash transactions created' as action,
  COUNT(*) as count
FROM cash_transactions
WHERE id LIKE 'CT-MIGRATE-%';
