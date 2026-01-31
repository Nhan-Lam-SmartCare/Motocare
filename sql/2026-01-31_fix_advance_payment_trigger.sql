-- =============================================================================
-- FIX: Đảm bảo trigger cập nhật remaining_amount và paid_amount khi thanh toán
-- Date: 2026-01-31
-- Issue: remaining_amount và paid_amount không được cập nhật khi nhân viên trả tiền
-- =============================================================================

-- Tạo lại function (idempotent)
CREATE OR REPLACE FUNCTION update_advance_amounts_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE employee_advances
  SET 
    paid_amount = paid_amount + NEW.amount,
    remaining_amount = remaining_amount - NEW.amount,
    updated_at = NOW()
  WHERE id = NEW.advance_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger nếu tồn tại và tạo lại
DROP TRIGGER IF EXISTS trigger_update_advance_on_payment ON employee_advance_payments;

CREATE TRIGGER trigger_update_advance_on_payment
  AFTER INSERT ON employee_advance_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_advance_amounts_on_payment();

-- Verify
SELECT 'Trigger trigger_update_advance_on_payment created successfully!' AS result;
