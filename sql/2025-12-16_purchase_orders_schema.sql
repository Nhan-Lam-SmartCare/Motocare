-- =====================================================
-- Purchase Orders (Đơn đặt hàng) Schema
-- Created: 2025-12-16
-- Purpose: Quản lý đơn đặt hàng để tránh trùng lặp và track hàng về
-- =====================================================

-- Drop existing tables if any (development only)
DROP TABLE IF EXISTS purchase_order_items CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;

-- =====================================================
-- Table: purchase_orders
-- Lưu thông tin đơn đặt hàng chính
-- =====================================================
CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number TEXT UNIQUE NOT NULL, -- Mã đơn: PO-2025-001
  supplier_id TEXT REFERENCES suppliers(id) ON DELETE RESTRICT,
  branch_id TEXT NOT NULL, -- Chi nhánh đặt hàng
  
  -- Status workflow
  status TEXT NOT NULL DEFAULT 'draft', -- draft, ordered, received, cancelled
  
  -- Dates
  order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expected_date TIMESTAMP WITH TIME ZONE, -- Dự kiến hàng về
  received_date TIMESTAMP WITH TIME ZONE, -- Thực tế nhận hàng
  
  -- Financial
  total_amount DECIMAL(15,2) DEFAULT 0, -- Tổng tiền dự kiến
  discount_amount DECIMAL(15,2) DEFAULT 0, -- Giảm giá (nếu có)
  final_amount DECIMAL(15,2) DEFAULT 0, -- Thành tiền
  
  -- Additional info
  notes TEXT, -- Ghi chú
  cancellation_reason TEXT, -- Lý do hủy (nếu status = cancelled)
  
  -- Receipt tracking
  receipt_id TEXT REFERENCES inventory_transactions(id), -- Link đến phiếu nhập kho (khi convert)
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Table: purchase_order_items
-- Chi tiết sản phẩm trong đơn đặt hàng
-- =====================================================
CREATE TABLE purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  part_id TEXT NOT NULL REFERENCES parts(id) ON DELETE RESTRICT,
  
  -- Quantities
  quantity_ordered INTEGER NOT NULL CHECK (quantity_ordered > 0),
  quantity_received INTEGER DEFAULT 0 CHECK (quantity_received >= 0),
  
  -- Pricing
  unit_price DECIMAL(15,2) NOT NULL CHECK (unit_price >= 0),
  total_price DECIMAL(15,2) GENERATED ALWAYS AS (quantity_ordered * unit_price) STORED,
  
  -- Additional
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT check_received_not_exceed_ordered 
    CHECK (quantity_received <= quantity_ordered)
);

-- =====================================================
-- Indexes for Performance
-- =====================================================
CREATE INDEX idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_po_branch ON purchase_orders(branch_id);
CREATE INDEX idx_po_status ON purchase_orders(status);
CREATE INDEX idx_po_order_date ON purchase_orders(order_date DESC);
CREATE INDEX idx_po_expected_date ON purchase_orders(expected_date);
CREATE INDEX idx_po_created_by ON purchase_orders(created_by);

CREATE INDEX idx_po_items_po ON purchase_order_items(po_id);
CREATE INDEX idx_po_items_part ON purchase_order_items(part_id);

-- =====================================================
-- RLS Policies
-- =====================================================
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read all POs in their branch
CREATE POLICY "Users can read POs in their branch"
  ON purchase_orders FOR SELECT
  USING (
    branch_id = current_setting('app.current_branch_id', true)
    OR auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'owner'
    )
  );

-- Policy: Authenticated users can create POs
CREATE POLICY "Users can create POs"
  ON purchase_orders FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: Users can update their own POs or owners can update all
CREATE POLICY "Users can update POs"
  ON purchase_orders FOR UPDATE
  USING (
    created_by = auth.uid()
    OR auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'owner'
    )
  );

-- Policy: Only owners can delete POs
CREATE POLICY "Owners can delete POs"
  ON purchase_orders FOR DELETE
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'owner'
    )
  );

-- Policy: Users can read PO items if they can read the PO
CREATE POLICY "Users can read PO items"
  ON purchase_order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM purchase_orders
      WHERE id = po_id
      AND (
        branch_id = current_setting('app.current_branch_id', true)
        OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'owner')
      )
    )
  );

-- Policy: Users can insert/update/delete PO items if they can modify the PO
CREATE POLICY "Users can modify PO items"
  ON purchase_order_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM purchase_orders
      WHERE id = po_id
      AND (
        created_by = auth.uid()
        OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'owner')
      )
    )
  );

-- =====================================================
-- Trigger: Auto-update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_purchase_order_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_po_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_purchase_order_timestamp();

CREATE TRIGGER trigger_po_items_updated_at
  BEFORE UPDATE ON purchase_order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_purchase_order_timestamp();

-- =====================================================
-- Function: Auto-generate PO number
-- =====================================================
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS TRIGGER AS $$
DECLARE
  year_suffix TEXT;
  next_number INTEGER;
  new_po_number TEXT;
BEGIN
  -- Get year suffix (e.g., 2025 -> 25)
  year_suffix := TO_CHAR(CURRENT_DATE, 'YY');
  
  -- Get next sequential number for this year
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(po_number FROM 'PO-' || year_suffix || '-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO next_number
  FROM purchase_orders
  WHERE po_number LIKE 'PO-' || year_suffix || '-%';
  
  -- Generate new PO number: PO-25-001
  new_po_number := 'PO-' || year_suffix || '-' || LPAD(next_number::TEXT, 3, '0');
  
  NEW.po_number := new_po_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_po_number
  BEFORE INSERT ON purchase_orders
  FOR EACH ROW
  WHEN (NEW.po_number IS NULL)
  EXECUTE FUNCTION generate_po_number();

-- =====================================================
-- Function: Auto-calculate PO totals
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_po_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate total_amount from items
  UPDATE purchase_orders
  SET 
    total_amount = (
      SELECT COALESCE(SUM(total_price), 0)
      FROM purchase_order_items
      WHERE po_id = NEW.po_id
    ),
    final_amount = total_amount - discount_amount
  WHERE id = NEW.po_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_po_totals_insert
  AFTER INSERT ON purchase_order_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_po_totals();

CREATE TRIGGER trigger_calculate_po_totals_update
  AFTER UPDATE ON purchase_order_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_po_totals();

CREATE TRIGGER trigger_calculate_po_totals_delete
  AFTER DELETE ON purchase_order_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_po_totals();

-- =====================================================
-- Sample Data (Optional - for testing)
-- =====================================================
-- Insert sample PO (uncomment to use)
/*
INSERT INTO purchase_orders (
  supplier_id,
  branch_id,
  status,
  expected_date,
  notes,
  created_by
) VALUES (
  (SELECT id FROM suppliers LIMIT 1),
  'main',
  'ordered',
  NOW() + INTERVAL '7 days',
  'Đơn đặt hàng test',
  auth.uid()
);
*/

-- =====================================================
-- Grant permissions
-- =====================================================
GRANT ALL ON purchase_orders TO authenticated;
GRANT ALL ON purchase_order_items TO authenticated;

-- =====================================================
-- Comments for documentation
-- =====================================================
COMMENT ON TABLE purchase_orders IS 'Quản lý đơn đặt hàng từ nhà cung cấp';
COMMENT ON TABLE purchase_order_items IS 'Chi tiết sản phẩm trong đơn đặt hàng';

COMMENT ON COLUMN purchase_orders.status IS 'draft: Nháp, ordered: Đã đặt, received: Đã nhận, cancelled: Đã hủy';
COMMENT ON COLUMN purchase_orders.receipt_id IS 'Link đến phiếu nhập kho khi convert PO';
