-- ============================================================================
-- PREVENT NEGATIVE STOCK - COMPREHENSIVE PROTECTION
-- Date: 2026-02-05
-- Purpose: Ngăn chặn HOÀN TOÀN stock và available âm trong tương lai
-- ============================================================================

-- ============================================================================
-- TRIGGER 1: Ngăn stock âm - Tự động reset về 0 nếu cố gắng set âm
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_negative_stock()
RETURNS TRIGGER AS $$
DECLARE
  branch_key TEXT;
  stock_value INT;
  reserved_value INT;
BEGIN
  -- Kiểm tra và sửa stock âm
  IF NEW.stock IS NOT NULL THEN
    FOR branch_key, stock_value IN 
      SELECT key, value::int FROM jsonb_each_text(NEW.stock)
    LOOP
      IF stock_value < 0 THEN
        NEW.stock = jsonb_set(NEW.stock, ARRAY[branch_key], '0'::jsonb);
        RAISE WARNING 'Stock for % branch % was negative (%), reset to 0', NEW.name, branch_key, stock_value;
      END IF;
    END LOOP;
  END IF;
  
  -- Kiểm tra và sửa reserved > stock (gây available âm)
  IF NEW.reservedstock IS NOT NULL AND NEW.stock IS NOT NULL THEN
    FOR branch_key IN 
      SELECT key FROM jsonb_each_text(NEW.stock)
    LOOP
      stock_value := COALESCE((NEW.stock->>branch_key)::int, 0);
      reserved_value := COALESCE((NEW.reservedstock->>branch_key)::int, 0);
      
      IF reserved_value > stock_value THEN
        -- Giảm reserved xuống bằng stock
        NEW.reservedstock = jsonb_set(
          NEW.reservedstock, 
          ARRAY[branch_key], 
          to_jsonb(stock_value)
        );
        RAISE WARNING 'Reserved for % branch % exceeded stock (% > %), capped to %', 
          NEW.name, branch_key, reserved_value, stock_value, stock_value;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop và recreate trigger
DROP TRIGGER IF EXISTS prevent_negative_stock_trigger ON parts;

CREATE TRIGGER prevent_negative_stock_trigger
  BEFORE INSERT OR UPDATE ON parts
  FOR EACH ROW
  EXECUTE FUNCTION prevent_negative_stock();

-- ============================================================================
-- TRIGGER 2: Ngăn reserved âm
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_negative_reserved()
RETURNS TRIGGER AS $$
DECLARE
  branch_key TEXT;
  reserved_value INT;
BEGIN
  IF NEW.reservedstock IS NOT NULL THEN
    FOR branch_key, reserved_value IN 
      SELECT key, value::int FROM jsonb_each_text(NEW.reservedstock)
    LOOP
      IF reserved_value < 0 THEN
        NEW.reservedstock = jsonb_set(NEW.reservedstock, ARRAY[branch_key], '0'::jsonb);
        RAISE WARNING 'Reserved for % branch % was negative (%), reset to 0', NEW.name, branch_key, reserved_value;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_negative_reserved_trigger ON parts;

CREATE TRIGGER prevent_negative_reserved_trigger
  BEFORE INSERT OR UPDATE ON parts
  FOR EACH ROW
  EXECUTE FUNCTION prevent_negative_reserved();

-- ============================================================================
-- HELPER FUNCTION: Safe stock deduction (dùng trong các RPC functions)
-- ============================================================================

CREATE OR REPLACE FUNCTION mc_safe_deduct_stock(
  p_part_id TEXT,
  p_branch_id TEXT,
  p_quantity INT
) RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_stock INT;
  v_new_stock INT;
BEGIN
  -- Lấy stock hiện tại với row lock
  SELECT COALESCE((stock->>p_branch_id)::int, 0) 
  INTO v_current_stock
  FROM parts 
  WHERE id = p_part_id 
  FOR UPDATE;
  
  -- Tính stock mới, đảm bảo >= 0
  v_new_stock := GREATEST(0, v_current_stock - p_quantity);
  
  -- Update stock
  UPDATE parts
  SET stock = jsonb_set(
    COALESCE(stock, '{}'::jsonb),
    ARRAY[p_branch_id],
    to_jsonb(v_new_stock)
  )
  WHERE id = p_part_id;
  
  RETURN v_new_stock;
END;
$$;

COMMENT ON FUNCTION mc_safe_deduct_stock IS 'Trừ stock an toàn, không bao giờ cho phép âm';

-- ============================================================================
-- HELPER FUNCTION: Safe reserved deduction
-- ============================================================================

CREATE OR REPLACE FUNCTION mc_safe_deduct_reserved(
  p_part_id TEXT,
  p_branch_id TEXT,
  p_quantity INT
) RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_reserved INT;
  v_new_reserved INT;
BEGIN
  -- Lấy reserved hiện tại với row lock
  SELECT COALESCE((reservedstock->>p_branch_id)::int, 0) 
  INTO v_current_reserved
  FROM parts 
  WHERE id = p_part_id 
  FOR UPDATE;
  
  -- Tính reserved mới, đảm bảo >= 0
  v_new_reserved := GREATEST(0, v_current_reserved - p_quantity);
  
  -- Update reserved
  UPDATE parts
  SET reservedstock = jsonb_set(
    COALESCE(reservedstock, '{}'::jsonb),
    ARRAY[p_branch_id],
    to_jsonb(v_new_reserved)
  )
  WHERE id = p_part_id;
  
  RETURN v_new_reserved;
END;
$$;

COMMENT ON FUNCTION mc_safe_deduct_reserved IS 'Giảm reserved an toàn, không bao giờ cho phép âm';

-- ============================================================================
-- HELPER FUNCTION: Safe add reserved (không vượt quá stock)
-- ============================================================================

CREATE OR REPLACE FUNCTION mc_safe_add_reserved(
  p_part_id TEXT,
  p_branch_id TEXT,
  p_quantity INT
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_stock INT;
  v_current_reserved INT;
  v_new_reserved INT;
  v_available INT;
BEGIN
  -- Lấy stock và reserved hiện tại với row lock
  SELECT 
    COALESCE((stock->>p_branch_id)::int, 0),
    COALESCE((reservedstock->>p_branch_id)::int, 0)
  INTO v_current_stock, v_current_reserved
  FROM parts 
  WHERE id = p_part_id 
  FOR UPDATE;
  
  v_available := v_current_stock - v_current_reserved;
  
  -- Nếu không đủ available, chỉ reserve những gì có thể
  IF p_quantity > v_available THEN
    v_new_reserved := v_current_stock; -- Cap tại stock
  ELSE
    v_new_reserved := v_current_reserved + p_quantity;
  END IF;
  
  -- Update reserved
  UPDATE parts
  SET reservedstock = jsonb_set(
    COALESCE(reservedstock, '{}'::jsonb),
    ARRAY[p_branch_id],
    to_jsonb(v_new_reserved)
  )
  WHERE id = p_part_id;
  
  RETURN jsonb_build_object(
    'requested', p_quantity,
    'reserved', v_new_reserved - v_current_reserved,
    'shortage', GREATEST(0, p_quantity - v_available)
  );
END;
$$;

COMMENT ON FUNCTION mc_safe_add_reserved IS 'Thêm reserved an toàn, không vượt quá stock';

-- ============================================================================
-- SCHEDULED JOB: Tự động kiểm tra và sửa stock âm mỗi ngày (optional)
-- ============================================================================

-- Tạo function để chạy định kỳ
CREATE OR REPLACE FUNCTION fix_negative_stock_daily()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_fixed_count INT := 0;
BEGIN
  -- Fix stock âm
  UPDATE parts p
  SET stock = (
    SELECT jsonb_object_agg(key, GREATEST(value::int, 0))
    FROM jsonb_each_text(p.stock)
  )
  WHERE EXISTS (
    SELECT 1 FROM jsonb_each_text(p.stock)
    WHERE value::int < 0
  );
  
  GET DIAGNOSTICS v_fixed_count = ROW_COUNT;
  
  IF v_fixed_count > 0 THEN
    RAISE WARNING 'Fixed % parts with negative stock', v_fixed_count;
  END IF;
  
  -- Fix reserved > stock
  UPDATE parts p
  SET reservedstock = (
    SELECT jsonb_object_agg(
      key, 
      LEAST(
        COALESCE((p.reservedstock->>key)::int, 0),
        value::int
      )
    )
    FROM jsonb_each_text(p.stock)
  )
  WHERE EXISTS (
    SELECT 1 FROM jsonb_each_text(p.stock) s
    WHERE COALESCE((p.reservedstock->>s.key)::int, 0) > s.value::int
  );
  
  GET DIAGNOSTICS v_fixed_count = ROW_COUNT;
  
  IF v_fixed_count > 0 THEN
    RAISE WARNING 'Fixed % parts with reserved > stock', v_fixed_count;
  END IF;
END;
$$;

-- ============================================================================
-- VERIFICATION: Kiểm tra tất cả đã được cài đặt
-- ============================================================================

-- Kiểm tra triggers
SELECT 
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'parts'
  AND trigger_name LIKE 'prevent_%';

-- Kiểm tra functions
SELECT 
  proname as function_name,
  obj_description(oid) as description
FROM pg_proc
WHERE proname IN (
  'prevent_negative_stock',
  'prevent_negative_reserved', 
  'mc_safe_deduct_stock',
  'mc_safe_deduct_reserved',
  'mc_safe_add_reserved',
  'fix_negative_stock_daily'
);
