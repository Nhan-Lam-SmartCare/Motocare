-- FIX CÁC LINH KIỆN CÓ STOCK ÂM
-- Tạo bản ghi nhập kho bù để làm tròn về 0
-- Date: 2026-01-27

DO $$
BEGIN
  -- 1. Bộ nắp trước tay lái "NHB35P" - bù 1 cái
  INSERT INTO inventory_transactions(
    id, type, "partId", "partName", quantity, date, 
    "unitPrice", "totalPrice", "branchId", notes
  )
  SELECT 
    gen_random_uuid()::text,
    'Nhập kho',
    id,
    name,
    1, -- Số lượng bù
    NOW(),
    0, -- Giá bằng 0 vì đây là bù tồn kho
    0,
    'CN1',
    '[BÙ TỒN KHO ÂM] Nhập bù để cân đối tồn kho'
  FROM parts
  WHERE sku = 'NHB35P';
  
  -- 2. Chén cổ nhỏ - bù 1 cái
  INSERT INTO inventory_transactions(
    id, type, "partId", "partName", quantity, date,
    "unitPrice", "totalPrice", "branchId", notes
  )
  SELECT 
    gen_random_uuid()::text,
    'Nhập kho',
    id,
    name,
    1, -- Số lượng bù
    NOW(),
    0, -- Giá bằng 0 vì đây là bù tồn kho
    0,
    'CN1',
    '[BÙ TỒN KHO ÂM] Nhập bù để cân đối tồn kho'
  FROM parts
  WHERE sku = 'PT-1764416011542';
  
  -- Cập nhật stock về 0 cho cả 2 linh kiện
  UPDATE parts
  SET stock = jsonb_set(stock, ARRAY['CN1'], '0')
  WHERE sku IN ('NHB35P', 'PT-1764416011542');
  
  RAISE NOTICE 'Đã bù tồn kho cho 2 linh kiện bị âm';
END $$;

-- Kiểm tra lại
SELECT name, sku, (stock->>'CN1')::int as stock
FROM parts
WHERE sku IN ('NHB35P', 'PT-1764416011542');
