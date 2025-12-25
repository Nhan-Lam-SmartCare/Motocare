-- Migration: Add installment sales tracking
-- Created: 2025-12-25
-- Purpose: Track sales with installment payments (trả góp)

-- Create sales_installments table to track installment payment plans
CREATE TABLE IF NOT EXISTS sales_installments (
  id TEXT PRIMARY KEY DEFAULT 'SI-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTR(MD5(RANDOM()::TEXT), 1, 6),
  sale_id TEXT NOT NULL,
  customer_id TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  
  -- Installment details
  total_amount NUMERIC NOT NULL DEFAULT 0,         -- Total order value
  prepaid_amount NUMERIC NOT NULL DEFAULT 0,       -- Deposit/down payment
  remaining_amount NUMERIC NOT NULL DEFAULT 0,     -- Amount to pay via installments
  interest_rate NUMERIC NOT NULL DEFAULT 0,        -- Interest rate (% per month)
  total_with_interest NUMERIC NOT NULL DEFAULT 0,  -- Total including interest
  
  -- Payment schedule
  num_installments INTEGER NOT NULL DEFAULT 1,     -- Number of installments (e.g. 9)
  installment_amount NUMERIC NOT NULL DEFAULT 0,   -- Amount per installment
  current_installment INTEGER NOT NULL DEFAULT 0,  -- Current paid installment (e.g. 2 of 9)
  next_payment_date DATE,                          -- Next payment due date
  
  -- Provider
  finance_company TEXT DEFAULT 'store',            -- 'store', 'fe_credit', 'home_credit', etc.
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'overdue', 'cancelled')),
  
  -- Metadata
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  notes TEXT,
  branch_id TEXT NOT NULL DEFAULT 'CN1',
  created_by TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create installment_payments table to track individual payments
CREATE TABLE IF NOT EXISTS installment_payments (
  id TEXT PRIMARY KEY DEFAULT 'IP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTR(MD5(RANDOM()::TEXT), 1, 6),
  installment_id TEXT NOT NULL REFERENCES sales_installments(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,             -- Which installment (1, 2, 3...)
  payment_date TIMESTAMP DEFAULT NOW(),
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'bank')),
  notes TEXT,
  cash_transaction_id TEXT,                        -- Link to cash transaction
  created_by TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Disable RLS for now
ALTER TABLE sales_installments DISABLE ROW LEVEL SECURITY;
ALTER TABLE installment_payments DISABLE ROW LEVEL SECURITY;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_installments_sale_id ON sales_installments(sale_id);
CREATE INDEX IF NOT EXISTS idx_installments_customer ON sales_installments(customer_name);
CREATE INDEX IF NOT EXISTS idx_installments_status ON sales_installments(status);
CREATE INDEX IF NOT EXISTS idx_installments_branch ON sales_installments(branch_id);
CREATE INDEX IF NOT EXISTS idx_installments_next_payment ON sales_installments(next_payment_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_installment_payments_id ON installment_payments(installment_id);

-- Add comments
COMMENT ON TABLE sales_installments IS 'Quản lý bán hàng trả góp';
COMMENT ON TABLE installment_payments IS 'Lịch sử thanh toán từng kỳ trả góp';
COMMENT ON COLUMN sales_installments.finance_company IS 'Công ty tài chính: store (cửa hàng tự trả góp), fe_credit, home_credit, hd_saison, etc.';
COMMENT ON COLUMN sales_installments.current_installment IS 'Kỳ đang thanh toán (ví dụ: 2 của 9 kỳ)';
