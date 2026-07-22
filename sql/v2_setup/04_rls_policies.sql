-- ===================================================================
-- MOTOCARE V2 - ROW LEVEL SECURITY (RLS) POLICIES
-- Supabase Project V2 (public schema)
-- ===================================================================

-- Enable RLS on all tables
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname, tablename, schemaname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_scripts ENABLE ROW LEVEL SECURITY;

-- 1. STORE SETTINGS
CREATE POLICY store_settings_select ON public.store_settings 
    FOR SELECT TO public USING (TRUE);
CREATE POLICY store_settings_modify ON public.store_settings 
    FOR ALL TO authenticated USING (public.mc_is_manager_or_owner());

-- 2. CATEGORIES
CREATE POLICY categories_select ON public.categories 
    FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY categories_modify ON public.categories 
    FOR ALL TO authenticated USING (public.mc_is_manager_or_owner());

-- 3. PARTS
CREATE POLICY parts_select ON public.parts 
    FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY parts_insert ON public.parts 
    FOR INSERT TO authenticated WITH CHECK (public.mc_is_manager_or_owner());
CREATE POLICY parts_update ON public.parts 
    FOR UPDATE TO authenticated USING (public.mc_is_manager_or_owner());
CREATE POLICY parts_delete ON public.parts 
    FOR DELETE TO authenticated USING (public.mc_is_owner());

-- 4. CUSTOMERS
CREATE POLICY customers_select ON public.customers 
    FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY customers_modify ON public.customers 
    FOR ALL TO authenticated USING (TRUE); -- Allow staff to register customers

-- 5. VEHICLES
CREATE POLICY vehicles_select ON public.vehicles 
    FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY vehicles_modify ON public.vehicles 
    FOR ALL TO authenticated USING (TRUE); -- Allow staff to register vehicles

-- 6. SUPPLIERS
CREATE POLICY suppliers_select ON public.suppliers 
    FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY suppliers_modify ON public.suppliers 
    FOR ALL TO authenticated USING (public.mc_is_manager_or_owner());

-- 7. PAYMENT SOURCES
CREATE POLICY payment_sources_select ON public.payment_sources 
    FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY payment_sources_modify ON public.payment_sources 
    FOR ALL TO authenticated USING (public.mc_is_owner());

-- 8. WORK ORDERS (Branch scoping)
CREATE POLICY work_orders_select ON public.work_orders 
    FOR SELECT TO authenticated USING (branchid = public.mc_current_branch() OR public.mc_is_manager_or_owner());
CREATE POLICY work_orders_insert ON public.work_orders 
    FOR INSERT TO authenticated WITH CHECK (branchid = public.mc_current_branch());
CREATE POLICY work_orders_update ON public.work_orders 
    FOR UPDATE TO authenticated USING (branchid = public.mc_current_branch()) WITH CHECK (branchid = public.mc_current_branch());
CREATE POLICY work_orders_delete ON public.work_orders 
    FOR DELETE TO authenticated USING (public.mc_is_owner());

-- 9. WORK ORDER ITEMS (Dynamic inheritance from parent work orders)
CREATE POLICY work_order_items_select ON public.work_order_items 
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.work_orders w 
            WHERE w.id = work_order_id 
              AND (w.branchid = public.mc_current_branch() OR public.mc_is_manager_or_owner())
        )
    );
CREATE POLICY work_order_items_modify ON public.work_order_items 
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.work_orders w 
            WHERE w.id = work_order_id 
              AND (w.branchid = public.mc_current_branch() OR public.mc_is_manager_or_owner())
        )
    );

-- 10. SALES (Branch scoping)
CREATE POLICY sales_select ON public.sales 
    FOR SELECT TO authenticated USING (branchid = public.mc_current_branch() OR public.mc_is_manager_or_owner());
CREATE POLICY sales_insert ON public.sales 
    FOR INSERT TO authenticated WITH CHECK (branchid = public.mc_current_branch());
CREATE POLICY sales_update ON public.sales 
    FOR UPDATE TO authenticated USING (branchid = public.mc_current_branch()) WITH CHECK (branchid = public.mc_current_branch());
CREATE POLICY sales_delete ON public.sales 
    FOR DELETE TO authenticated USING (public.mc_is_owner());

-- 11. SALE ITEMS (Dynamic inheritance from parent sales)
CREATE POLICY sale_items_select ON public.sale_items 
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.sales s 
            WHERE s.id = sale_id 
              AND (s.branchid = public.mc_current_branch() OR public.mc_is_manager_or_owner())
        )
    );
CREATE POLICY sale_items_modify ON public.sale_items 
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.sales s 
            WHERE s.id = sale_id 
              AND (s.branchid = public.mc_current_branch() OR public.mc_is_manager_or_owner())
        )
    );

-- 12. CASH TRANSACTIONS (Financial audit, strict branch check)
CREATE POLICY cash_transactions_select ON public.cash_transactions 
    FOR SELECT TO authenticated USING (branchid = public.mc_current_branch() OR public.mc_is_manager_or_owner());
CREATE POLICY cash_transactions_insert ON public.cash_transactions 
    FOR INSERT TO authenticated WITH CHECK (branchid = public.mc_current_branch());
CREATE POLICY cash_transactions_update ON public.cash_transactions 
    FOR UPDATE TO authenticated USING (public.mc_is_manager_or_owner());
CREATE POLICY cash_transactions_delete ON public.cash_transactions 
    FOR DELETE TO authenticated USING (public.mc_is_owner());

-- 13. INVENTORY TRANSACTIONS
CREATE POLICY inventory_transactions_select ON public.inventory_transactions 
    FOR SELECT TO authenticated USING (branchid = public.mc_current_branch() OR public.mc_is_manager_or_owner());
CREATE POLICY inventory_transactions_modify ON public.inventory_transactions 
    FOR ALL TO authenticated USING (public.mc_is_manager_or_owner());

-- 14. DEBTS & LOANS (Strict roles)
CREATE POLICY customer_debts_all ON public.customer_debts 
    FOR ALL TO authenticated USING (branch_id = public.mc_current_branch() OR public.mc_is_manager_or_owner());
CREATE POLICY supplier_debts_all ON public.supplier_debts 
    FOR ALL TO authenticated USING (branch_id = public.mc_current_branch() OR public.mc_is_manager_or_owner());
CREATE POLICY loans_all ON public.loans 
    FOR ALL TO authenticated USING (public.mc_is_manager_or_owner());
CREATE POLICY loan_payments_all ON public.loan_payments 
    FOR ALL TO authenticated USING (public.mc_is_manager_or_owner());

-- 15. HR & PAYROLL (Strict owner/manager/accountant check)
CREATE POLICY employees_select ON public.employees 
    FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY employees_modify ON public.employees 
    FOR ALL TO authenticated USING (public.mc_is_manager_owner_accountant());
CREATE POLICY advances_all ON public.employee_advances 
    FOR ALL TO authenticated USING (branch_id = public.mc_current_branch() OR public.mc_is_manager_owner_accountant());
CREATE POLICY payroll_all ON public.payroll_records 
    FOR ALL TO authenticated USING (public.mc_is_manager_owner_accountant());

-- 16. MARKETING & KNOWLEDGE BASE
CREATE POLICY marketing_ideas_all ON public.marketing_ideas 
    FOR ALL TO authenticated USING (public.mc_is_manager_or_owner());
CREATE POLICY marketing_scripts_all ON public.marketing_scripts 
    FOR ALL TO authenticated USING (public.mc_is_manager_or_owner());
CREATE POLICY knowledge_articles_select ON public.knowledge_articles 
    FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY knowledge_articles_modify ON public.knowledge_articles 
    FOR ALL TO authenticated USING (public.mc_is_manager_or_owner());
