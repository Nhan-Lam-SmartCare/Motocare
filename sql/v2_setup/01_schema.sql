-- ===================================================================
-- MOTOCARE V2 - SCHEMA INITIALIZATION
-- Supabase Project V2 (public schema)
-- ===================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CUSTOMERS
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    -- Columns V1 added over time (sql/add_missing_customer_columns.sql).
    -- Unquoted like V1 → actual column names are lowercase.
    vehicleModel TEXT,
    licensePlate TEXT,
    vehicles JSONB,               -- embedded vehicle list, read by get_public_work_order
    status TEXT,
    segment TEXT,
    loyaltyPoints INTEGER,
    totalSpent NUMERIC,
    visitCount INTEGER,
    lastVisit TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. VEHICLES
CREATE TABLE IF NOT EXISTS public.vehicles (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES public.customers(id) ON DELETE SET NULL,
    license_plate TEXT NOT NULL,
    vehicle_model TEXT,
    frame_number TEXT,
    engine_number TEXT,
    color TEXT,
    year INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    icon TEXT,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PARTS (Master catalog with branch JSONB support)
CREATE TABLE IF NOT EXISTS public.parts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sku TEXT NOT NULL UNIQUE,
    stock JSONB DEFAULT '{}'::jsonb,
    reservedstock JSONB DEFAULT '{}'::jsonb,
    "costPrice" JSONB DEFAULT '{}'::jsonb,
    "retailPrice" JSONB DEFAULT '{}'::jsonb,
    "wholesalePrice" JSONB DEFAULT '{}'::jsonb,
    category TEXT,
    description TEXT,
    warrantyperiod TEXT, -- in V1 this is lowercase
    image_url TEXT,
    min_stock NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. SUPPLIERS
CREATE TABLE IF NOT EXISTS public.suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    email TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. PAYMENT SOURCES
CREATE TABLE IF NOT EXISTS public.payment_sources (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    balance JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. WORK ORDERS (Service Receipts)
CREATE TABLE IF NOT EXISTS public.work_orders (
    id TEXT PRIMARY KEY,
    creationdate TIMESTAMPTZ NOT NULL,
    customername TEXT NOT NULL,
    customerphone TEXT,
    vehiclemodel TEXT,
    licenseplate TEXT,
    issuedescription TEXT,
    technicianname TEXT,
    status TEXT NOT NULL DEFAULT 'Tiếp nhận',
    laborcost NUMERIC DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    -- Dual-write JSONB mirror (per Ke hoach.md 3.1): kept in sync with
    -- work_order_items by every atomic RPC so V1 UI keeps working unchanged.
    -- Unquoted like V1, so the actual column name is lowercase `partsused`.
    partsUsed JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    total NUMERIC DEFAULT 0,
    branchid TEXT NOT NULL,
    depositamount NUMERIC DEFAULT 0,
    depositdate TIMESTAMPTZ,
    deposittransactionid TEXT,
    paymentstatus TEXT DEFAULT 'unpaid',
    paymentmethod TEXT,
    additionalpayment NUMERIC DEFAULT 0,
    totalpaid NUMERIC DEFAULT 0,
    remainingamount NUMERIC DEFAULT 0,
    paymentdate TIMESTAMPTZ,
    cashtransactionid TEXT,
    vehicleid TEXT REFERENCES public.vehicles(id) ON DELETE SET NULL,
    currentkm INTEGER,
    additionalservices JSONB DEFAULT '[]'::jsonb,
    refunded BOOLEAN DEFAULT FALSE,
    refunded_at TIMESTAMPTZ,
    refund_transaction_id TEXT,
    refund_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. WORK ORDER ITEMS (Normalized from JSONB partsUsed)
CREATE TABLE IF NOT EXISTS public.work_order_items (
    id TEXT PRIMARY KEY, -- format: work_order_id || '_' || line_no
    work_order_id TEXT REFERENCES public.work_orders(id) ON DELETE CASCADE,
    part_id TEXT REFERENCES public.parts(id) ON DELETE SET NULL, -- Nullable to support legacy/deleted parts
    part_name TEXT NOT NULL,
    sku TEXT NOT NULL,
    category TEXT,
    quantity NUMERIC NOT NULL DEFAULT 1,
    price NUMERIC NOT NULL DEFAULT 0,
    cost_price NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. SALES (Retail POS sales)
CREATE TABLE IF NOT EXISTS public.sales (
    id TEXT PRIMARY KEY,
    date TIMESTAMPTZ NOT NULL,
    -- Dual-write JSONB mirror (per Ke hoach.md 3.1): kept in sync with
    -- sale_items by every atomic RPC so V1 UI keeps working unchanged.
    items JSONB DEFAULT '[]'::jsonb,
    subtotal NUMERIC NOT NULL DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    total NUMERIC NOT NULL DEFAULT 0,
    customer JSONB NOT NULL DEFAULT '{}'::jsonb,
    paymentmethod TEXT NOT NULL,
    userid TEXT, -- References auth.users(id) via UUID (handled in trigger/migration)
    costprice JSONB DEFAULT '{}'::jsonb,
    vatrate NUMERIC,
    branchid TEXT NOT NULL,
    cashtransactionid TEXT,
    sale_code TEXT,
    refunded BOOLEAN DEFAULT FALSE,
    refunded_at TIMESTAMPTZ,
    refund_transaction_id TEXT,
    refund_reason TEXT,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. SALE ITEMS (Normalized from JSONB items)
CREATE TABLE IF NOT EXISTS public.sale_items (
    id TEXT PRIMARY KEY, -- format: sale_id || '_' || line_no
    sale_id TEXT REFERENCES public.sales(id) ON DELETE CASCADE,
    part_id TEXT REFERENCES public.parts(id) ON DELETE SET NULL, -- Nullable for quick services/deleted parts
    part_name TEXT NOT NULL,
    sku TEXT NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 1,
    price NUMERIC NOT NULL DEFAULT 0,
    cost_price NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. CASH TRANSACTIONS (Ledger)
CREATE TABLE IF NOT EXISTS public.cash_transactions (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    description TEXT,
    branchid TEXT NOT NULL,
    paymentsource TEXT NOT NULL REFERENCES public.payment_sources(id),
    reference TEXT,
    created_by TEXT, -- UUID of user
    target_creator TEXT,
    outsourcing_expense BOOLEAN DEFAULT FALSE,
    outsourcing_paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. INVENTORY TRANSACTIONS (Stock movement history)
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    partid TEXT REFERENCES public.parts(id) ON DELETE SET NULL,
    partname TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    unitprice NUMERIC,
    totalprice NUMERIC NOT NULL,
    branchid TEXT NOT NULL,
    notes TEXT,
    saleid TEXT REFERENCES public.sales(id) ON DELETE SET NULL,
    workorderid TEXT REFERENCES public.work_orders(id) ON DELETE SET NULL,
    supplierid TEXT, -- references public.suppliers(id)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. CUSTOMER DEBTS (Accounts Receivable)
CREATE TABLE IF NOT EXISTS public.customer_debts (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    phone TEXT,
    license_plate TEXT,
    description TEXT NOT NULL,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    paid_amount NUMERIC NOT NULL DEFAULT 0,
    remaining_amount NUMERIC NOT NULL DEFAULT 0,
    created_date DATE NOT NULL DEFAULT CURRENT_DATE,
    branch_id TEXT NOT NULL DEFAULT 'CN1',
    sale_id TEXT REFERENCES public.sales(id) ON DELETE SET NULL,
    work_order_id TEXT REFERENCES public.work_orders(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. SUPPLIER DEBTS (Accounts Payable)
CREATE TABLE IF NOT EXISTS public.supplier_debts (
    id TEXT PRIMARY KEY,
    supplier_id TEXT REFERENCES public.suppliers(id) ON DELETE SET NULL,
    supplier_name TEXT NOT NULL,
    description TEXT NOT NULL,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    paid_amount NUMERIC NOT NULL DEFAULT 0,
    remaining_amount NUMERIC NOT NULL DEFAULT 0,
    created_date DATE NOT NULL DEFAULT CURRENT_DATE,
    branch_id TEXT NOT NULL DEFAULT 'CN1',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. LOANS (Business loans)
CREATE TABLE IF NOT EXISTS public.loans (
    id TEXT PRIMARY KEY,
    lender_name TEXT NOT NULL,
    loan_type TEXT NOT NULL CHECK (loan_type IN ('bank', 'personal', 'other')),
    principal NUMERIC NOT NULL DEFAULT 0,
    interest_rate NUMERIC NOT NULL DEFAULT 0,
    term INTEGER NOT NULL DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    remaining_amount NUMERIC NOT NULL DEFAULT 0,
    monthly_payment NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid', 'overdue')),
    purpose TEXT,
    collateral TEXT,
    notes TEXT,
    branch_id TEXT NOT NULL DEFAULT 'CN1',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. LOAN PAYMENTS
CREATE TABLE IF NOT EXISTS public.loan_payments (
    id TEXT PRIMARY KEY,
    loan_id TEXT NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL,
    principal_amount NUMERIC NOT NULL DEFAULT 0,
    interest_amount NUMERIC NOT NULL DEFAULT 0,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    remaining_amount NUMERIC NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'bank')),
    notes TEXT,
    branch_id TEXT NOT NULL DEFAULT 'CN1',
    cash_transaction_id TEXT REFERENCES public.cash_transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. EMPLOYEES
CREATE TABLE IF NOT EXISTS public.employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    bank_account_number TEXT,
    bank_name TEXT,
    monthly_salary NUMERIC DEFAULT 0,
    commission_rate_service NUMERIC DEFAULT 0, -- Tỷ lệ % hoa hồng dịch vụ sửa
    commission_rate_parts NUMERIC DEFAULT 0,   -- Tỷ lệ % hoa hồng phụ tùng
    branch_id TEXT NOT NULL DEFAULT 'CN1',
    user_id TEXT, -- References auth.users(id)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. EMPLOYEE ADVANCES (Salary advances)
CREATE TABLE IF NOT EXISTS public.employee_advances (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    employee_name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    date DATE NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    branch_id TEXT NOT NULL DEFAULT 'CN1',
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    cash_transaction_id TEXT REFERENCES public.cash_transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. PAYROLL RECORDS
CREATE TABLE IF NOT EXISTS public.payroll_records (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    employee_name TEXT NOT NULL,
    month_year TEXT NOT NULL, -- Format 'MM-YYYY'
    basic_salary NUMERIC NOT NULL DEFAULT 0,
    commission_amount NUMERIC NOT NULL DEFAULT 0,
    advance_amount NUMERIC NOT NULL DEFAULT 0,
    bonus_amount NUMERIC NOT NULL DEFAULT 0,
    deduction_amount NUMERIC NOT NULL DEFAULT 0,
    net_salary NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid')),
    payment_date TIMESTAMPTZ,
    cash_transaction_id TEXT REFERENCES public.cash_transactions(id) ON DELETE SET NULL,
    branch_id TEXT NOT NULL DEFAULT 'CN1',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 21. STORE SETTINGS
CREATE TABLE IF NOT EXISTS public.store_settings (
    id TEXT PRIMARY KEY,
    store_name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    logo_url TEXT,
    slogan TEXT,
    bank_qr_template TEXT,
    bank_account_number TEXT,
    bank_bin TEXT,
    bank_account_name TEXT,
    tax_number TEXT,
    theme_preset TEXT DEFAULT 'emerald',
    markup_settings JSONB DEFAULT '{}'::jsonb,
    print_template_settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 22. PROMOTIONS
CREATE TABLE IF NOT EXISTS public.promotions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    discount_value NUMERIC,
    discount_type TEXT CHECK (discount_type IN ('percent', 'amount')),
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    active BOOLEAN DEFAULT TRUE,
    branch_id TEXT NOT NULL DEFAULT 'CN1',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 23. GALLERY
CREATE TABLE IF NOT EXISTS public.gallery (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    category TEXT,
    vehicle_model TEXT,
    active BOOLEAN DEFAULT TRUE,
    branch_id TEXT NOT NULL DEFAULT 'CN1',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 24. REPAIR TEMPLATES
CREATE TABLE IF NOT EXISTS public.repair_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    labor_cost NUMERIC DEFAULT 0,
    parts_list JSONB DEFAULT '[]'::jsonb,
    branch_id TEXT NOT NULL DEFAULT 'CN1',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 25. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    branch_id TEXT NOT NULL DEFAULT 'CN1',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 26. NOTIFICATION SETTINGS
CREATE TABLE IF NOT EXISTS public.notification_settings (
    id TEXT PRIMARY KEY,
    branch_id TEXT NOT NULL DEFAULT 'CN1',
    enable_low_stock BOOLEAN DEFAULT TRUE,
    enable_due_debts BOOLEAN DEFAULT TRUE,
    enable_new_bookings BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 27. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    created_by TEXT, -- UUID of user
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 28. SALES INSTALLMENTS (Payment installments)
CREATE TABLE IF NOT EXISTS public.sales_installments (
    id TEXT PRIMARY KEY,
    sale_id TEXT NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    due_date DATE NOT NULL,
    amount NUMERIC NOT NULL,
    paid_amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'overdue')),
    notes TEXT,
    branch_id TEXT NOT NULL DEFAULT 'CN1',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 29. KNOWLEDGE BASE ARTICLES
CREATE TABLE IF NOT EXISTS public.knowledge_articles (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 30. MARKETING MODULE TABLES
CREATE TABLE IF NOT EXISTS public.marketing_ideas (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    platform TEXT,
    scheduled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.marketing_scripts (
    id TEXT PRIMARY KEY,
    idea_id TEXT REFERENCES public.marketing_ideas(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    hook TEXT,
    body JSONB DEFAULT '[]'::jsonb, -- visually/audio script elements
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================================================
-- 30b. MIGRATION ERRORS (audit trail for the V1 -> V2 data migration)
-- ===================================================================
-- Every row dropped, coerced (e.g. orphaned part_id -> NULL), or rejected
-- during migration is logged here. Principle: nothing is silently discarded.
-- Reconcile row count against the diagnosed orphan count (498 quick-service rows).
CREATE TABLE IF NOT EXISTS public.migration_errors (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_table TEXT NOT NULL,          -- e.g. 'sales', 'work_orders'
    source_id TEXT,                      -- original V1 record id
    item_index INTEGER,                  -- line index within the JSONB array, if applicable
    reason TEXT NOT NULL,                -- e.g. 'orphan_part_id', 'parse_error', 'insert_failed'
    severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('warning', 'error')),
    payload JSONB,                       -- the offending raw item for later inspection
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_migration_errors_source ON public.migration_errors(source_table, source_id);
CREATE INDEX IF NOT EXISTS idx_migration_errors_reason ON public.migration_errors(reason);

-- ===================================================================
-- 31. BASIC INDEXES FOR PERFORMANCE
-- ===================================================================
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_parts_sku ON public.parts(sku);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON public.work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_branch ON public.work_orders(branchid);
CREATE INDEX IF NOT EXISTS idx_work_orders_date ON public.work_orders(creationdate DESC);
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_branch ON public.sales(branchid);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_date ON public.cash_transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_date ON public.inventory_transactions(date DESC);

-- ===================================================================
-- 32. TRIGGER TO AUTO-UPDATE updated_at
-- ===================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_work_orders_updated_at ON public.work_orders;
CREATE TRIGGER update_work_orders_updated_at
    BEFORE UPDATE ON public.work_orders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_vehicles_updated_at ON public.vehicles;
CREATE TRIGGER update_vehicles_updated_at
    BEFORE UPDATE ON public.vehicles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
