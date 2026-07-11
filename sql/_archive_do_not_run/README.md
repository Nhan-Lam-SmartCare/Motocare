# ⛔ _archive_do_not_run

These scripts were intermixed with the real migrations in `sql/` but are **destructive or security-lowering**. They are archived here so that "run every file in `sql/`" can never wipe data or disable security on production.

**Do NOT run any of these against production.**

| File | Why it's dangerous |
|---|---|
| `disable_rls_for_testing.sql` | Disables RLS on work_orders, cash_transactions, inventory_transactions, debts |
| `TEMP_disable_rls.sql` | Disables RLS on capital, fixed_assets, depreciation |
| `2025-11-13_disable_employees_rls.sql` | Exposes salaries (RLS off on employees) |
| `2025-11-13_disable_rls_user_profiles.sql` | Opens profiles to self-escalation |
| `fix_rls_profiles.sql` | Disables RLS on profiles (undoes the A2 fix) |
| `2025-11-19_clear_all_test_data.sql` | Deletes business data |
| `2025-12-18_delete_phatthinh_data.sql` | Deletes supplier data |
| `DEMO_MASTER_SETUP.sql` | Disables RLS on ~14 tables + seeds demo data |
| `DEMO_FULL_DATA.sql`, `DEMO_SAMPLE_DATA.sql`, `DEMO_FIX_COLUMNS.sql` | Demo seeders — for a throwaway demo project only |

Security hardening lives in the dated migrations `sql/2026-07-09_A2/A3/A5_*.sql`.
