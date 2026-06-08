-- =====================================================
-- MOTOCARE AUTHENTICATION & SETTINGS SCHEMA
-- =====================================================
-- Run this after supabase_setup.sql

-- =====================================================
-- 1. USER PROFILES TABLE (extends auth.users)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'staff')),
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  branch_id TEXT, -- Which branch this user belongs to
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- Owners and managers can view all profiles
CREATE POLICY "Owners and managers can view all profiles"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Only owners can update user profiles
CREATE POLICY "Only owners can update profiles"
  ON user_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Only owners can insert new users
CREATE POLICY "Only owners can insert profiles"
  ON user_profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- =====================================================
-- 2. STORE SETTINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name TEXT NOT NULL,
  store_name_en TEXT, -- English name (optional)
  slogan TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  tax_code TEXT, -- Mã số thuế
  
  -- Logo & Branding
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3B82F6', -- Tailwind blue-500
  
  -- Business info
  business_hours TEXT, -- "8:00 - 18:00 (T2-T7)"
  established_year INTEGER,
  
  -- Banking info (for invoices)
  bank_name TEXT,
  bank_account_number TEXT,
  bank_account_holder TEXT,
  bank_branch TEXT,
  
  -- Invoice settings
  invoice_prefix TEXT DEFAULT 'HD', -- Hóa đơn
  receipt_prefix TEXT DEFAULT 'PN', -- Phiếu nhập
  work_order_prefix TEXT DEFAULT 'SC', -- Sửa chữa
  invoice_footer_note TEXT, -- "Cảm ơn quý khách..."
  
  -- System settings
  currency TEXT DEFAULT 'VND',
  date_format TEXT DEFAULT 'DD/MM/YYYY',
  timezone TEXT DEFAULT 'Asia/Ho_Chi_Minh',
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for store_settings
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read store settings
CREATE POLICY "Authenticated users can view store settings"
  ON store_settings FOR SELECT
  TO authenticated
  USING (true);

-- Only owners can update store settings
CREATE POLICY "Only owners can update store settings"
  ON store_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Only owners can insert store settings
CREATE POLICY "Only owners can insert store settings"
  ON store_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- =====================================================
-- 3. AUDIT LOG TABLE (Track sensitive actions)
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL, -- 'login', 'logout', 'delete_sale', 'update_price', etc.
  table_name TEXT,
  record_id TEXT,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- RLS for audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only owners can view audit logs
CREATE POLICY "Only owners can view audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- =====================================================
-- 4. DEMO DATA - Create sample users
-- =====================================================

-- Note: You need to create these users in Supabase Auth Dashboard first
-- Then insert their profiles here

-- Example: Insert profiles for demo users
-- Replace 'user-uuid-here' with actual UUIDs from auth.users

/*
INSERT INTO user_profiles (id, email, role, full_name, phone, branch_id)
VALUES
  ('owner-uuid', 'owner@motocare.vn', 'owner', 'Nguyễn Văn A', '0912345678', 'CN1'),
  ('manager-uuid', 'manager@motocare.vn', 'manager', 'Trần Thị B', '0923456789', 'CN1'),
  ('staff-uuid', 'staff@motocare.vn', 'staff', 'Lê Văn C', '0934567890', 'CN1');
*/

-- Insert default store settings
INSERT INTO store_settings (
  store_name,
  store_name_en,
  slogan,
  address,
  phone,
  email,
  tax_code,
  bank_name,
  bank_account_number,
  bank_account_holder,
  invoice_footer_note
)
VALUES (
  'Nhân Lâm SmartCare',
  'Nhan Lam SmartCare',
  'Chăm sóc xe máy chuyên nghiệp',
  '123 Đường ABC, Quận 1, TP.HCM',
  '0901234567',
  'contact@motocare.vn',
  '0123456789',
  'Vietcombank',
  '1234567890',
  'NGUYEN VAN A',
  'Cảm ơn quý khách đã tin tưởng và sử dụng dịch vụ!'
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 5. FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_profiles
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for store_settings
CREATE TRIGGER update_store_settings_updated_at
  BEFORE UPDATE ON store_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile automatically when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'staff'); -- Default role is staff
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. Create users in Supabase Auth Dashboard first:
--    - owner@motocare.vn (password: 123456)
--    - manager@motocare.vn (password: 123456)
--    - staff@motocare.vn (password: 123456)
--
-- 2. Then update their roles in user_profiles table:
--    UPDATE user_profiles SET role = 'owner' WHERE email = 'owner@motocare.vn';
--    UPDATE user_profiles SET role = 'manager' WHERE email = 'manager@motocare.vn';
--
-- 3. Test authentication in your app
--
-- 4. For production, use strong passwords and enable 2FA
