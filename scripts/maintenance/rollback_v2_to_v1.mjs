import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Project V1 (Production Target for Rollback)
const v1Url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const v1ServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Project V2 (Upgrade Source for Rollback)
const v2Url = process.env.SUPABASE_URL_V2;
const v2ServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY_V2;

if (!v1Url || !v1ServiceKey) {
  console.error("❌ Error: Missing Supabase V1 credentials in .env");
  process.exit(1);
}

if (!v2Url || !v2ServiceKey) {
  console.error("❌ Error: Missing Supabase V2 credentials in .env");
  process.exit(1);
}

const v1 = createClient(v1Url, v1ServiceKey, { auth: { persistSession: false } });
const v2 = createClient(v2Url, v2ServiceKey, { auth: { persistSession: false } });

// Helper: Fetch all rows helper
async function fetchAll(client, table, select = "*") {
  let allData = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await client
      .from(table)
      .select(select)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      throw new Error(`Failed to fetch from ${table}: ${error.message}`);
    }

    allData = allData.concat(data);
    hasMore = data.length === pageSize;
    page++;
  }
  return allData;
}

async function runRollback() {
  console.log("⚠️ Starting Rollback Sync (V2 -> V1)...");
  console.log(`Source V2: ${v2Url}`);
  console.log(`Target V1: ${v1Url}`);
  console.log("---------------------------------------------------------");

  try {
    // 1. Load existing IDs from V1 to identify what is "new" on V2
    console.log("📥 Loading V1 identifiers...");
    
    const v1Wos = await fetchAll(v1, "work_orders", "id");
    const v1Sales = await fetchAll(v1, "sales", "id");
    const v1Cash = await fetchAll(v1, "cash_transactions", "id");
    const v1Inv = await fetchAll(v1, "inventory_transactions", "id");
    
    const v1WoSet = new Set(v1Wos.map(w => w.id));
    const v1SalesSet = new Set(v1Sales.map(s => s.id));
    const v1CashSet = new Set(v1Cash.map(c => c.id));
    const v1InvSet = new Set(v1Inv.map(i => i.id));

    console.log(`Loaded V1 metadata: ${v1WoSet.size} Work Orders, ${v1SalesSet.size} Sales, ${v1CashSet.size} Cash Flow.`);

    // 2. Rollback Work Orders (Denormalize)
    console.log("\n🛠 Processing Work Orders to roll back...");
    const v2Wos = await fetchAll(v2, "work_orders");
    const v2WoItems = await fetchAll(v2, "work_order_items");

    // Group items by work order ID
    const itemsByWo = new Map();
    for (const item of v2WoItems) {
      if (!itemsByWo.has(item.work_order_id)) {
        itemsByWo.set(item.work_order_id, []);
      }
      itemsByWo.get(item.work_order_id).push({
        partId: item.part_id,
        partName: item.part_name,
        sku: item.sku,
        category: item.category,
        quantity: Number(item.quantity),
        sellingPrice: Number(item.price),
        costPrice: Number(item.cost_price)
      });
    }

    const wosToInsert = [];
    const wosToUpdate = [];

    for (const wo of v2Wos) {
      // Rebuild JSONB array
      const partsUsed = itemsByWo.get(wo.id) || [];
      
      const denormalizedWo = {
        ...wo,
        // V1's DDL declared `partsUsed JSONB` unquoted, so the real column is
        // lowercase `partsused`. Sending a nonexistent `partsUsed` key makes
        // PostgREST reject the whole insert (PGRST204) — send only the real one.
        partsused: partsUsed
      };

      // Remove V2 specific column helpers before inserting to V1
      delete denormalizedWo.updated_at;
      delete denormalizedWo.created_at;

      if (!v1WoSet.has(wo.id)) {
        wosToInsert.push(denormalizedWo);
      } else {
        wosToUpdate.push(denormalizedWo);
      }
    }

    console.log(`-> Found ${wosToInsert.length} new Work Orders, ${wosToUpdate.length} modified Work Orders.`);
    
    // Insert new work orders into V1
    if (wosToInsert.length > 0) {
      const { error } = await v1.from("work_orders").insert(wosToInsert);
      if (error) throw new Error(`Failed to rollback insert work_orders: ${error.message}`);
      console.log(`   ✅ Inserted ${wosToInsert.length} new Work Orders into V1.`);
    }

    // Update modified work orders on V1 in parallel batches
    const updateWoFn = async (wo) => {
      const { error } = await v1.from("work_orders").update(wo).eq("id", wo.id);
      if (error) console.error(`⚠️ Failed to update work_order ${wo.id} on V1:`, error.message);
    };
    
    // Batch helper for concurrency limit
    const pLimit = async (concurrency, items, fn) => {
      const batches = [];
      for (let i = 0; i < items.length; i += concurrency) {
        batches.push(items.slice(i, i + concurrency));
      }
      for (const batch of batches) {
        await Promise.all(batch.map(fn));
      }
    };

    if (wosToUpdate.length > 0) {
      await pLimit(20, wosToUpdate, updateWoFn);
      console.log(`   ✅ Updated ${wosToUpdate.length} modified Work Orders on V1.`);
    }

    // 3. Rollback Retail Sales (Denormalize)
    console.log("\n🛒 Processing Sales to roll back...");
    const v2Sales = await fetchAll(v2, "sales");
    const v2SaleItems = await fetchAll(v2, "sale_items");

    // Group items by sale ID
    const itemsBySale = new Map();
    for (const item of v2SaleItems) {
      if (!itemsBySale.has(item.sale_id)) {
        itemsBySale.set(item.sale_id, []);
      }
      itemsBySale.get(item.sale_id).push({
        partId: item.part_id,
        partName: item.part_name,
        sku: item.sku,
        quantity: Number(item.quantity),
        sellingPrice: Number(item.price),
        costPrice: Number(item.cost_price)
      });
    }

    const salesToInsert = [];
    const salesToUpdate = [];

    for (const sale of v2Sales) {
      const items = itemsBySale.get(sale.id) || [];
      const denormalizedSale = {
        ...sale,
        items
      };

      delete denormalizedSale.created_at;
      delete denormalizedSale.costprice;
      delete denormalizedSale.vatrate;
      delete denormalizedSale.refund_reason;
      delete denormalizedSale.refunded_at;
      delete denormalizedSale.refund_transaction_id;
      delete denormalizedSale.refundReason;
      delete denormalizedSale.refunded;

      if (!v1SalesSet.has(sale.id)) {
        salesToInsert.push(denormalizedSale);
      } else {
        salesToUpdate.push(denormalizedSale);
      }
    }

    console.log(`-> Found ${salesToInsert.length} new Sales, ${salesToUpdate.length} modified Sales.`);

    if (salesToInsert.length > 0) {
      const { error } = await v1.from("sales").insert(salesToInsert);
      if (error) throw new Error(`Failed to rollback insert sales: ${error.message}`);
      console.log(`   ✅ Inserted ${salesToInsert.length} new Sales transactions into V1.`);
    }

    const updateSaleFn = async (sale) => {
      const { error } = await v1.from("sales").update(sale).eq("id", sale.id);
      if (error) console.error(`⚠️ Failed to update sale ${sale.id} on V1:`, error.message);
    };

    if (salesToUpdate.length > 0) {
      await pLimit(20, salesToUpdate, updateSaleFn);
      console.log(`   ✅ Updated ${salesToUpdate.length} modified Sales transactions on V1.`);
    }

    // 4. Rollback Cash Transactions
    console.log("\n💵 Processing Cash Transactions to roll back...");
    const v2Cash = await fetchAll(v2, "cash_transactions");
    const cashToInsert = v2Cash.filter(c => !v1CashSet.has(c.id)).map(c => {
      const clean = { ...c };
      delete clean.created_at;
      return clean;
    });

    console.log(`-> Found ${cashToInsert.length} new Cash Flow entries on V2.`);
    if (cashToInsert.length > 0) {
      const { error } = await v1.from("cash_transactions").insert(cashToInsert);
      if (error) throw new Error(`Failed to rollback cash_transactions: ${error.message}`);
      console.log(`   ✅ Restored ${cashToInsert.length} Cash Flow entries back to V1.`);
    }

    // 5. Rollback Inventory Transactions
    console.log("\n📦 Processing Inventory History to roll back...");
    const v2Inv = await fetchAll(v2, "inventory_transactions");
    const invToInsert = v2Inv.filter(i => !v1InvSet.has(i.id)).map(i => {
      const clean = { ...i };
      delete clean.created_at;
      return clean;
    });

    console.log(`-> Found ${invToInsert.length} new stock ledger entries on V2.`);
    if (invToInsert.length > 0) {
      const { error } = await v1.from("inventory_transactions").insert(invToInsert);
      if (error) throw new Error(`Failed to rollback inventory_transactions: ${error.message}`);
      console.log(`   ✅ Restored ${invToInsert.length} stock ledger entries back to V1.`);
    }

    // 6. Rollback Master stock values back to V1 (Sync Stock quantity)
    console.log("\n🔄 Syncing stock quantities back to V1 catalog...");
    const v2Parts = await fetchAll(v2, "parts");
    for (const part of v2Parts) {
      const { error } = await v1.from("parts").update({
        stock: part.stock,
        reservedstock: part.reservedstock,
        "costPrice": part.costPrice || part["costPrice"]
      }).eq("id", part.id);
      if (error) {
        console.error(`⚠️ Failed to sync stock back to V1 for part ${part.id}:`, error.message);
      }
    }
    console.log("   ✅ Catalog stock synchronized.");

    // 7. Rollback Customer Debts (công nợ khách hàng)
    console.log("\n💳 Processing Customer Debts to roll back...");
    const v1Debts = await fetchAll(v1, "customer_debts", "id");
    const v1DebtSet = new Set(v1Debts.map(d => d.id));
    const v2Debts = await fetchAll(v2, "customer_debts");

    const debtsToInsert = [];
    const debtsToUpdate = [];
    for (const d of v2Debts) {
      const clean = { ...d };
      delete clean.created_at;
      delete clean.updated_at;
      if (!v1DebtSet.has(d.id)) {
        debtsToInsert.push(clean);
      } else {
        // Always sync remaining_amount: payment may have been recorded on V2.
        debtsToUpdate.push(clean);
      }
    }
    console.log(`-> Found ${debtsToInsert.length} new, ${debtsToUpdate.length} updated customer debts.`);
    if (debtsToInsert.length > 0) {
      const { error } = await v1.from("customer_debts").insert(debtsToInsert);
      if (error) throw new Error(`Failed to rollback insert customer_debts: ${error.message}`);
      console.log(`   ✅ Inserted ${debtsToInsert.length} new customer debt records into V1.`);
    }
    for (const d of debtsToUpdate) {
      const { error } = await v1.from("customer_debts")
        .update({ paid_amount: d.paid_amount, remaining_amount: d.remaining_amount })
        .eq("id", d.id);
      if (error) console.error(`⚠️ Failed to sync customer_debt ${d.id}:`, error.message);
    }
    if (debtsToUpdate.length > 0) console.log(`   ✅ Synced ${debtsToUpdate.length} customer debt balances back to V1.`);

    // 8. Rollback Supplier Debts (công nợ nhà cung cấp)
    console.log("\n🏭 Processing Supplier Debts to roll back...");
    const v1SuppDebts = await fetchAll(v1, "supplier_debts", "id");
    const v1SuppDebtSet = new Set(v1SuppDebts.map(d => d.id));
    const v2SuppDebts = await fetchAll(v2, "supplier_debts");

    const suppDebtsToInsert = [];
    const suppDebtsToUpdate = [];
    for (const d of v2SuppDebts) {
      const clean = { ...d };
      delete clean.created_at;
      delete clean.updated_at;
      if (!v1SuppDebtSet.has(d.id)) {
        suppDebtsToInsert.push(clean);
      } else {
        suppDebtsToUpdate.push(clean);
      }
    }
    console.log(`-> Found ${suppDebtsToInsert.length} new, ${suppDebtsToUpdate.length} updated supplier debts.`);
    if (suppDebtsToInsert.length > 0) {
      const { error } = await v1.from("supplier_debts").insert(suppDebtsToInsert);
      if (error) throw new Error(`Failed to rollback insert supplier_debts: ${error.message}`);
      console.log(`   ✅ Inserted ${suppDebtsToInsert.length} new supplier debt records into V1.`);
    }
    for (const d of suppDebtsToUpdate) {
      const { error } = await v1.from("supplier_debts")
        .update({ paid_amount: d.paid_amount, remaining_amount: d.remaining_amount })
        .eq("id", d.id);
      if (error) console.error(`⚠️ Failed to sync supplier_debt ${d.id}:`, error.message);
    }
    if (suppDebtsToUpdate.length > 0) console.log(`   ✅ Synced ${suppDebtsToUpdate.length} supplier debt balances back to V1.`);

    // 9. Rollback Loans & Loan Payments (khoản vay)
    console.log("\n🏦 Processing Loans to roll back...");
    const v1Loans = await fetchAll(v1, "loans", "id");
    const v1LoanSet = new Set(v1Loans.map(l => l.id));
    const v2Loans = await fetchAll(v2, "loans");

    const loansToInsert = v2Loans.filter(l => !v1LoanSet.has(l.id)).map(l => {
      const c = { ...l }; delete c.created_at; delete c.updated_at; return c;
    });
    console.log(`-> Found ${loansToInsert.length} new loans on V2.`);
    if (loansToInsert.length > 0) {
      const { error } = await v1.from("loans").insert(loansToInsert);
      if (error) throw new Error(`Failed to rollback insert loans: ${error.message}`);
      console.log(`   ✅ Inserted ${loansToInsert.length} new loans into V1.`);
    }

    const v1LoanPmts = await fetchAll(v1, "loan_payments", "id");
    const v1LoanPmtSet = new Set(v1LoanPmts.map(p => p.id));
    const v2LoanPmts = await fetchAll(v2, "loan_payments");

    const loanPmtsToInsert = v2LoanPmts.filter(p => !v1LoanPmtSet.has(p.id)).map(p => {
      const c = { ...p }; delete c.created_at; return c;
    });
    console.log(`-> Found ${loanPmtsToInsert.length} new loan payments on V2.`);
    if (loanPmtsToInsert.length > 0) {
      const { error } = await v1.from("loan_payments").insert(loanPmtsToInsert);
      if (error) throw new Error(`Failed to rollback insert loan_payments: ${error.message}`);
      console.log(`   ✅ Inserted ${loanPmtsToInsert.length} new loan payments into V1.`);
    }

    console.log("\n=========================================================");
    console.log("🎉 ROLLBACK COMPLETED SUCCESSFULLY!");
    console.log("Synced back to V1: work orders, sales, cash, inventory,");
    console.log("stock/WAC, customer debts, supplier debts, loans.");
    console.log("⚠️  WAC NOTE: costPrice was copied directly from V2.");
    console.log("   If V2 received new stock receipts, WAC may differ.");
    console.log("   Verify via verify_migration.mjs after rollback.");
    console.log("=========================================================");

  } catch (err) {
    console.error("\n❌ ROLLBACK SYNC FAILED:", err.message);
    process.exit(1);
  }
}

runRollback();
