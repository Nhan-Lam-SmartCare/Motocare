import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// ===================================================================
// MOTOCARE — AUTOMATED V1 <-> V2 MIGRATION RECONCILIATION
// ===================================================================
// Compares V1 and V2 side by side and prints PASS/FAIL per check.
// Run at three points: after staging migration, at end of Parallel Run,
// and on Golive night. Exit code is non-zero if ANY check FAILs, so it
// can gate an automated Golive.
//
// Usage: node scripts/maintenance/verify_migration.mjs
// ===================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const v1Url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const v1ServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const v2Url = process.env.SUPABASE_URL_V2;
const v2ServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY_V2;

if (!v1Url || !v1ServiceKey) {
  console.error("❌ Missing Supabase V1 credentials in .env");
  process.exit(1);
}
if (!v2Url || !v2ServiceKey) {
  console.error("❌ Missing Supabase V2 credentials in .env");
  process.exit(1);
}

const v1 = createClient(v1Url, v1ServiceKey, { auth: { persistSession: false } });
const v2 = createClient(v2Url, v2ServiceKey, { auth: { persistSession: false } });

// Money comparisons tolerate sub-1-VND float noise but nothing meaningful.
const MONEY_EPSILON = 1;

// --allow-v1-newer: during Parallel Run V1 keeps selling, so V2 legitimately
// lags behind. With this flag, a mismatch that is ONLY "V1 has extra rows that
// V2 doesn't" (or a derived money/item drift) is downgraded FAIL → WARN.
// The dangerous direction — rows present on V2 but NOT on V1 (phantom test data
// that Golive's TRUNCATE would erase forever, checkpoint #2 in mục 6) — stays a
// hard FAIL no matter what. On Golive night V1 is frozen first, so run WITHOUT
// the flag for a clean exact-parity gate.
const ALLOW_V1_NEWER = process.argv.includes("--allow-v1-newer");

const results = [];
// soft=true marks a check that CAN legitimately drift while V1 keeps running;
// such a mismatch becomes WARN under --allow-v1-newer instead of FAIL.
function record(name, v1Val, v2Val, pass, note = "", soft = false) {
  results.push({ name, v1Val, v2Val, pass, note, soft });
}

// ---- fetch helpers ---------------------------------------------------------

// Exact row count without pulling rows.
async function countRows(client, table) {
  const { count, error } = await client
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) throw new Error(`count ${table}: ${error.message}`);
  return count ?? 0;
}

// Page through a single numeric column and sum it (bypasses 1000-row cap).
async function sumColumn(client, table, column) {
  let total = 0;
  let page = 0;
  const size = 1000;
  for (;;) {
    const { data, error } = await client
      .from(table)
      .select(column)
      .range(page * size, (page + 1) * size - 1);
    if (error) throw new Error(`sum ${table}.${column}: ${error.message}`);
    for (const row of data) total += Number(row[column]) || 0;
    if (data.length < size) break;
    page++;
  }
  return total;
}

// Sum every branch value inside a JSONB map column (e.g. payment_sources.balance).
async function sumJsonbMap(client, table, column) {
  let total = 0;
  let page = 0;
  const size = 1000;
  for (;;) {
    const { data, error } = await client
      .from(table)
      .select(column)
      .range(page * size, (page + 1) * size - 1);
    if (error) throw new Error(`sumJsonb ${table}.${column}: ${error.message}`);
    for (const row of data) {
      const map = row[column] || {};
      for (const k of Object.keys(map)) total += Number(map[k]) || 0;
    }
    if (data.length < size) break;
    page++;
  }
  return total;
}

const eqInt = (a, b) => a === b;
const eqMoney = (a, b) => Math.abs(a - b) <= MONEY_EPSILON;

// Page through the id column of a table.
async function fetchIds(client, table) {
  const ids = [];
  let page = 0;
  const size = 1000;
  for (;;) {
    const { data, error } = await client
      .from(table)
      .select("id")
      .range(page * size, (page + 1) * size - 1);
    if (error) throw new Error(`ids ${table}: ${error.message}`);
    for (const row of data) ids.push(row.id);
    if (data.length < size) break;
    page++;
  }
  return ids;
}

// When counts mismatch, determine WHICH side has rows the other lacks.
// "missingOnV2" = V1 rows not yet on V2 (benign while V1 keeps selling).
// "extraOnV2"  = rows that exist ONLY on V2 (phantom data — Golive TRUNCATE
// would destroy them with no V1 copy; always a hard stop).
async function idDirection(table) {
  const [ids1, ids2] = await Promise.all([fetchIds(v1, table), fetchIds(v2, table)]);
  const s1 = new Set(ids1);
  const s2 = new Set(ids2);
  let missingOnV2 = 0;
  for (const id of ids1) if (!s2.has(id)) missingOnV2++;
  let extraOnV2 = 0;
  for (const id of ids2) if (!s1.has(id)) extraOnV2++;
  return { missingOnV2, extraOnV2 };
}

// Tables that must have IDENTICAL row counts in V1 and V2 after migration.
// V2-only tables (sale_items, work_order_items, migration_errors) are excluded
// because they have no V1 counterpart — they are checked separately below.
const PARITY_TABLES = [
  "sales", "work_orders", "parts", "customers", "suppliers",
  "cash_transactions", "payment_sources", "customer_debts", "supplier_debts",
  "loans", "loan_payments", "inventory_transactions", "categories",
  "employee_advances", "payroll_records", "promotions",
  "repair_templates", "sales_installments", "knowledge_articles",
  "marketing_ideas", "marketing_scripts", "gallery", "store_settings",
  "notification_settings", "notifications", "audit_logs"
];

// Count how many JSONB array elements exist across a column in V1 — this is the
// number of normalized rows V2 should have produced.
async function countJsonbElements(client, table, column) {
  let total = 0;
  let page = 0;
  const size = 1000;
  for (;;) {
    const { data, error } = await client
      .from(table)
      .select(column)
      .range(page * size, (page + 1) * size - 1);
    if (error) throw new Error(`countJsonb ${table}.${column}: ${error.message}`);
    for (const row of data) {
      const arr = row[column];
      if (Array.isArray(arr)) total += arr.length;
    }
    if (data.length < size) break;
    page++;
  }
  return total;
}

async function run() {
  console.log("🔍 Bắt đầu đối soát V1 ↔ V2...\n");

  // 1. Row-count parity for every shared table.
  for (const t of PARITY_TABLES) {
    try {
      const [c1, c2] = await Promise.all([countRows(v1, t), countRows(v2, t)]);
      if (eqInt(c1, c2)) {
        record(`rows: ${t}`, c1, c2, true);
        continue;
      }
      // Mismatch — inspect direction to decide FAIL vs WARN.
      const { missingOnV2, extraOnV2 } = await idDirection(t);
      // Phantom rows on V2 are ALWAYS a hard fail: Golive TRUNCATE would erase
      // them and V1 has no copy. This is checkpoint #2 of mục 6.
      if (extraOnV2 > 0) {
        record(`rows: ${t}`, c1, c2, false,
          `⛔ ${extraOnV2} dòng CHỈ có trên V2 (không có ở V1) — dữ liệu lạ, PHẢI điều tra trước khi TRUNCATE`);
      } else {
        // Only V1 is ahead — benign while V1 keeps selling; soft under the flag.
        record(`rows: ${t}`, c1, c2, false,
          `${missingOnV2} dòng V1 chưa có trên V2 (V1 vẫn đang phát sinh) — Full Re-run sau khi đóng băng V1 sẽ khớp`,
          true);
      }
    } catch (e) {
      record(`rows: ${t}`, "?", "?", false, e.message);
    }
  }

  // 1.1 Custom check for vehicles since V1 might have no vehicles table (embedded in customers instead)
  try {
    let v1VehiclesCount = 0;
    try {
      v1VehiclesCount = await countRows(v1, "vehicles");
    } catch (e) {
      // V1 has no vehicles table
    }

    if (v1VehiclesCount === 0) {
      // Extract unique vehicles from V1 customers JSONB
      let page = 0;
      const size = 1000;
      const vehicleSet = new Set();
      for (;;) {
        const { data: customers, error } = await v1
          .from("customers")
          .select("id, vehicles")
          .range(page * size, (page + 1) * size - 1);
        if (error) throw new Error(`fetch customers for vehicle check: ${error.message}`);
        
        for (const c of customers) {
          const embedded = c.vehicles || [];
          if (Array.isArray(embedded)) {
            for (const v of embedded) {
              const licensePlate = v.licensePlate || v.licenseplate || "";
              if (licensePlate) {
                vehicleSet.add(`${c.id}_${licensePlate}`);
              }
            }
          }
        }
        if (customers.length < size) break;
        page++;
      }
      v1VehiclesCount = vehicleSet.size;
    }
    
    const v2VehiclesCount = await countRows(v2, "vehicles");
    // soft only when V1 is ahead — extra V2 vehicles would be phantom data.
    record("rows: vehicles", v1VehiclesCount, v2VehiclesCount,
      eqInt(v1VehiclesCount, v2VehiclesCount), "", v1VehiclesCount > v2VehiclesCount);
  } catch (e) {
    record("rows: vehicles", "?", "?", false, e.message);
  }

  // 1.2 Custom check for employees to account for recreated orphan/deleted employees
  try {
    const v1EmpCount = await countRows(v1, "employees");
    
    // Scan V1 advances and payrolls to find any employee IDs that don't exist in V1 employees
    const { data: v1Employees } = await v1.from("employees").select("id");
    const v1EmpIds = new Set((v1Employees || []).map(e => e.id));
    
    let rawAdvances = [];
    try {
      const { data } = await v1.from("employee_advances").select("employee_id");
      rawAdvances = data || [];
    } catch (e) {}
    
    let rawPayrolls = [];
    try {
      const { data } = await v1.from("payroll_records").select("employee_id");
      rawPayrolls = data || [];
    } catch (e) {}
    
    const uniqueOrphans = new Set();
    const checkOrphan = (empId) => {
      if (empId && !v1EmpIds.has(empId)) {
        uniqueOrphans.add(empId);
      }
    };
    
    rawAdvances.forEach(r => checkOrphan(r.employee_id || r.employeeId));
    rawPayrolls.forEach(r => checkOrphan(r.employee_id || r.employeeId));
    
    const expectedV2EmpCount = v1EmpCount + uniqueOrphans.size;
    const actualV2EmpCount = await countRows(v2, "employees");
    
    record("rows: employees", expectedV2EmpCount, actualV2EmpCount, eqInt(expectedV2EmpCount, actualV2EmpCount),
      uniqueOrphans.size > 0 ? `Bao gồm ${uniqueOrphans.size} nhân viên cũ được tạo lại để tránh lỗi FK` : "");
  } catch (e) {
    record("rows: employees", "?", "?", false, e.message);
  }

  // 2. Revenue parity — the number the shop owner cares about most.
  try {
    const [s1, s2] = await Promise.all([
      sumColumn(v1, "sales", "total"),
      sumColumn(v2, "sales", "total")
    ]);
    record("doanh thu bán lẻ (SUM sales.total)", s1, s2, eqMoney(s1, s2),
      "", s1 > s2); // V1 ahead = still selling; V2 > V1 would be phantom revenue

    const [w1, w2] = await Promise.all([
      sumColumn(v1, "work_orders", "total"),
      sumColumn(v2, "work_orders", "total")
    ]);
    record("doanh thu sửa chữa (SUM work_orders.total)", w1, w2, eqMoney(w1, w2),
      "", w1 > w2);
  } catch (e) {
    record("doanh thu", "?", "?", false, e.message);
  }

  // 3. Cash/bank balances (JSONB per branch).
  try {
    const [b1, b2] = await Promise.all([
      sumJsonbMap(v1, "payment_sources", "balance"),
      sumJsonbMap(v2, "payment_sources", "balance")
    ]);
    record("số dư quỹ (payment_sources.balance)", b1, b2, eqMoney(b1, b2),
      eqMoney(b1, b2) ? "" : "quỹ biến động theo giao dịch — lệch là hệ quả nếu V1 vẫn bán",
      true); // derived aggregate: drifts in either direction while V1 runs
  } catch (e) {
    record("số dư quỹ", "?", "?", false, e.message);
  }

  // 4. Outstanding debts (customer + supplier).
  try {
    const [cd1, cd2] = await Promise.all([
      sumColumn(v1, "customer_debts", "remaining_amount"),
      sumColumn(v2, "customer_debts", "remaining_amount")
    ]);
    record("công nợ khách (remaining_amount)", cd1, cd2, eqMoney(cd1, cd2),
      eqMoney(cd1, cd2) ? "" : "công nợ biến động theo giao dịch V1", true);

    const [sd1, sd2] = await Promise.all([
      sumColumn(v1, "supplier_debts", "remaining_amount"),
      sumColumn(v2, "supplier_debts", "remaining_amount")
    ]);
    record("công nợ NCC (remaining_amount)", sd1, sd2, eqMoney(sd1, sd2),
      eqMoney(sd1, sd2) ? "" : "công nợ biến động theo giao dịch V1", true);
  } catch (e) {
    record("công nợ", "?", "?", false, e.message);
  }

  // 5. Normalized item explosion: V1 JSONB element count == V2 child-table rows.
  try {
    const [siV1, siV2] = await Promise.all([
      countJsonbElements(v1, "sales", "items"),
      countRows(v2, "sale_items")
    ]);
    record("sale_items (V1 JSONB → V2 rows)", siV1, siV2, eqInt(siV1, siV2),
      siV1 !== siV2 ? "lệch = dòng bị bỏ hoặc trùng ID (hoặc V1 mới bán thêm)" : "",
      siV1 > siV2); // V2 > V1 = duplicated explosion rows — always hard

    const [wiV1, wiV2] = await Promise.all([
      countJsonbElements(v1, "work_orders", "partsused"),
      countRows(v2, "work_order_items")
    ]);
    record("work_order_items (V1 JSONB → V2 rows)", wiV1, wiV2, eqInt(wiV1, wiV2),
      wiV1 !== wiV2 ? "lệch = dòng bị bỏ hoặc trùng ID (hoặc V1 mới phát sinh)" : "",
      wiV1 > wiV2);
  } catch (e) {
    record("normalized items", "?", "?", false, e.message);
  }

  // 6. Surface migration_errors count (informational — not a hard fail).
  try {
    const errCount = await countRows(v2, "migration_errors");
    record("migration_errors (thông tin)", "-", errCount, true,
      errCount > 0 ? "xem chi tiết trong bảng migration_errors" : "sạch");
  } catch (e) {
    record("migration_errors", "-", "?", false, e.message);
  }

  printReport();
}

function fmt(v) {
  if (typeof v === "number") return v.toLocaleString("vi-VN");
  return String(v);
}

function printReport() {
  console.log("\n" + "=".repeat(78));
  console.log("BÁO CÁO ĐỐI SOÁT V1 ↔ V2" + (ALLOW_V1_NEWER ? "  (chế độ --allow-v1-newer)" : ""));
  console.log("=".repeat(78));
  const pad = (s, n) => String(s).padEnd(n);
  console.log(`${pad("Hạng mục", 42)}${pad("V1", 14)}${pad("V2", 14)}KQ`);
  console.log("-".repeat(78));

  const failed = [];
  const warned = [];
  for (const r of results) {
    let mark = "✅";
    if (!r.pass) {
      if (ALLOW_V1_NEWER && r.soft) {
        warned.push(r);
        mark = "⚠️";
      } else {
        failed.push(r);
        mark = "❌";
      }
    }
    console.log(`${pad(r.name, 42)}${pad(fmt(r.v1Val), 14)}${pad(fmt(r.v2Val), 14)}${mark}`);
    if (r.note) console.log(`    ↳ ${r.note}`);
  }
  console.log("-".repeat(78));

  if (warned.length > 0) {
    console.log(`\n⚠️ ${warned.length} hạng mục lệch do V1 vẫn đang phát sinh (chấp nhận được ở Parallel Run):`);
    for (const w of warned) console.log(`   • ${w.name}`);
    console.log("   → Đêm Golive: đóng băng V1 rồi chạy Full Re-run, sau đó chạy lại script KHÔNG kèm cờ.");
  }

  if (failed.length === 0) {
    if (warned.length === 0) {
      console.log("\n✅ TẤT CẢ ĐỐI SOÁT KHỚP — sẵn sàng Golive.");
    } else {
      console.log("\n✅ Không có lệch nguy hiểm (không có dữ liệu lạ trên V2).");
    }
    process.exit(0);
  } else {
    console.log(`\n❌ ${failed.length} hạng mục LỆCH — KHÔNG được Golive cho tới khi xử lý xong:`);
    for (const f of failed) console.log(`   • ${f.name}`);
    process.exit(2);
  }
}

run().catch((e) => {
  console.error("💥 Lỗi khi chạy đối soát:", e.message);
  process.exit(1);
});
