-- Tạm thời tắt RLS để test (CHỈ DÙNG TRONG DEV)
-- Chạy script này trong Supabase SQL Editor

ALTER TABLE capital DISABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_assets DISABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_asset_depreciation DISABLE ROW LEVEL SECURITY;

-- Sau khi test xong, bật lại bằng:
-- ALTER TABLE capital ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE fixed_assets ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE fixed_asset_depreciation ENABLE ROW LEVEL SECURITY;
