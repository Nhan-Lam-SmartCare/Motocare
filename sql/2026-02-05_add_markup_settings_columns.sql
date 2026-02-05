-- ============================================
-- THÊM CỘT CẤU HÌNH TỶ LỆ GIÁ BÁN VÀO store_settings
-- Ngày: 2026-02-05
-- ============================================

-- Thêm cột % lợi nhuận giá lẻ (mặc định 40%)
ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS retail_markup_percent NUMERIC DEFAULT 40;

COMMENT ON COLUMN store_settings.retail_markup_percent IS 'Phần trăm lợi nhuận giá bán lẻ so với giá nhập. VD: 40 = 40%, giá lẻ = giá nhập × 1.4';

-- Thêm cột % lợi nhuận giá sỉ (mặc định 25%)
ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS wholesale_markup_percent NUMERIC DEFAULT 25;

COMMENT ON COLUMN store_settings.wholesale_markup_percent IS 'Phần trăm lợi nhuận giá bán sỉ so với giá nhập. VD: 25 = 25%, giá sỉ = giá nhập × 1.25';

-- Cập nhật giá trị mặc định cho các rows hiện có (nếu chưa có)
UPDATE store_settings 
SET retail_markup_percent = 40 
WHERE retail_markup_percent IS NULL;

UPDATE store_settings 
SET wholesale_markup_percent = 25 
WHERE wholesale_markup_percent IS NULL;

-- Xác nhận kết quả
SELECT 
  id,
  store_name,
  retail_markup_percent,
  wholesale_markup_percent
FROM store_settings
LIMIT 5;
