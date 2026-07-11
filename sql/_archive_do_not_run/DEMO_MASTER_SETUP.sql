-- ============================================
-- MASTER SCRIPT: SETUP COMPLETE DEMO DATABASE
-- Chạy file này MỘT LẦN để tạo đầy đủ các bảng
-- ============================================

-- 1. BẢNG PROFILES (đã tạo trước đó, bỏ qua nếu có)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'staff',
  branch_id TEXT DEFAULT 'CN1',
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. BẢNG SUPPLIERS (Nhà cung cấp)
CREATE TABLE IF NOT EXISTS public.suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  email TEXT,
  "taxId" TEXT,
  notes TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BẢNG EMPLOYEES (Nhân viên)
CREATE TABLE IF NOT EXISTS public.employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  role TEXT DEFAULT 'technician',
  salary NUMERIC DEFAULT 0,
  "branchId" TEXT DEFAULT 'CN1',
  active BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 4. BẢNG STORE_SETTINGS (Cài đặt cửa hàng)
CREATE TABLE IF NOT EXISTS public.store_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  "storeName" TEXT,
  "storeAddress" TEXT,
  "storePhone" TEXT,
  "storeEmail" TEXT,
  "bankName" TEXT,
  "bankAccount" TEXT,
  "bankAccountName" TEXT,
  "branchId" TEXT DEFAULT 'CN1',
  logo TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 5. BẢNG REPAIR_TEMPLATES (Mẫu sửa chữa)
CREATE TABLE IF NOT EXISTS public.repair_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  "vehicleTypes" TEXT[],
  services JSONB DEFAULT '[]'::jsonb,
  parts JSONB DEFAULT '[]'::jsonb,
  "laborCost" NUMERIC DEFAULT 0,
  "estimatedTime" TEXT,
  "branchId" TEXT DEFAULT 'CN1',
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 6. BỔ SUNG CỘT CHO BẢNG PARTS
ALTER TABLE public.parts 
ADD COLUMN IF NOT EXISTS "retailPrice" JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS "wholesalePrice" JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS "costPrice" NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS barcode TEXT;

-- 7. BẢNG NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info',
  "userId" UUID,
  "branchId" TEXT,
  read BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 8. BẢNG VEHICLES (Phương tiện khách hàng)
CREATE TABLE IF NOT EXISTS public.vehicles (
  id TEXT PRIMARY KEY,
  "customerId" TEXT,
  model TEXT,
  "licensePlate" TEXT,
  color TEXT,
  year INTEGER,
  notes TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TẮT RLS CHO TẤT CẢ CÁC BẢNG (để demo dễ hơn)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles DISABLE ROW LEVEL SECURITY;

-- 10. THÊM DỮ LIỆU CƠ BẢN

-- Store settings
INSERT INTO public.store_settings (id, "storeName", "storeAddress", "storePhone", "branchId")
VALUES ('default', 'MotoCare Demo', '123 Demo Street, HCM', '0909123456', 'CN1')
ON CONFLICT (id) DO NOTHING;

-- Nhân viên mẫu
INSERT INTO public.employees (id, name, phone, role, "branchId", active) VALUES
('emp-001', 'Nguyễn Văn Thợ', '0911111111', 'technician', 'CN1', true),
('emp-002', 'Trần Văn Kỹ', '0922222222', 'technician', 'CN1', true)
ON CONFLICT (id) DO NOTHING;

-- Nhà cung cấp mẫu
INSERT INTO public.suppliers (id, name, phone, address) VALUES
('sup-001', 'Công ty Phụ tùng ABC', '02838123456', '123 Lý Thường Kiệt, Q.10'),
('sup-002', 'Nhà phân phối Nhớt XYZ', '02839234567', '456 Nguyễn Văn Cừ, Q.5')
ON CONFLICT (id) DO NOTHING;

-- Cập nhật parts với giá
UPDATE public.parts SET 
  "retailPrice" = '{"CN1": 100000}'::jsonb,
  "wholesalePrice" = '{"CN1": 85000}'::jsonb,
  "costPrice" = 70000
WHERE "retailPrice" = '{}'::jsonb OR "retailPrice" IS NULL;

-- ============================================
-- HOÀN TẤT! 
-- ============================================
SELECT 'Setup completed!' AS status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
