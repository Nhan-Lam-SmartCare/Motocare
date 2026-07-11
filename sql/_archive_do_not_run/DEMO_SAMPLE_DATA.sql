-- ============================================
-- DỮ LIỆU MẪU CHO MOTOCARE DEMO
-- Chạy file này SAU KHI đã chạy các file schema
-- ============================================

-- 1. KHÁCH HÀNG MẪU
INSERT INTO public.customers (id, name, phone, created_at) VALUES
('cust-demo-001', 'Nguyễn Văn An', '0901234567', NOW()),
('cust-demo-002', 'Trần Thị Bình', '0912345678', NOW()),
('cust-demo-003', 'Lê Hoàng Cường', '0923456789', NOW()),
('cust-demo-004', 'Phạm Minh Đức', '0934567890', NOW()),
('cust-demo-005', 'Hoàng Thị Em', '0945678901', NOW()),
('cust-demo-006', 'Vũ Quang Phúc', '0956789012', NOW()),
('cust-demo-007', 'Đặng Thu Hà', '0967890123', NOW()),
('cust-demo-008', 'Bùi Văn Kiên', '0978901234', NOW())
ON CONFLICT (id) DO NOTHING;

-- 2. DANH MỤC PHỤ TÙNG
INSERT INTO public.categories (id, name, icon, color) VALUES
('cat-demo-01', 'Nhớt xe máy', '🛢️', '#4A90A4'),
('cat-demo-02', 'Lọc gió', '💨', '#50C878'),
('cat-demo-03', 'Bugi', '⚡', '#FFD700'),
('cat-demo-04', 'Dây curoa', '🔗', '#8B4513'),
('cat-demo-05', 'Bố thắng', '🛑', '#DC143C'),
('cat-demo-06', 'Lốp xe', '🛞', '#2F4F4F'),
('cat-demo-07', 'Ắc quy', '🔋', '#228B22'),
('cat-demo-08', 'Đèn xe', '💡', '#FFA500')
ON CONFLICT (id) DO NOTHING;

-- 3. PHỤ TÙNG MẪU (chỉ dùng cột cơ bản)
-- Lưu ý: Nếu thiếu cột, hãy chạy file schema trước
INSERT INTO public.parts (id, name, sku, stock, category, description) VALUES
-- Nhớt
('part-demo-001', 'Nhớt Castrol Power1 10W40 0.8L', 'NHOT-CP1-08', '{"CN1": 50}'::jsonb, 'Nhớt xe máy', 'Nhớt tổng hợp cao cấp cho xe số'),
('part-demo-002', 'Nhớt Shell Advance AX7 1L', 'NHOT-SA7-1L', '{"CN1": 40}'::jsonb, 'Nhớt xe máy', 'Nhớt bán tổng hợp cho xe tay ga'),
('part-demo-003', 'Nhớt Motul 7100 10W40 1L', 'NHOT-MTL-7100', '{"CN1": 25}'::jsonb, 'Nhớt xe máy', 'Nhớt Full Synthetic cao cấp'),

-- Lọc gió
('part-demo-004', 'Lọc gió Wave Alpha', 'LG-WAVE-A', '{"CN1": 30}'::jsonb, 'Lọc gió', 'Lọc gió chính hãng Honda'),
('part-demo-005', 'Lọc gió Air Blade', 'LG-AIRBLADE', '{"CN1": 25}'::jsonb, 'Lọc gió', 'Lọc gió xe Air Blade 125'),
('part-demo-006', 'Lọc gió SH Mode', 'LG-SHMODE', '{"CN1": 20}'::jsonb, 'Lọc gió', 'Lọc gió SH Mode 125'),

-- Bugi
('part-demo-007', 'Bugi NGK CPR8EA-9', 'BG-NGK-CPR8', '{"CN1": 100}'::jsonb, 'Bugi', 'Bugi tiêu chuẩn cho xe số'),
('part-demo-008', 'Bugi Denso Iridium', 'BG-DENSO-IR', '{"CN1": 50}'::jsonb, 'Bugi', 'Bugi Iridium cao cấp'),

-- Dây curoa
('part-demo-009', 'Dây curoa Air Blade 125', 'DC-AB125', '{"CN1": 15}'::jsonb, 'Dây curoa', 'Dây curoa chính hãng Honda'),
('part-demo-010', 'Dây curoa NVX 155', 'DC-NVX155', '{"CN1": 12}'::jsonb, 'Dây curoa', 'Dây curoa chính hãng Yamaha'),

-- Bố thắng
('part-demo-011', 'Bố thắng đĩa Wave RSX', 'BT-WAVE-D', '{"CN1": 40}'::jsonb, 'Bố thắng', 'Bố thắng đĩa trước'),
('part-demo-012', 'Bố thắng đùm Winner', 'BT-WINNER-S', '{"CN1": 35}'::jsonb, 'Bố thắng', 'Bố thắng sau Winner X'),

-- Lốp xe
('part-demo-013', 'Lốp Michelin City Grip 100/90-14', 'LOP-MCG-14', '{"CN1": 8}'::jsonb, 'Lốp xe', 'Lốp cao cấp cho xe tay ga'),
('part-demo-014', 'Lốp IRC NR73 2.50-17', 'LOP-IRC-17', '{"CN1": 10}'::jsonb, 'Lốp xe', 'Lốp xe số phổ thông'),

-- Ắc quy
('part-demo-015', 'Ắc quy GS GTZ5S', 'AQ-GS-5S', '{"CN1": 20}'::jsonb, 'Ắc quy', 'Ắc quy 12V 3.5Ah'),
('part-demo-016', 'Ắc quy Yuasa YTX7A-BS', 'AQ-YUA-7A', '{"CN1": 15}'::jsonb, 'Ắc quy', 'Ắc quy 12V 6Ah')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- LƯU Ý: Các bảng sau CHƯA tồn tại trong demo:
-- - suppliers (Nhà cung cấp)
-- - employees (Nhân viên)  
-- - store_settings (Cài đặt cửa hàng)
-- Anh cần chạy thêm file schema nếu muốn dùng các bảng này
-- ============================================

-- ============================================
-- HOÀN TẤT! Dữ liệu mẫu đã được thêm vào
-- ============================================
SELECT 'Khách hàng: ' || COUNT(*) FROM customers WHERE id LIKE 'cust-demo%'
UNION ALL
SELECT 'Danh mục: ' || COUNT(*) FROM categories WHERE id LIKE 'cat-demo%'
UNION ALL
SELECT 'Phụ tùng: ' || COUNT(*) FROM parts WHERE id LIKE 'part-demo%';

