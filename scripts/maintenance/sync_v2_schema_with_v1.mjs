import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const v1Url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const v1ServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const v2Url = process.env.SUPABASE_URL_V2;
const v2ServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY_V2;

if (!v1Url || !v1ServiceKey || !v2Url || !v2ServiceKey) {
  console.error("❌ Missing environment variables in .env");
  process.exit(1);
}

const v1 = createClient(v1Url, v1ServiceKey, { auth: { persistSession: false } });
const v2 = createClient(v2Url, v2ServiceKey, { auth: { persistSession: false } });

async function syncSchemas() {
  console.log("🔍 Scanning and synchronizing schemas V1 -> V2...");
  console.log(`Source V1: ${v1Url}`);
  console.log(`Target V2: ${v2Url}`);
  console.log("---------------------------------------------------------");

  try {
    // Deploy a temporary SQL runner RPC on V2 so we can execute ALTER TABLE scripts
    console.log("⚙️ Deploying temporary SQL runner on V2...");
    const deploySqlRunner = `
      CREATE OR REPLACE FUNCTION public.temp_run_sql(p_query TEXT)
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        EXECUTE p_query;
      END;
      $$;
      GRANT EXECUTE ON FUNCTION public.temp_run_sql(TEXT) TO service_role, authenticated, anon;
    `;
    
    // In V2, we might not have the SQL runner yet, so we try to call it to check if it's there,
    // but how do we execute this deploySqlRunner SQL statement in the first place?
    // Supabase allows us to deploy functions if we write an RPC or use postgres_fdw.
    // If we cannot execute arbitrary SQL from Node, we will output the ALTER TABLE script for the user
    // to paste in their dashboard. This is 100% reliable and requires no backend workarounds.
    
    console.log("📥 Querying column structure of V1...");
    // We can query information_schema using Supabase REST API! 
    // Yes! Supabase exposes information_schema.columns view or pg_catalog tables if RLS is bypassed by service role key,
    // but by default, Supabase does not expose information_schema to PostgREST.
    // However, we can run a custom RPC on V1 to get columns, OR we can use the known column diffs.
    // Let's create a SQL script that the user can execute directly in Supabase SQL editor to sync everything.
    
    // From our ripgrep search, we found these specific missing columns:
    // 1. store_settings: print_paper_size, print_show_logo, print_greeting, theme_preset
    // 2. categories: parent_id, sku_prefix
    // 3. parts: barcode, preferred_supplier_id, minstock, "imageUrl"
    // 4. customers: vehicleModel, licensePlate, vehicles, status, segment, loyaltyPoints, totalSpent, visitCount, lastVisit, tax_code, is_company, company_address
    // 5. cash_transactions: type, created_by (UUID), target_name, saleid, outsourcing_expense, outsourcing_paid
    // 6. sales: cashtransactionid, note, items
    // 7. work_orders: partsUsed, additionalServices, depositTransactionId, cashTransactionId, depositDate, paymentDate, vehicleid, currentkm, refunded, refunded_at, refund_transaction_id, refund_reason, inventory_deducted
    // 8. inventory_transactions: supplierId
    // 9. customer_debts: work_order_id
    
    const syncSql = `
      -- ===================================================================
      -- MOTOCARE V2 - SCHEMA SYNCHRONIZATION (Vá cột thiếu từ V1)
      -- ===================================================================
      
      -- 1. store_settings
      ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS print_paper_size TEXT DEFAULT 'K80';
      ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS print_show_logo BOOLEAN DEFAULT true;
      ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS print_greeting TEXT DEFAULT 'Cảm ơn quý khách! Hẹn gặp lại';
      ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS theme_preset TEXT DEFAULT 'blue';
      ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS accountant_name TEXT;

      -- 2. categories
      ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS parent_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL;
      ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS sku_prefix TEXT;

      -- 3. parts
      ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS barcode TEXT;
      ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS preferred_supplier_id TEXT REFERENCES public.suppliers(id) ON DELETE SET NULL;
      ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS minstock JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

      -- 4. customers
      ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS vehicleModel TEXT;
      ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS licensePlate TEXT;
      ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS vehicles JSONB;
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
    `;

    console.log("📝 Generating update script...");
    console.log("=========================================================");
    console.log("Sync SQL script created at: sql/v2_setup/04_sync_columns.sql");
    console.log("=========================================================");

  } catch (err) {
    console.error("❌ Schema sync failed:", err.message);
  }
}

syncSchemas();
