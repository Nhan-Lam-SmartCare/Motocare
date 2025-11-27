-- =====================================================
-- NOTIFICATION SYSTEM FOR MOTOCARE
-- Created: 2025-11-27
-- Description: Complete notification system with triggers
-- =====================================================

-- =====================================================
-- STEP 1: CREATE NOTIFICATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Notification content
  type TEXT NOT NULL, -- 'work_order', 'sale', 'inventory', 'inventory_warning', 'debt', 'cash'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}', -- Additional data (order_id, amount, etc.)
  
  -- Sender/Recipient
  created_by UUID REFERENCES auth.users(id),
  recipient_id UUID REFERENCES auth.users(id), -- NULL = all users matching role
  recipient_role TEXT, -- 'owner', 'manager', 'staff' - NULL = all
  branch_id TEXT,
  
  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_role ON notifications(recipient_role, branch_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- =====================================================
-- STEP 2: ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can read notifications meant for them
CREATE POLICY "Users can read their notifications"
ON notifications FOR SELECT
USING (
  recipient_id = auth.uid() 
  OR recipient_id IS NULL
  OR recipient_role IN (
    SELECT role FROM profiles WHERE id = auth.uid()
  )
  OR recipient_role IS NULL
);

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update their notifications"
ON notifications FOR UPDATE
USING (
  recipient_id = auth.uid() 
  OR recipient_id IS NULL
  OR recipient_role IN (
    SELECT role FROM profiles WHERE id = auth.uid()
  )
);

-- System can insert notifications (via triggers)
CREATE POLICY "System can insert notifications"
ON notifications FOR INSERT
WITH CHECK (true);

-- =====================================================
-- STEP 3: HELPER FUNCTION TO CREATE NOTIFICATIONS
-- =====================================================

CREATE OR REPLACE FUNCTION create_notification(
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT '{}',
  p_recipient_role TEXT DEFAULT 'owner',
  p_branch_id TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (type, title, message, data, recipient_role, branch_id, created_by)
  VALUES (p_type, p_title, p_message, p_data, p_recipient_role, p_branch_id, p_created_by)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 4: WORK ORDER TRIGGERS
-- =====================================================

-- 4.1 New Work Order Created
CREATE OR REPLACE FUNCTION notify_new_work_order()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_notification(
    'work_order',
    '🔧 Phiếu sửa chữa mới',
    FORMAT('Phiếu %s - %s %s đã được tạo', 
      COALESCE(NEW.code, 'N/A'),
      COALESCE(NEW.vehicle_brand, ''),
      COALESCE(NEW.license_plate, '')
    ),
    jsonb_build_object(
      'work_order_id', NEW.id,
      'code', NEW.code,
      'status', NEW.status,
      'vehicle', NEW.vehicle_brand || ' ' || COALESCE(NEW.license_plate, ''),
      'total', COALESCE(NEW.total, 0)
    ),
    'owner',
    NEW.branch_id,
    NEW.created_by
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_new_work_order ON work_orders;
CREATE TRIGGER trigger_notify_new_work_order
AFTER INSERT ON work_orders
FOR EACH ROW EXECUTE FUNCTION notify_new_work_order();

-- 4.2 Work Order Status Changed
CREATE OR REPLACE FUNCTION notify_work_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM create_notification(
      'work_order',
      CASE NEW.status
        WHEN 'Đang sửa' THEN '🛠️ Đang xử lý phiếu'
        WHEN 'Chờ phụ tùng' THEN '⏳ Chờ phụ tùng'
        WHEN 'Hoàn thành' THEN '✅ Hoàn thành phiếu'
        WHEN 'Đã giao xe' THEN '🏍️ Đã giao xe'
        WHEN 'Hủy' THEN '❌ Phiếu đã hủy'
        ELSE '📋 Cập nhật phiếu'
      END,
      FORMAT('Phiếu %s: %s → %s', 
        COALESCE(NEW.code, 'N/A'),
        COALESCE(OLD.status, 'Mới'),
        NEW.status
      ),
      jsonb_build_object(
        'work_order_id', NEW.id,
        'code', NEW.code,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'total', COALESCE(NEW.total, 0)
      ),
      'owner',
      NEW.branch_id,
      NEW.updated_by
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_work_order_status ON work_orders;
CREATE TRIGGER trigger_notify_work_order_status
AFTER UPDATE ON work_orders
FOR EACH ROW EXECUTE FUNCTION notify_work_order_status_change();

-- =====================================================
-- STEP 5: SALES TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION notify_new_sale()
RETURNS TRIGGER AS $$
DECLARE
  item_count INTEGER;
BEGIN
  -- Count items in sale
  item_count := COALESCE(jsonb_array_length(NEW.items), 0);
  
  PERFORM create_notification(
    'sale',
    '🛒 Bán hàng mới',
    FORMAT('Đơn %s - %s (%s sản phẩm)', 
      COALESCE(NEW.code, 'N/A'),
      TO_CHAR(COALESCE(NEW.total, 0), 'FM999,999,999') || 'đ',
      item_count
    ),
    jsonb_build_object(
      'sale_id', NEW.id,
      'code', NEW.code,
      'total', NEW.total,
      'item_count', item_count,
      'payment_method', NEW.payment_method,
      'customer_name', NEW.customer->>'name'
    ),
    'owner',
    NEW.branch_id,
    NEW.created_by
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_new_sale ON sales;
CREATE TRIGGER trigger_notify_new_sale
AFTER INSERT ON sales
FOR EACH ROW EXECUTE FUNCTION notify_new_sale();

-- =====================================================
-- STEP 6: INVENTORY TRIGGERS
-- =====================================================

-- 6.1 Inventory Receipt (Import/Purchase)
CREATE OR REPLACE FUNCTION notify_inventory_receipt()
RETURNS TRIGGER AS $$
DECLARE
  part_name TEXT;
  supplier_name TEXT;
BEGIN
  -- Only notify for stock-in transactions
  IF NEW.type NOT IN ('purchase', 'goods_receipt', 'adjustment_in', 'transfer_in', 'initial') THEN
    RETURN NEW;
  END IF;

  -- Get part name
  SELECT name INTO part_name FROM parts WHERE id = NEW.part_id;
  
  -- Get supplier name if available
  IF NEW.supplier_id IS NOT NULL THEN
    SELECT name INTO supplier_name FROM suppliers WHERE id = NEW.supplier_id;
  END IF;

  PERFORM create_notification(
    'inventory',
    CASE NEW.type
      WHEN 'purchase' THEN '📦 Nhập kho mới'
      WHEN 'goods_receipt' THEN '📦 Nhận hàng từ NCC'
      WHEN 'transfer_in' THEN '🔄 Chuyển kho đến'
      WHEN 'initial' THEN '📦 Khởi tạo tồn kho'
      ELSE '📦 Điều chỉnh tăng'
    END,
    CASE 
      WHEN supplier_name IS NOT NULL THEN
        FORMAT('+%s %s từ %s', NEW.quantity, COALESCE(part_name, 'Sản phẩm'), supplier_name)
      ELSE
        FORMAT('+%s %s - %s', 
          NEW.quantity, 
          COALESCE(part_name, 'Sản phẩm'),
          TO_CHAR(COALESCE(NEW.total_cost, 0), 'FM999,999,999') || 'đ'
        )
    END,
    jsonb_build_object(
      'transaction_id', NEW.id,
      'part_id', NEW.part_id,
      'part_name', part_name,
      'quantity', NEW.quantity,
      'total_cost', NEW.total_cost,
      'supplier_id', NEW.supplier_id,
      'supplier_name', supplier_name,
      'type', NEW.type
    ),
    'owner',
    NEW.branch_id,
    NEW.created_by
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_inventory_receipt ON inventory_transactions;
CREATE TRIGGER trigger_notify_inventory_receipt
AFTER INSERT ON inventory_transactions
FOR EACH ROW EXECUTE FUNCTION notify_inventory_receipt();

-- 6.2 Low Stock Warning
CREATE OR REPLACE FUNCTION notify_low_stock()
RETURNS TRIGGER AS $$
DECLARE
  part_record RECORD;
  current_stock INTEGER;
  min_stock INTEGER;
BEGIN
  -- Only check for stock-out transactions
  IF NEW.type NOT IN ('sale', 'service', 'adjustment_out', 'transfer_out') THEN
    RETURN NEW;
  END IF;

  -- Get part info with current stock
  SELECT 
    p.*,
    COALESCE((p.stock->>NEW.branch_id)::integer, 0) as branch_stock
  INTO part_record
  FROM parts p 
  WHERE p.id = NEW.part_id;
  
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  current_stock := part_record.branch_stock;
  min_stock := COALESCE(part_record.min_stock, 5); -- Default warning at 5

  -- If stock is below minimum
  IF current_stock <= min_stock AND current_stock >= 0 THEN
    PERFORM create_notification(
      'inventory_warning',
      '⚠️ Tồn kho thấp',
      FORMAT('%s chỉ còn %s (cảnh báo: %s)', 
        part_record.name, 
        current_stock,
        min_stock
      ),
      jsonb_build_object(
        'part_id', NEW.part_id,
        'part_name', part_record.name,
        'current_stock', current_stock,
        'min_stock', min_stock,
        'branch_id', NEW.branch_id
      ),
      'owner',
      NEW.branch_id,
      NEW.created_by
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_low_stock ON inventory_transactions;
CREATE TRIGGER trigger_notify_low_stock
AFTER INSERT ON inventory_transactions
FOR EACH ROW EXECUTE FUNCTION notify_low_stock();

-- =====================================================
-- STEP 7: DEBT COLLECTION TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION notify_debt_payment()
RETURNS TRIGGER AS $$
DECLARE
  customer_name TEXT;
BEGIN
  -- Get customer name
  SELECT name INTO customer_name FROM customers WHERE id = NEW.customer_id;

  PERFORM create_notification(
    'debt',
    '💰 Thu nợ khách hàng',
    FORMAT('Thu %s từ %s', 
      TO_CHAR(COALESCE(NEW.amount, 0), 'FM999,999,999') || 'đ',
      COALESCE(customer_name, 'Khách hàng')
    ),
    jsonb_build_object(
      'payment_id', NEW.id,
      'customer_id', NEW.customer_id,
      'customer_name', customer_name,
      'amount', NEW.amount,
      'payment_method', NEW.payment_method
    ),
    'owner',
    NEW.branch_id,
    NEW.created_by
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only create if debt_payments table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'debt_payments') THEN
    DROP TRIGGER IF EXISTS trigger_notify_debt_payment ON debt_payments;
    CREATE TRIGGER trigger_notify_debt_payment
    AFTER INSERT ON debt_payments
    FOR EACH ROW EXECUTE FUNCTION notify_debt_payment();
  END IF;
END $$;

-- =====================================================
-- STEP 8: LARGE CASH TRANSACTION TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION notify_large_cash_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify for large transactions (> 10 million VND)
  IF NEW.amount < 10000000 THEN
    RETURN NEW;
  END IF;

  PERFORM create_notification(
    'cash',
    CASE NEW.type
      WHEN 'income' THEN '💵 Thu tiền lớn'
      ELSE '💸 Chi tiền lớn'
    END,
    FORMAT('%s %s - %s', 
      CASE NEW.type WHEN 'income' THEN 'Thu' ELSE 'Chi' END,
      TO_CHAR(NEW.amount, 'FM999,999,999') || 'đ',
      COALESCE(NEW.notes, NEW.category)
    ),
    jsonb_build_object(
      'transaction_id', NEW.id,
      'type', NEW.type,
      'amount', NEW.amount,
      'category', NEW.category,
      'recipient', NEW.recipient,
      'notes', NEW.notes
    ),
    'owner',
    NEW.branch_id,
    NEW.created_by
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_large_cash ON cash_transactions;
CREATE TRIGGER trigger_notify_large_cash
AFTER INSERT ON cash_transactions
FOR EACH ROW EXECUTE FUNCTION notify_large_cash_transaction();

-- =====================================================
-- STEP 9: ENABLE REALTIME FOR NOTIFICATIONS
-- =====================================================

-- Enable realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- =====================================================
-- STEP 10: UTILITY FUNCTIONS
-- =====================================================

-- Mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE notifications 
  SET is_read = TRUE, read_at = NOW()
  WHERE id = notification_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark all notifications as read for current user
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  WITH updated AS (
    UPDATE notifications 
    SET is_read = TRUE, read_at = NOW()
    WHERE is_read = FALSE
    AND (
      recipient_id = auth.uid() 
      OR recipient_id IS NULL
      OR recipient_role IN (SELECT role FROM profiles WHERE id = auth.uid())
    )
    RETURNING id
  )
  SELECT COUNT(*) INTO updated_count FROM updated;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS INTEGER AS $$
DECLARE
  count INTEGER;
BEGIN
  SELECT COUNT(*) INTO count
  FROM notifications
  WHERE is_read = FALSE
  AND (
    recipient_id = auth.uid() 
    OR recipient_id IS NULL
    OR recipient_role IN (SELECT role FROM profiles WHERE id = auth.uid())
  );
  
  RETURN count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- DONE! Summary:
-- =====================================================
-- Tables: notifications
-- Triggers:
--   1. Work Orders: new, status change
--   2. Sales: new sale
--   3. Inventory: receipt, low stock warning
--   4. Debts: payment received
--   5. Cash: large transactions (>10M)
-- Functions:
--   - create_notification()
--   - mark_notification_read()
--   - mark_all_notifications_read()
--   - get_unread_notification_count()
-- =====================================================
