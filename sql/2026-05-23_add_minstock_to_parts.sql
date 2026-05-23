-- ============================================================================
-- MIGRATION: THÊM CỘT CẤU HÌNH HẠN MỨC TỒN KHO TỐI THIỂU CHO PHỤ TÙNG
-- Ngày: 2026-05-23
-- Mục đích: Hỗ trợ cấu hình tồn kho tối thiểu (min_stock) riêng cho từng chi nhánh
-- ============================================================================

-- Thêm cột minstock kiểu jsonb vào bảng parts nếu chưa tồn tại
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS minstock jsonb DEFAULT '{}'::jsonb;
