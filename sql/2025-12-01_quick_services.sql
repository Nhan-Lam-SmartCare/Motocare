-- Quick Services table for fast checkout (rửa xe, vá xe, etc.)
-- Created: 2025-12-01

CREATE TABLE IF NOT EXISTS quick_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    price DECIMAL(15,2) NOT NULL DEFAULT 0,
    category VARCHAR(100) DEFAULT 'general',
    description TEXT,
    icon VARCHAR(50) DEFAULT 'wrench',
    color VARCHAR(20) DEFAULT 'blue',
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    branch_id VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_quick_services_active ON quick_services(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_quick_services_branch ON quick_services(branch_id);

-- RLS Policies
ALTER TABLE quick_services ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
CREATE POLICY "quick_services_select" ON quick_services
    FOR SELECT TO authenticated USING (true);

-- Allow users with appropriate role to insert/update/delete
CREATE POLICY "quick_services_insert" ON quick_services
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "quick_services_update" ON quick_services
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "quick_services_delete" ON quick_services
    FOR DELETE TO authenticated USING (true);

-- Insert default quick services
INSERT INTO quick_services (name, price, category, description, icon, color, sort_order) VALUES
    ('Rửa xe máy', 20000, 'wash', 'Rửa xe máy các loại', 'droplets', 'blue', 1),
    ('Rửa xe điện', 25000, 'wash', 'Rửa xe điện các loại', 'droplets', 'cyan', 2),
    ('Vá xe máy', 15000, 'repair', 'Vá săm xe máy', 'wrench', 'orange', 3),
    ('Vá xe điện', 20000, 'repair', 'Vá săm xe điện', 'wrench', 'amber', 4),
    ('Bơm xe', 5000, 'other', 'Bơm lốp xe', 'gauge', 'green', 5),
    ('Thay nhớt xe máy', 50000, 'maintenance', 'Thay nhớt xe máy (chưa tính nhớt)', 'oil-can', 'purple', 6),
    ('Căn chỉnh phanh', 30000, 'repair', 'Căn chỉnh, điều chỉnh phanh', 'disc', 'red', 7),
    ('Sạc bình điện', 10000, 'other', 'Sạc bình ắc quy', 'battery-charging', 'yellow', 8)
ON CONFLICT DO NOTHING;

-- Comment
COMMENT ON TABLE quick_services IS 'Danh sách dịch vụ nhanh cho checkout nhanh (rửa xe, vá xe...)';
