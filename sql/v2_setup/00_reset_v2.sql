-- ===================================================================
-- MOTOCARE V2 — RESET TOÀN BỘ SCHEMA (chạy lại setup từ đầu)
-- File: sql/v2_setup/00_reset_v2.sql
-- ===================================================================
-- ⚠️ CHỈ DÙNG TRÊN PROJECT V2 (yxohjuezxrpnijypkeaa) KHI CHƯA GOLIVE.
-- Dùng khi: đã lỡ chạy bộ setup phiên bản cũ (thiếu cột items/partsused,
-- customers thiếu cột, migration_errors sai tên cột...) và cần làm lại sạch.
--
-- Script DROP mọi bảng/hàm do bộ setup tạo ra. KHÔNG đụng tới:
--   • auth.users (tài khoản đã migrate — giữ nguyên)
--   • storage (bucket images nếu đã copy)
-- Sau khi chạy file này, chạy lại 01 → 09 rồi chạy migrate script.
-- ===================================================================

-- Safety guard: refuse to run if sales already holds real data volume.
DO $$
DECLARE v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.sales;
  IF v_count > 100 THEN
    RAISE EXCEPTION
      'DỪNG: bảng sales có % dòng — có vẻ đây KHÔNG phải database rỗng. Kiểm tra lại project trước khi reset!',
      v_count;
  END IF;
EXCEPTION WHEN undefined_table THEN
  NULL; -- sales chưa tồn tại → an toàn
END $$;

-- ── Tables (CASCADE clears dependent FKs, views, policies) ──────────
DROP TABLE IF EXISTS
  public.dualwrite_drift_log,
  public.migration_errors,
  public.work_order_items,
  public.sale_items,
  public.sales_installments,
  public.payroll_records,
  public.employee_advances,
  public.employees,
  public.loan_payments,
  public.loans,
  public.supplier_debts,
  public.customer_debts,
  public.inventory_transactions,
  public.cash_transactions,
  public.sales,
  public.work_orders,
  public.vehicles,
  public.customers,
  public.suppliers,
  public.parts,
  public.categories,
  public.payment_sources,
  public.store_settings,
  public.promotions,
  public.gallery,
  public.repair_templates,
  public.notifications,
  public.notification_settings,
  public.audit_logs,
  public.knowledge_articles,
  public.marketing_ideas,
  public.marketing_scripts,
  public.external_parts,
  public.staff_permissions,
  public.profiles
CASCADE;

-- ── Functions ───────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS
  public.mc_current_role(),
  public.mc_current_branch(),
  public.mc_is_owner(),
  public.mc_is_manager_or_owner(),
  public.mc_is_manager_owner_accountant(),
  public.mc_avg_cost(TEXT, TEXT),
  public.update_updated_at_column(),
  public.generate_sale_code(TIMESTAMPTZ),
  public.set_sale_code_before_insert(),
  public.reconcile_dualwrite(),
  public.normalize_plate(TEXT),
  public.adjust_part_stock(TEXT, TEXT, NUMERIC),
  public.stock_ensure_update(TEXT, TEXT, INT),
  public.get_public_work_order(TEXT),
  public.get_external_part_categories(),
  public.handle_new_user(),
  public.update_staff_permissions_updated_at()
CASCADE;

-- Atomic RPCs (signatures vary — drop by name with every known arg list)
DROP FUNCTION IF EXISTS public.receipt_create_atomic CASCADE;
DROP FUNCTION IF EXISTS public.sale_create_atomic CASCADE;
DROP FUNCTION IF EXISTS public.sale_update_atomic CASCADE;
DROP FUNCTION IF EXISTS public.sale_delete_atomic CASCADE;
DROP FUNCTION IF EXISTS public.work_order_create_atomic CASCADE;
DROP FUNCTION IF EXISTS public.work_order_update_atomic CASCADE;
DROP FUNCTION IF EXISTS public.work_order_refund_atomic CASCADE;
DROP FUNCTION IF EXISTS public.work_order_complete_payment CASCADE;

-- Temp auth RPCs nếu còn sót
DROP FUNCTION IF EXISTS public.temp_import_users(JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.temp_cleanup_import() CASCADE;

-- Trigger trên auth.users (nếu đã tạo bởi bản setup cũ)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DO $$ BEGIN
  RAISE NOTICE '✅ Reset xong. Chạy lại theo thứ tự: 01 → 02 → 03 → 04 → 06 → 07 → 08 → 09';
  RAISE NOTICE '   (05_temp_auth_migration.sql: chỉ chạy PART 2, và chỉ khi cần import lại users)';
END $$;
