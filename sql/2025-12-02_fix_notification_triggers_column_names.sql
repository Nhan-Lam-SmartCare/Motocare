-- Fix notification triggers for work_orders
-- The column names are lowercase (vehiclemodel, licenseplate, branchid, etc.)
-- NOT camelCase (vehicleModel, licensePlate, branchId)

-- 1. Fix New Work Order Created trigger
CREATE OR REPLACE FUNCTION notify_new_work_order()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_notification(
    'work_order',
    '🔧 Phiếu sửa chữa mới',
    FORMAT('Phiếu %s - %s %s đã được tạo', 
      LEFT(NEW.id, 15),  -- Show more of the ID for clarity
      COALESCE(NEW.vehiclemodel, ''),
      COALESCE(NEW.licenseplate, '')
    ),
    jsonb_build_object(
      'work_order_id', NEW.id,
      'status', NEW.status,
      'customer', COALESCE(NEW.customername, ''),
      'vehicle', COALESCE(NEW.vehiclemodel, '') || ' ' || COALESCE(NEW.licenseplate, ''),
      'total', COALESCE(NEW.total, 0)
    ),
    'owner',
    NEW.branchid,  -- lowercase!
    NULL  -- No created_by column
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the insert
  RAISE WARNING 'notify_new_work_order failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix Work Order Status Changed trigger
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
        WHEN 'Đã sửa xong' THEN '✅ Hoàn thành phiếu'
        WHEN 'Trả máy' THEN '🏍️ Đã giao xe'
        WHEN 'Đã hủy' THEN '❌ Phiếu đã hủy'
        ELSE '📋 Cập nhật phiếu'
      END,
      FORMAT('Phiếu %s: %s → %s', 
        LEFT(NEW.id, 15),
        COALESCE(OLD.status, 'Mới'),
        NEW.status
      ),
      jsonb_build_object(
        'work_order_id', NEW.id,
        'customer', COALESCE(NEW.customername, ''),
        'old_status', OLD.status,
        'new_status', NEW.status,
        'total', COALESCE(NEW.total, 0)
      ),
      'owner',
      NEW.branchid,  -- lowercase!
      NULL
    );
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the update
  RAISE WARNING 'notify_work_order_status_change failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recreate triggers
DROP TRIGGER IF EXISTS trigger_notify_new_work_order ON work_orders;
CREATE TRIGGER trigger_notify_new_work_order
AFTER INSERT ON work_orders
FOR EACH ROW EXECUTE FUNCTION notify_new_work_order();

DROP TRIGGER IF EXISTS trigger_notify_work_order_status ON work_orders;
CREATE TRIGGER trigger_notify_work_order_status
AFTER UPDATE ON work_orders
FOR EACH ROW EXECUTE FUNCTION notify_work_order_status_change();

-- Verify triggers are created
SELECT tgname, tgrelid::regclass, tgenabled 
FROM pg_trigger 
WHERE tgrelid = 'work_orders'::regclass;
