-- =============================================================================
-- FIX: Tự động cập nhật remaining_amount và paid_amount khi status = 'paid'
-- Date: 2026-02-20
-- Issue: Khi duyệt đơn ứng lương, remaining_amount không được cập nhật
-- =============================================================================

-- Tạo hoặc thay thế function
CREATE OR REPLACE FUNCTION auto_update_amounts_on_status_paid()
RETURNS TRIGGER AS $$
BEGIN
  -- Khi status chuyển thành 'paid' (từ pending/approved)
  -- Tự động set remaining_amount = 0 và paid_amount = advance_amount
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    NEW.remaining_amount = 0;
    NEW.paid_amount = NEW.advance_amount;
    NEW.updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger nếu tồn tại và tạo lại
DROP TRIGGER IF EXISTS trigger_auto_update_on_paid ON employee_advances;

CREATE TRIGGER trigger_auto_update_on_paid
  BEFORE UPDATE ON employee_advances
  FOR EACH ROW
  WHEN (NEW.status = 'paid' AND OLD.status != 'paid')
  EXECUTE FUNCTION auto_update_amounts_on_status_paid();

-- Verify trigger được tạo thành công
SELECT 
    tgname as trigger_name,
    tgenabled as is_enabled,
    pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
WHERE tgname = 'trigger_auto_update_on_paid';

-- Test trigger (optional - comment out khi chạy production)
-- DO $$
-- DECLARE
--     test_id UUID;
-- BEGIN
--     -- Tạo đơn test
--     INSERT INTO employee_advances (
--         employee_id, employee_name, advance_amount, 
--         payment_method, status, branch_id, 
--         remaining_amount, paid_amount
--     ) VALUES (
--         'test-emp-id', 'Test Employee', 1000000,
--         'cash', 'pending', gen_random_uuid(),
--         1000000, 0
--     ) RETURNING id INTO test_id;
    
--     -- Update status thành 'paid' - trigger sẽ tự động cập nhật amounts
--     UPDATE employee_advances 
--     SET status = 'paid' 
--     WHERE id = test_id;
    
--     -- Verify
--     IF EXISTS (
--         SELECT 1 FROM employee_advances 
--         WHERE id = test_id 
--             AND remaining_amount = 0 
--             AND paid_amount = 1000000
--     ) THEN
--         RAISE NOTICE 'Trigger test PASSED ✅';
--     ELSE
--         RAISE EXCEPTION 'Trigger test FAILED ❌';
--     END IF;
    
--     -- Cleanup
--     DELETE FROM employee_advances WHERE id = test_id;
-- END $$;

COMMENT ON FUNCTION auto_update_amounts_on_status_paid() IS 
'Tự động set remaining_amount = 0 và paid_amount = advance_amount khi status chuyển thành paid';

COMMENT ON TRIGGER trigger_auto_update_on_paid ON employee_advances IS
'Trigger chạy BEFORE UPDATE để đảm bảo data consistency khi duyệt đơn ứng lương';

-- Thông báo hoàn tất
DO $$
BEGIN
    RAISE NOTICE '✅ Đã tạo trigger tự động cập nhật amounts khi status = paid';
END $$;
