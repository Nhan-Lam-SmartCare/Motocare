-- ============================================
-- FIX: Thêm tất cả các cột snake_case còn thiếu
-- Chạy file này sau DEMO_MASTER_SETUP.sql
-- ============================================

-- NOTIFICATIONS: Thêm alias cột
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS branch_id TEXT DEFAULT 'CN1';

-- Sync data
UPDATE public.notifications SET 
  created_at = COALESCE("createdAt", NOW()),
  user_id = "userId",
  branch_id = COALESCE("branchId", 'CN1')
WHERE created_at IS NULL;

-- REPAIR_TEMPLATES: Thêm alias cột
ALTER TABLE public.repair_templates 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS labor_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS vehicle_types TEXT[],
ADD COLUMN IF NOT EXISTS estimated_time TEXT;

-- Sync data
UPDATE public.repair_templates SET 
  created_at = COALESCE("createdAt", NOW()),
  updated_at = COALESCE("updatedAt", NOW()),
  labor_cost = COALESCE("laborCost", 0),
  vehicle_types = "vehicleTypes",
  estimated_time = "estimatedTime"
WHERE created_at IS NULL;

-- EMPLOYEES: Thêm alias cột
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS branch_id TEXT DEFAULT 'CN1',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.employees SET 
  branch_id = COALESCE("branchId", 'CN1'),
  created_at = COALESCE("createdAt", NOW())
WHERE branch_id IS NULL;

-- SUPPLIERS: Thêm alias cột
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS tax_id TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.suppliers SET 
  tax_id = "taxId",
  created_at = COALESCE("createdAt", NOW())
WHERE created_at IS NULL;

-- STORE_SETTINGS: Thêm alias cột
ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS store_name TEXT,
ADD COLUMN IF NOT EXISTS store_address TEXT,
ADD COLUMN IF NOT EXISTS store_phone TEXT,
ADD COLUMN IF NOT EXISTS store_email TEXT,
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS bank_account TEXT,
ADD COLUMN IF NOT EXISTS bank_account_name TEXT,
ADD COLUMN IF NOT EXISTS branch_id TEXT DEFAULT 'CN1',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.store_settings SET 
  store_name = "storeName",
  store_address = "storeAddress",
  store_phone = "storePhone",
  store_email = "storeEmail",
  bank_name = "bankName",
  bank_account = "bankAccount",
  bank_account_name = "bankAccountName",
  branch_id = COALESCE("branchId", 'CN1'),
  created_at = COALESCE("createdAt", NOW())
WHERE store_name IS NULL;

-- VEHICLES: Thêm alias cột
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS customer_id TEXT,
ADD COLUMN IF NOT EXISTS license_plate TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.vehicles SET 
  customer_id = "customerId",
  license_plate = "licensePlate",
  created_at = COALESCE("createdAt", NOW())
WHERE created_at IS NULL;

-- PARTS: Thêm alias cột giá
ALTER TABLE public.parts 
ADD COLUMN IF NOT EXISTS retail_price JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS wholesale_price JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS cost_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS warranty_period TEXT;

UPDATE public.parts SET 
  retail_price = COALESCE("retailPrice", '{}'::jsonb),
  wholesale_price = COALESCE("wholesalePrice", '{}'::jsonb),
  cost_price = COALESCE("costPrice", 0),
  warranty_period = warrantyperiod
WHERE retail_price = '{}'::jsonb;

-- ============================================
-- HOÀN TẤT!
-- ============================================
SELECT 'All column aliases added!' AS status;
