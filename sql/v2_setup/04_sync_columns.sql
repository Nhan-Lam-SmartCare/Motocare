-- ===================================================================
-- MOTOCARE V2 - SCHEMA SYNCHRONIZATION (Vá cột thiếu từ V1)
-- File: sql/v2_setup/04_sync_columns.sql
-- ===================================================================
-- 👉 HƯỚNG DẪN:
-- Chạy file này trên SQL Editor của Supabase V2 (Project mới) 
-- để thêm các cột còn thiếu do V1 phát triển thêm theo thời gian.
-- ===================================================================

-- 1. store_settings
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS print_paper_size TEXT DEFAULT 'K80';
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS print_show_logo BOOLEAN DEFAULT true;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS print_greeting TEXT DEFAULT 'Cảm ơn quý khách! Hẹn gặp lại';
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS theme_preset TEXT DEFAULT 'blue';
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS accountant_name TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS accountant_phone TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS "bankAccountHolder" TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS bank_account_holder TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS bank_branch TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS "bankAccountNumber" TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS "bankName" TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS "bankBin" TEXT;

-- 2. categories
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS parent_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS sku_prefix TEXT;

-- 3. parts
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS barcode TEXT;
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS preferred_supplier_id TEXT REFERENCES public.suppliers(id) ON DELETE SET NULL;
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS minstock JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS "warrantyPeriod" TEXT;

-- 4. customers
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS vehicleModel TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS licensePlate TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS vehicles JSONB;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS segment TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS loyaltyPoints INTEGER;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS totalSpent NUMERIC;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS visitCount INTEGER;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS lastVisit TIMESTAMPTZ;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS tax_code TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS is_company BOOLEAN DEFAULT false;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS company_address TEXT;

-- 5. cash_transactions
ALTER TABLE public.cash_transactions ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'income';
ALTER TABLE public.cash_transactions ADD COLUMN IF NOT EXISTS target_name TEXT;
ALTER TABLE public.cash_transactions ADD COLUMN IF NOT EXISTS saleid TEXT;

-- 6. sales
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS cashtransactionid TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;

-- 7. work_orders
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS partsUsed JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS "additionalServices" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS depositTransactionId TEXT;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS cashTransactionId TEXT;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS depositDate TIMESTAMPTZ;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS paymentDate TIMESTAMPTZ;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS currentkm INTEGER;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS refunded BOOLEAN DEFAULT false;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS refund_transaction_id TEXT;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS refund_reason TEXT;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS inventory_deducted BOOLEAN DEFAULT false;

-- 8. inventory_transactions
ALTER TABLE public.inventory_transactions ADD COLUMN IF NOT EXISTS supplierId TEXT;

-- 9. customer_debts
ALTER TABLE public.customer_debts ADD COLUMN IF NOT EXISTS work_order_id TEXT;

-- 10. repair_templates
ALTER TABLE public.repair_templates ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.repair_templates ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 30;
ALTER TABLE public.repair_templates ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.repair_templates ADD COLUMN IF NOT EXISTS parts JSONB DEFAULT '[]'::jsonb;
