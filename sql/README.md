# SQL Migrations Guide

## Tổ chức migrations

Các file SQL trong thư mục `/sql` được đặt tên theo chuẩn:

```
YYYY-MM-DD_description.sql
```

## Thứ tự chạy migrations

### 1. Schema cơ bản (Chạy theo thứ tự)

```bash
# Core schema
2025-11-10_schema_setup_clean.sql      # Tạo bảng cơ bản
2025-11-10_profiles_role_branch.sql     # Profiles với role và branch
2025-11-10_cash_inventory_schema.sql    # Schema cho cash và inventory

# Suppliers
2025-11-11_suppliers_schema_and_rls.sql

# Parts patches
2025-11-11_parts_schema_patch.sql
2025-11-12_add_costPrice_to_parts.sql
2025-11-26_add_barcode_to_parts.sql
```

### 2. RLS Policies

```bash
2025-11-10_rls_policies.sql
2025-11-10_rls_enforce_and_triggers.sql
2025-11-11_rls_audit_logs.sql
2025-11-13_add_rls_store_settings.sql
```

### 3. Indexes (Hiệu năng)

```bash
2025-11-10_indexes.sql
2025-11-11_audit_logs_indexes.sql
2025-11-11_indexes_parts_name.sql
2025-11-11_sales_indexes_branch_date.sql
```

### 4. Views

```bash
2025-11-10_audit_logs_with_user_view.sql
2025-11-11_audit_view_owner_mask.sql
2025-11-11_inventory_summary_view.sql
2025-11-13_inventory_summary_view.sql  # Updated version
```

### 5. Stored Procedures (Atomic operations)

```bash
2025-11-11_sale_create_atomic.sql
2025-11-12_work_order_create_atomic.sql
2025-11-13_work_order_update_atomic.sql
2025-11-13_work_order_refund.sql
2025-11-17_drop_and_recreate_sale_atomic.sql
2025-11-17_update_sale_create_atomic_with_code.sql
2025-11-23_receipt_create_atomic.sql
```

### 6. Additional Tables

```bash
2025-11-13_employees_table.sql
2025-11-13_debts_tables.sql
2025-11-13_loans_tables.sql
2025-11-24_capital_management.sql
2025-11-24_fixed_assets_management.sql
2025-11-27_notifications_system.sql
2025-11-28_repair_templates.sql
```

### 7. Column Additions

```bash
2025-11-11_sales_refunded_column.sql
2025-11-13_add_refund_columns_only.sql
2025-11-13_add_bank_qr_to_store_settings.sql
2025-11-13_add_missing_columns_store_settings.sql
2025-11-13_add_additionalServices_to_work_orders.sql
2025-11-15_add_sale_id_to_customer_debts.sql
2025-11-17_add_sale_code_to_sales.sql
2025-11-17_add_vehicleid_to_work_orders.sql
2025-11-17_add_additional_services_column.sql
2025-11-28_add_currentKm_to_work_orders.sql
```

### 8. Triggers & Helpers

```bash
2025-11-11_inventory_tx_trigger.sql
2025-11-11_inventory_cost_helpers.sql
2025-11-11_inventory_transfer_atomic.sql
2025-11-11_adjust_part_stock.sql
```

### 9. Seed Data (Production)

```bash
2025-11-10_seed_roles.sql
2025-11-10_seed_owner_lam.sql
```

## Migration Scripts cho Production

### Script chạy tất cả migrations theo thứ tự

```bash
#!/bin/bash
# run_migrations.sh

SUPABASE_DB_URL="postgresql://postgres:password@host:port/postgres"

# Array of migrations in order
MIGRATIONS=(
  "2025-11-10_schema_setup_clean.sql"
  "2025-11-10_profiles_role_branch.sql"
  "2025-11-10_cash_inventory_schema.sql"
  "2025-11-10_rls_policies.sql"
  "2025-11-10_indexes.sql"
  # ... add more in order
)

for migration in "${MIGRATIONS[@]}"; do
  echo "Running: $migration"
  psql "$SUPABASE_DB_URL" -f "sql/$migration"
  if [ $? -ne 0 ]; then
    echo "ERROR: Migration failed at $migration"
    exit 1
  fi
done

echo "All migrations completed successfully!"
```

## Lưu ý quan trọng

1. **Backup trước khi chạy**: Luôn backup database trước khi chạy migrations
2. **Chạy theo thứ tự**: Các migrations phụ thuộc lẫn nhau, phải chạy theo đúng thứ tự
3. **Idempotent**: Một số migrations sử dụng `IF NOT EXISTS` để có thể chạy nhiều lần
4. **RLS Testing**: Sau khi enable RLS, test kỹ các permissions

## Khuyến nghị cải thiện

1. **Sử dụng Supabase CLI migrations**:

   ```bash
   supabase migration new create_users_table
   supabase db push
   ```

2. **Tạo migration tracking table**:

   ```sql
   CREATE TABLE IF NOT EXISTS _migrations (
     id SERIAL PRIMARY KEY,
     name VARCHAR(255) UNIQUE NOT NULL,
     executed_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

3. **Consolidate files**: Gom các patches nhỏ thành file lớn theo feature
