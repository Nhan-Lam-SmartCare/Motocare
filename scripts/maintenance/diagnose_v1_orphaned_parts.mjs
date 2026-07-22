import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables from .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function diagnoseOrphanedParts() {
  console.log("🔍 Connecting to Supabase V1 Database...");
  console.log(`URL: ${supabaseUrl}`);

  // 1. Fetch all parts to create a lookup map
  console.log("📥 Loading parts catalog...");
  const { data: parts, error: partsError } = await supabase
    .from("parts")
    .select("id, name, sku");

  if (partsError) {
    console.error("❌ Failed to fetch parts:", partsError.message);
    return;
  }

  const partsMap = new Map(parts.map(p => [p.id, p]));
  console.log(`✅ Loaded ${partsMap.size} parts from catalog.`);

  // 2. Scan work_orders
  console.log("📥 Scanning work orders for partsused...");
  const { data: workOrders, error: woError } = await supabase
    .from("work_orders")
    .select("id, customername, partsused");

  if (woError) {
    console.error("❌ Failed to fetch work orders:", woError.message);
    return;
  }

  let woOrphanedCount = 0;
  const woOrphanedDetails = [];

  for (const wo of workOrders) {
    const partsUsed = wo.partsused || wo.partsUsed || [];
    if (!Array.isArray(partsUsed)) continue;

    partsUsed.forEach((item, index) => {
      const partId = item.partId || item.partid;
      if (partId && !partsMap.has(partId)) {
        woOrphanedCount++;
        woOrphanedDetails.push({
          workOrderId: wo.id,
          customer: wo.customername || "Unknown",
          index,
          partId,
          partName: item.partName || item.partname || "Unknown",
          sku: item.sku || "N/A"
        });
      }
    });
  }

  // 3. Scan sales
  console.log("📥 Scanning retail sales for items...");
  const { data: sales, error: salesError } = await supabase
    .from("sales")
    .select("id, customer, items");

  if (salesError) {
    console.error("❌ Failed to fetch sales:", salesError.message);
    return;
  }

  let salesOrphanedCount = 0;
  const salesOrphanedDetails = [];

  for (const sale of sales) {
    const items = sale.items || [];
    if (!Array.isArray(items)) continue;

    items.forEach((item, index) => {
      const partId = item.partId || item.partid;
      if (partId && !partsMap.has(partId)) {
        salesOrphanedCount++;
        const customerName = typeof sale.customer === 'object' && sale.customer !== null 
          ? (sale.customer.name || "Khách lẻ") 
          : "Khách lẻ";
        salesOrphanedDetails.push({
          saleId: sale.id,
          customer: customerName,
          index,
          partId,
          partName: item.partName || item.partname || "Unknown",
          sku: item.sku || "N/A"
        });
      }
    });
  }

  // 4. Print results summary
  console.log("\n=================== DIAGNOSTIC REPORT ===================");
  console.log(`🚨 Total orphaned parts found in Work Orders: ${woOrphanedCount}`);
  console.log(`🚨 Total orphaned parts found in Retail Sales: ${salesOrphanedCount}`);
  console.log("=========================================================");

  if (woOrphanedCount > 0) {
    console.log("\n📋 Sample of orphaned parts in Work Orders (up to 10):");
    console.table(woOrphanedDetails.slice(0, 10));
  }

  if (salesOrphanedCount > 0) {
    console.log("\n📋 Sample of orphaned parts in Retail Sales (up to 10):");
    console.table(salesOrphanedDetails.slice(0, 10));
  }

  console.log("\n💡 Recommendation:");
  if (woOrphanedCount > 0 || salesOrphanedCount > 0) {
    console.log("-> Foreign key Constraints in V2 MUST use 'ON DELETE SET NULL' or allow NULL for part_id.");
    console.log("-> DO NOT use 'ON DELETE RESTRICT' for part_id, otherwise migration will FAIL.");
  } else {
    console.log("-> No orphaned data detected. But keeping 'ON DELETE SET NULL' is still recommended for safety.");
  }
}

diagnoseOrphanedParts();
