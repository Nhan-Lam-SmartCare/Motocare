-- ============================================================================
-- MIGRATION: CẢI THIỆN DANH MỤC PHÂN CẤP VÀ NHÀ CUNG CẤP MẶC ĐỊNH
-- Ngày: 2026-07-06
-- ============================================================================

-- 1. Thêm cột parent_id và sku_prefix vào bảng categories nếu chưa tồn tại
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS parent_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS sku_prefix TEXT;

-- 2. Thêm cột preferred_supplier_id vào bảng parts nếu chưa tồn tại
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS preferred_supplier_id TEXT REFERENCES public.suppliers(id) ON DELETE SET NULL;

-- 3. Tạo các chỉ mục tối ưu hóa tìm kiếm nhanh
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_parts_preferred_supplier_id ON public.parts(preferred_supplier_id);
