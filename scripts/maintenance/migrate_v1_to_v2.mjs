import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Project V1 (Production)
const v1Url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const v1ServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Project V2 (Upgrade)
const v2Url = process.env.SUPABASE_URL_V2;
const v2ServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY_V2;

if (!v1Url || !v1ServiceKey) {
  console.error("❌ Error: Missing Supabase V1 credentials in .env");
  process.exit(1);
}

if (!v2Url || !v2ServiceKey) {
  console.error("❌ Error: Missing Supabase V2 credentials in .env");
  console.log("👉 Please add SUPABASE_URL_V2 and SUPABASE_SERVICE_ROLE_KEY_V2 to your .env file.");
  process.exit(1);
}

const v1 = createClient(v1Url, v1ServiceKey, { auth: { persistSession: false } });
const v2 = createClient(v2Url, v2ServiceKey, { auth: { persistSession: false } });

// Allowed columns mapping for each V2 table (aligned strictly with 01_schema.sql)
const ALLOWED_COLUMNS = {
  profiles: ["id", "email", "name", "role", "branch_id", "created_at", "updated_at"],
  store_settings: [
    "id", "store_name", "phone", "address", "logo_url", "slogan",
    "bank_qr_template", "bank_account_number", "bank_bin", "bank_account_name",
    "tax_number", "theme_preset", "markup_settings", "print_template_settings",
    "created_at", "updated_at"
  ],
  categories: ["id", "name", "created_at", "updated_at"],
  parts: [
    "id", "name", "sku", "stock", "reservedstock", "costPrice", "retailPrice", 
    "wholesalePrice", "category", "description", "warrantyperiod", "image_url",
    "min_stock", "created_at"
  ],
  customers: ["id", "name", "phone", "created_at"],
  vehicles: [
    "id", "customer_id", "license_plate", "vehicle_model", "frame_number", 
    "engine_number", "color", "year", "created_at", "updated_at"
  ],
  suppliers: ["id", "name", "phone", "address", "created_at"],
  payment_sources: ["id", "name", "balance", "created_at"],
  employees: ["id", "name", "phone", "role", "status", "bank_account_number", "bank_name", "monthly_salary", "commission_rate_service", "commission_rate_parts", "branch_id", "user_id", "created_at", "updated_at"],
  work_orders: [
    "id", "creationdate", "customername", "customerphone", "vehiclemodel", "licenseplate",
    "issuedescription", "technicianname", "status", "laborcost", "discount", "partsused",
    "notes", "total", "branchid", "depositamount", "depositdate", "deposittransactionid",
    "paymentstatus", "paymentmethod", "additionalpayment", "totalpaid", "remainingamount",
    "paymentdate", "cashtransactionid", "vehicleid", "currentkm", "additionalservices",
    "refunded", "refunded_at", "refund_transaction_id", "refund_reason", "created_at", "updated_at"
  ],
  sales: [
    "id", "date", "items", "subtotal", "discount", "total", "customer", 
    "paymentmethod", "userid", "costprice", "vatrate", "branchid", 
    "cashtransactionid", "sale_code", "refunded", "refunded_at", 
    "refund_transaction_id", "refund_reason", "note", "created_at"
  ],
  cash_transactions: [
    "id", "type", "category", "amount", "date", "description", "branchid", 
    "paymentsource", "reference", "created_by", "saleid"
  ],
  inventory_transactions: [
    "id", "type", "partid", "partname", "quantity", "unitprice", "totalprice", 
    "branchid", "notes", "date", "saleid", "workorderid", "supplierid"
  ],
  customer_debts: [
    "id", "customer_id", "customer_name", "phone", "license_plate", "description", 
    "total_amount", "paid_amount", "remaining_amount", "created_date", "branch_id", 
    "sale_id", "work_order_id", "created_at", "updated_at"
  ],
  supplier_debts: [
    "id", "supplier_id", "supplier_name", "description", "total_amount", 
    "paid_amount", "remaining_amount", "created_date", "branch_id", "created_at", "updated_at"
  ],
  loans: [
    "id", "lender_name", "loan_type", "principal", "interest_rate", "term", 
    "start_date", "end_date", "remaining_amount", "monthly_payment", "status", 
    "purpose", "collateral", "notes", "branch_id", "created_at", "updated_at"
  ],
  loan_payments: [
    "id", "loan_id", "payment_date", "principal_amount", "interest_amount", 
    "total_amount", "remaining_amount", "payment_method", "notes", "branch_id", 
    "cash_transaction_id", "created_at"
  ],
  employee_advances: [
    "id", "employee_id", "employee_name", "amount", "date", "notes", "status", 
    "branch_id", "approved_by", "approved_at", "cash_transaction_id", "created_at", "updated_at"
  ],
  payroll_records: [
    "id", "employee_id", "employee_name", "month_year", "basic_salary", "commission_amount", 
    "advance_amount", "bonus_amount", "deduction_amount", "net_salary", "status", 
    "payment_date", "cash_transaction_id", "branch_id", "created_at", "updated_at"
  ],
  promotions: [
    "id", "title", "description", "image_url", "discount_value", "discount_type", 
    "start_date", "end_date", "active", "branch_id", "created_at", "updated_at"
  ],
  gallery: [
    "id", "title", "description", "image_url", "category", "vehicle_model", 
    "active", "branch_id", "created_at", "updated_at"
  ],
  repair_templates: ["id", "name", "description", "labor_cost", "parts", "duration", "is_active", "branch_id", "created_by", "created_at", "updated_at"],
  notifications: ["id", "title", "content", "type", "read", "branch_id", "metadata", "created_at"],
  notification_settings: ["id", "branch_id", "enable_low_stock", "enable_due_debts", "enable_new_bookings", "created_at", "updated_at"],
  sales_installments: ["id", "sale_id", "due_date", "amount", "paid_amount", "status", "notes", "branch_id", "created_at", "updated_at"],
  knowledge_articles: ["id", "title", "content", "category", "tags", "created_at", "updated_at"],
  marketing_ideas: ["id", "title", "description", "category", "target_audience", "estimated_cost", "created_at"],
  marketing_scripts: ["id", "idea_id", "title", "hook", "body", "notes", "created_at", "updated_at"],
  audit_logs: ["id", "created_by", "action", "table_name", "record_id", "old_data", "new_data", "created_at"]
};

// Helper: Sanitizer to clean records of extra keys
function sanitizeRecord(tableName, record) {
  const allowed = ALLOWED_COLUMNS[tableName];
  if (!allowed) return record;
  
  const sanitized = {};
  allowed.forEach(key => {
    if (record[key] !== undefined) {
      sanitized[key] = record[key];
    } else {
      // Case insensitivity helper
      const lowerKey = key.toLowerCase();
      const actualKey = Object.keys(record).find(k => k.toLowerCase() === lowerKey);
      if (actualKey !== undefined && record[actualKey] !== undefined) {
        sanitized[key] = record[actualKey];
      }
    }
  });
  return sanitized;
}

// Helper: Batch fetch helper to bypass Supabase 1000 row limits
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

// Collect migration issues in-memory, then flush in one batch at the end.
const migrationErrors = [];
function logMigrationError({ sourceTable, sourceId, itemIndex, reason, severity = "warning", payload }) {
  migrationErrors.push({
    source_table: sourceTable,
    source_id: sourceId,
    item_index: itemIndex ?? null,
    reason: reason,
    severity: severity,
    payload: payload
  });
}

async function flushMigrationErrors() {
  if (migrationErrors.length === 0) return;
  const batchSize = 500;
  for (let i = 0; i < migrationErrors.length; i += batchSize) {
    const batch = migrationErrors.slice(i, i + batchSize);
    const { error } = await v2.from("migration_errors").insert(batch);
    if (error) console.error("❌ Failed to write migration_errors batch:", error.message);
  }
  console.log(`📝 Logged ${migrationErrors.length} migration issue(s) to migration_errors.`);
}

async function runMigration() {
  console.log("🚀 Starting Motocare V1 to V2 Migration...");
  console.log(`Source V1: ${v1Url}`);
  console.log(`Target V2: ${v2Url}`);
  console.log("---------------------------------------------------------");

  try {
    // ===================================================================
    // STEP 0: PRECONDITION — auth-migration RPCs must already be deployed.
    // ===================================================================
    console.log("🔒 Expecting temp auth-migration RPCs to be deployed on both projects.");

    // ==========================================
    // STEP 1: CLEAN UP TARGET DB (WIPE BEFORE RUN)
    // ==========================================
    console.log("\n🧹 Wiping transaction tables on V2 to prevent duplicates...");
    const tablesToWipe = [
      "migration_errors",
      "work_order_items", "sale_items",
      "payroll_records", "employee_advances", "employees",
      "loan_payments", "loans",
      "supplier_debts", "customer_debts",
      "inventory_transactions", "cash_transactions",
      "sales", "work_orders",
      "vehicles", "customers", "suppliers", "parts", "categories",
      "payment_sources", "store_settings", "promotions", "gallery",
      "repair_templates", "notifications", "notification_settings",
      "sales_installments", "knowledge_articles", "marketing_scripts", "marketing_ideas",
      "audit_logs"
    ];

    for (const table of tablesToWipe) {
      const deleteQuery = v2.from(table).delete();
      const { error } = table === "migration_errors" 
        ? await deleteQuery.gt("id", 0)
        : await deleteQuery.neq("id", "placeholder_to_allow_unrestricted_delete");

      if (error && error.code !== "PGRST116") {
        console.log(`⚠️ Warning: Could not truncate table ${table}. Msg: ${error.message}`);
      }
    }
    console.log("✅ V2 Target DB is clean.");

    // ===================================================================
    // STEP 2: MIGRATE AUTH.USERS (If temporary RPCs were created by user)
    // ===================================================================
    console.log("\n🔐 Attempting to migrate auth.users (retaining passwords & UUIDs)...");
    
    const { data: usersToMigrate, error: exportError } = await v1.rpc("temp_export_users");
    
    if (exportError) {
      console.log("⚠️ Note: Could not export auth.users automatically (probably already migrated & cleaned up).");
    } else if (usersToMigrate && usersToMigrate.length > 0) {
      console.log(`Found ${usersToMigrate.length} user accounts to migrate.`);
      const { error: importError } = await v2.rpc("temp_import_users", { p_users: usersToMigrate });
      if (importError) {
        console.error("❌ Failed to import user credentials to V2:", importError.message);
      } else {
        console.log("✅ Successfully migrated all user credentials with passwords intact.");
        
        // Clean up RPCs
        console.log("🧹 Cleaning up temporary auth RPCs...");
        try {
          await v1.rpc("temp_cleanup_export");
        } catch (e) {}
        try {
          await v2.rpc("temp_cleanup_import");
        } catch (e) {}
      }
    }

    // ==========================================
    // STEP 3: MIGRATE MASTER CATALOG TABLES
    // ==========================================
    console.log("\n📦 Migrating Master Data...");

    // 3.0 Profiles
    console.log("-> Profiles (roles & branches)...");
    
    // Fetch all current V2 users to map UUIDs by email if they changed (e.g. recreated via dashboard)
    const { data: authData, error: authErr } = await v2.auth.admin.listUsers();
    if (authErr) {
      console.warn("⚠️ Warning: Could not list V2 users to map profiles:", authErr.message);
    }
    
    const v2UsersByEmail = new Map();
    const v2UserIds = new Set();
    if (authData && authData.users) {
      for (const u of authData.users) {
        if (u.email) {
          v2UsersByEmail.set(u.email.toLowerCase(), u.id);
        }
        v2UserIds.add(u.id);
      }
    }

    const profilesById = new Map();
    const v1UserIdToV2UserId = new Map();
    for (const table of ["user_profiles", "profiles"]) {
      try {
        const rows = await fetchAll(v1, table);
        for (const r of rows) {
          const email = (r.email || "").toLowerCase();
          let targetId = r.id;
          
          // Map UUID by email if the UUID in V1 is not in V2, but email exists in V2
          if (!v2UserIds.has(r.id) && v2UsersByEmail.has(email)) {
            targetId = v2UsersByEmail.get(email);
            console.log(`   🔗 Mapping profile email '${r.email}' to new V2 UUID: ${targetId}`);
          }
          
          v1UserIdToV2UserId.set(r.id, targetId);
          
          // Only migrate profile if its ID exists in V2 auth.users to prevent FK violations
          if (v2UserIds.has(targetId)) {
            profilesById.set(targetId, sanitizeRecord("profiles", {
              id: targetId,
              email: r.email ?? null,
              name: r.name ?? r.full_name ?? null,
              role: r.role ?? "staff",
              branch_id: r.branch_id ?? null
            }));
          }
        }
      } catch (err) {
        // table may not exist
      }
    }
    
    if (profilesById.size > 0) {
      const { error } = await v2.from("profiles").upsert([...profilesById.values()], { onConflict: "id" });
      if (error) console.error("❌ profiles:", error.message);
      else console.log(`   ✅ Upserted ${profilesById.size} profiles.`);
    }

    // 3.1 Store Settings
    console.log("-> Store Settings...");
    const storeSettings = await fetchAll(v1, "store_settings");
    if (storeSettings.length > 0) {
      const sanitized = storeSettings.map(s => sanitizeRecord("store_settings", s));
      const { error } = await v2.from("store_settings").insert(sanitized);
      if (error) console.error("❌ store_settings:", error.message);
    }

    // 3.2 Categories
    console.log("-> Categories...");
    const categories = await fetchAll(v1, "categories");
    if (categories.length > 0) {
      const sanitized = categories.map(c => sanitizeRecord("categories", c));
      const { error } = await v2.from("categories").insert(sanitized);
      if (error) console.error("❌ categories:", error.message);
    }

    // 3.3 Parts Catalog
    console.log("-> Parts Catalog...");
    const parts = await fetchAll(v1, "parts");
    const partsMap = new Map(parts.map(p => [p.id, p]));
    if (parts.length > 0) {
      const sanitized = parts.map(p => sanitizeRecord("parts", p));
      const { error } = await v2.from("parts").insert(sanitized);
      if (error) console.error("❌ parts:", error.message);
    }

    // 3.4 Customers
    console.log("-> Customers...");
    const customers = await fetchAll(v1, "customers");
    if (customers.length > 0) {
      const sanitized = customers.map(c => sanitizeRecord("customers", c));
      const { error } = await v2.from("customers").insert(sanitized);
      if (error) console.error("❌ customers:", error.message);
    }

    // 3.5 Vehicles
    console.log("-> Vehicles...");
    let vehicles = [];
    try {
      const rawVehicles = await fetchAll(v1, "vehicles");
      console.log(`   Fetched ${rawVehicles.length} vehicles from V1 table.`);
      vehicles = rawVehicles.map(v => sanitizeRecord("vehicles", {
        id: v.id,
        customer_id: v.customer_id || v.customerid || null,
        license_plate: v.license_plate || v.licenseplate || null,
        vehicle_model: v.vehicle_model || v.vehiclemodel || v.model || null,
        frame_number: v.frame_number || v.framenumber || null,
        engine_number: v.engine_number || v.enginenumber || null,
        color: v.color || null,
        year: v.year || null,
        created_at: v.created_at,
        updated_at: v.updated_at
      }));
    } catch {
      console.log("   ℹ️ V1 has no vehicles table. Extracting vehicles from customers JSONB instead...");
      const vehicleSet = new Set();
      customers.forEach(c => {
        const embeddedVehicles = c.vehicles || [];
        if (Array.isArray(embeddedVehicles)) {
          embeddedVehicles.forEach((v, index) => {
            const licensePlate = v.licensePlate || v.licenseplate || "";
            if (licensePlate) {
              const uniqueKey = `${c.id}_${licensePlate}`;
              if (!vehicleSet.has(uniqueKey)) {
                vehicleSet.add(uniqueKey);
                vehicles.push({
                  id: v.id || `${c.id}_v_${index}`,
                  customer_id: c.id,
                  license_plate: licensePlate,
                  vehicle_model: v.model || v.vehicleModel || null,
                  frame_number: v.frameNumber || v.framenumber || null,
                  engine_number: v.engineNumber || v.enginenumber || null,
                  color: v.color || null,
                  year: Number(v.year) || null,
                  created_at: c.created_at || new Date().toISOString()
                });
              }
            }
          });
        }
      });
      console.log(`   ℹ️ Extracted ${vehicles.length} unique vehicles from customer profiles.`);
    }

    if (vehicles.length > 0) {
      const { error } = await v2.from("vehicles").insert(vehicles);
      if (error) console.error("❌ vehicles:", error.message);
      else console.log(`   ✅ Migrated ${vehicles.length} vehicle records.`);
    }

    const insertedVehicleIds = new Set(vehicles.map(v => v.id));

    // 3.6 Suppliers
    console.log("-> Suppliers...");
    const suppliers = await fetchAll(v1, "suppliers");
    const insertedSupplierIds = new Set(suppliers.map(s => s.id));
    if (suppliers.length > 0) {
      const sanitized = suppliers.map(s => sanitizeRecord("suppliers", s));
      const { error } = await v2.from("suppliers").insert(sanitized);
      if (error) console.error("❌ suppliers:", error.message);
    }

    // 3.7 Payment Sources
    console.log("-> Payment Sources...");
    const paymentSources = await fetchAll(v1, "payment_sources");
    if (paymentSources.length > 0) {
      const sanitized = paymentSources.map(p => sanitizeRecord("payment_sources", p));
      const { error } = await v2.from("payment_sources").insert(sanitized);
      if (error) console.error("❌ payment_sources:", error.message);
    }

    // 3.8 Employees
    console.log("-> Employees...");
    const employees = await fetchAll(v1, "employees");
    
    // Find any employee IDs referenced in advances or payrolls that are missing from employees
    const employeeIds = new Set(employees.map(e => e.id));
    let rawAdvances = [];
    try { rawAdvances = await fetchAll(v1, "employee_advances"); } catch (err) {}
    let rawPayrolls = [];
    try { rawPayrolls = await fetchAll(v1, "payroll_records"); } catch (err) {}
    
    const orphanEmployees = new Map();
    const checkOrphan = (empId, empName, branchId) => {
      if (empId && !employeeIds.has(empId) && !orphanEmployees.has(empId)) {
        orphanEmployees.set(empId, {
          id: empId,
          name: empName || "Nhân viên cũ",
          role: "staff",
          status: "inactive",
          branch_id: branchId || "CN1",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    };
    
    rawAdvances.forEach(r => {
      checkOrphan(r.employee_id || r.employeeId, r.employee_name || r.employeeName, r.branch_id || r.branchId);
    });
    rawPayrolls.forEach(r => {
      checkOrphan(r.employee_id || r.employeeId, r.employee_name || r.employeeName, r.branch_id || r.branchId);
    });
    
    if (orphanEmployees.size > 0) {
      console.log(`   ℹ️ Found ${orphanEmployees.size} orphan employees in advances/payrolls. Recreating them as inactive...`);
      for (const [id, emp] of orphanEmployees) {
        console.log(`     - Recreating employee '${emp.name}' (${id})`);
        employees.push(emp);
      }
    }

    if (employees.length > 0) {
      const sanitized = employees.map(e => sanitizeRecord("employees", {
        id: e.id,
        name: e.name,
        phone: e.phone || null,
        role: e.role || e.position || "staff",
        status: e.status || "active",
        bank_account_number: e.bank_account_number || e.bankAccountNumber || null,
        bank_name: e.bank_name || e.bankName || null,
        monthly_salary: Number(e.monthly_salary || e.monthlySalary || e.salary || 0),
        commission_rate_parts: Number(e.commission_rate_parts || e.commissionRateParts || 0),
        commission_rate_service: Number(e.commission_rate_service || e.commissionRateService || 0),
        branch_id: e.branch_id || e.branchid || "CN1",
        user_id: v1UserIdToV2UserId.has(e.user_id || e.userid)
          ? v1UserIdToV2UserId.get(e.user_id || e.userid)
          : (e.user_id || e.userid || null),
        created_at: e.created_at || new Date().toISOString()
      }));
      const { error } = await v2.from("employees").insert(sanitized);
      if (error) console.error("❌ employees:", error.message);
    }

    const insertedCustomerIds = new Set(customers.map(c => c.id));
    const insertedEmployeeIds = new Set(employees.map(e => e.id));

    // ==========================================
    // STEP 4: MIGRATE WORK ORDERS (With normalization)
    // ==========================================
    console.log("\n🛠 Migrating Work Orders (with normalization)...");
    const workOrders = await fetchAll(v1, "work_orders");
    console.log(`Found ${workOrders.length} Work Orders to migrate.`);

    const woItemsToInsert = [];
    const normalizedWorkOrders = workOrders.map(wo => {
      const partsUsed = wo.partsused || wo.partsUsed || [];
      if (Array.isArray(partsUsed)) {
        partsUsed.forEach((item, index) => {
          const lineNo = index + 1;
          const partId = item.partId || item.partid;
          
          let validPartId = partId;
          if (partId && !partsMap.has(partId)) {
            validPartId = null;
            logMigrationError({
              sourceTable: "work_order_items",
              sourceId: wo.id,
              itemIndex: index,
              reason: "orphan_part_id",
              payload: { partId, partName: item.partName || item.partname, item }
            });
          }

          woItemsToInsert.push({
            id: `${wo.id}_${lineNo}`,
            work_order_id: wo.id,
            part_id: validPartId,
            part_name: item.partName || item.partname || "Phụ tùng không rõ tên",
            sku: item.sku || "N/A",
            category: item.category || null,
            quantity: Number(item.quantity) || 1,
            price: Number(item.price || item.sellingPrice || item.sellingprice) || 0,
            cost_price: item.costPrice !== undefined ? Number(item.costPrice) : (item.costprice !== undefined ? Number(item.costprice) : null)
          });
        });
      }

      const vId = wo.vehicleid || wo.vehicleId;
      const validVehicleId = insertedVehicleIds.has(vId) ? vId : null;

      return sanitizeRecord("work_orders", {
        ...wo,
        vehicleid: validVehicleId
      });
    });

    const insertedWorkOrderIds = new Set(workOrders.map(w => w.id));

    const batchSize = 500;
    for (let i = 0; i < normalizedWorkOrders.length; i += batchSize) {
      const batch = normalizedWorkOrders.slice(i, i + batchSize);
      const { error } = await v2.from("work_orders").insert(batch);
      if (error) throw new Error(`Failed to insert work_orders batch: ${error.message}`);
    }
    console.log(`   ✅ Migrated ${normalizedWorkOrders.length} Work Orders parent records.`);

    for (let i = 0; i < woItemsToInsert.length; i += batchSize) {
      const batch = woItemsToInsert.slice(i, i + batchSize);
      const { error } = await v2.from("work_order_items").insert(batch);
      if (error) throw new Error(`Failed to insert work_order_items batch: ${error.message}`);
    }
    console.log(`   ✅ Migrated ${woItemsToInsert.length} Work Order items.`);

    // ==========================================
    // STEP 5: MIGRATE SALES (With normalization)
    // ==========================================
    console.log("\n🛒 Migrating Retail Sales (with normalization)...");
    const sales = await fetchAll(v1, "sales");
    console.log(`Found ${sales.length} Sales transactions to migrate.`);

    const saleItemsToInsert = [];
    const normalizedSales = sales.map(sale => {
      const items = sale.items || [];
      if (Array.isArray(items)) {
        items.forEach((item, index) => {
          const lineNo = index + 1;
          const partId = item.partId || item.partid;
          
          let validPartId = partId;
          if (partId && !partsMap.has(partId)) {
            validPartId = null;
            logMigrationError({
              sourceTable: "sale_items",
              sourceId: sale.id,
              itemIndex: index,
              reason: "orphan_part_id_quick_service",
              payload: { partId, partName: item.partName || item.partname, item }
            });
          }

          saleItemsToInsert.push({
            id: `${sale.id}_${lineNo}`,
            sale_id: sale.id,
            part_id: validPartId,
            part_name: item.partName || item.partname || "Sản phẩm không rõ tên",
            sku: item.sku || "N/A",
            quantity: Number(item.quantity) || 1,
            price: Number(item.price || item.sellingPrice || item.sellingprice) || 0,
            cost_price: item.costPrice !== undefined ? Number(item.costPrice) : (item.costprice !== undefined ? Number(item.costprice) : null)
          });
        });
      }

      return sanitizeRecord("sales", sale);
    });

    const insertedSaleIds = new Set(sales.map(s => s.id));

    for (let i = 0; i < normalizedSales.length; i += batchSize) {
      const batch = normalizedSales.slice(i, i + batchSize);
      const { error } = await v2.from("sales").insert(batch);
      if (error) throw new Error(`Failed to insert sales batch: ${error.message}`);
    }
    console.log(`   ✅ Migrated ${normalizedSales.length} Sales parent records.`);

    for (let i = 0; i < saleItemsToInsert.length; i += batchSize) {
      const batch = saleItemsToInsert.slice(i, i + batchSize);
      const { error } = await v2.from("sale_items").insert(batch);
      if (error) throw new Error(`Failed to insert sale_items batch: ${error.message}`);
    }
    console.log(`   ✅ Migrated ${saleItemsToInsert.length} Sales items.`);

    // ==========================================
    // STEP 6: MIGRATE SUPPORTING TRANSACTION TABLES
    // ==========================================
    console.log("\n💵 Migrating supporting financial and log tables...");

    const transactionalTables = [
      "cash_transactions",
      "inventory_transactions",
      "customer_debts",
      "supplier_debts",
      "loans",
      "loan_payments",
      "employee_advances",
      "payroll_records",
      "promotions",
      "gallery",
      "repair_templates",
      "notifications",
      "notification_settings",
      "sales_installments",
      "knowledge_articles",
      "marketing_ideas",
      "marketing_scripts",
      "audit_logs"
    ];

    const insertedLoanIds = new Set();

    for (const table of transactionalTables) {
      console.log(`-> Table ${table}...`);
      let records;
      try {
        records = await fetchAll(v1, table);
      } catch {
        console.log(`   ⚠️ Table ${table} not found on V1 — skipping.`);
        continue;
      }
      
      if (records.length > 0) {
        // Special manual mapping for tables with complex constraints or field changes
        const mappedRecords = [];
        
        for (const r of records) {
          let mapped = { ...r };
          
          if (table === "inventory_transactions") {
            const pId = r.partid || r.partId;
            const sId = r.saleid || r.saleId;
            const wId = r.workorderid || r.workOrderId;
            const supId = r.supplierid || r.supplierId;
            
            mapped.partid = partsMap.has(pId) ? pId : null;
            mapped.saleid = insertedSaleIds.has(sId) ? sId : null;
            mapped.workorderid = insertedWorkOrderIds.has(wId) ? wId : null;
            mapped.supplierid = insertedSupplierIds.has(supId) ? supId : null;
          }
          
          else if (table === "customer_debts") {
            const total = Number(r.amount || r.total_amount || r.totalAmount || 0);
            const remaining = Number(r.remaining_amount || r.remainingAmount || total);
            const cId = r.customer_id || r.customerId;
            mapped.customer_id = insertedCustomerIds.has(cId) ? cId : null;
            mapped.customer_name = r.customer_name || r.customerName || "Khách hàng";
            mapped.description = r.description || r.notes || "Ghi nhận công nợ";
            mapped.total_amount = total;
            mapped.paid_amount = total - remaining;
            mapped.remaining_amount = remaining;
            mapped.created_date = r.date ? r.date.substring(0, 10) : new Date().toISOString().substring(0, 10);
            mapped.branch_id = r.branch_id || r.branchId || "CN1";
            mapped.sale_id = insertedSaleIds.has(r.sale_id || r.saleId) ? (r.sale_id || r.saleId) : null;
            mapped.work_order_id = insertedWorkOrderIds.has(r.work_order_id || r.workOrderId) ? (r.work_order_id || r.workOrderId) : null;
          }
          
          else if (table === "supplier_debts") {
            const total = Number(r.amount || r.total_amount || r.totalAmount || 0);
            const remaining = Number(r.remaining_amount || r.remainingAmount || total);
            mapped.supplier_name = r.supplier_name || r.supplierName || "Nhà cung cấp";
            mapped.description = r.description || r.notes || "Ghi nhận nợ nhà cung cấp";
            mapped.total_amount = total;
            mapped.paid_amount = total - remaining;
            mapped.remaining_amount = remaining;
            mapped.created_date = r.date ? r.date.substring(0, 10) : new Date().toISOString().substring(0, 10);
            mapped.branch_id = r.branch_id || r.branchId || "CN1";
          }
          
          else if (table === "loans") {
            mapped.lender_name = r.lender_name || r.lenderName || "Người cho vay";
            mapped.loan_type = r.loan_type || r.loanType || "other";
            mapped.principal = Number(r.amount || r.principal || 0);
            mapped.interest_rate = Number(r.interest_rate || r.interestRate || 0);
            mapped.term = Number(r.term || 0);
            mapped.start_date = r.start_date || r.startDate || new Date().toISOString().substring(0, 10);
            mapped.end_date = r.end_date || r.endDate || new Date().toISOString().substring(0, 10);
            mapped.remaining_amount = Number(r.remaining_amount || r.remainingAmount || 0);
            mapped.monthly_payment = Number(r.monthly_payment || r.monthlyPayment || 0);
            mapped.status = r.status || "active";
            mapped.branch_id = r.branch_id || r.branchId || "CN1";
            insertedLoanIds.add(r.id);
          }
          
          else if (table === "loan_payments") {
            if (!insertedLoanIds.has(r.loan_id)) {
              continue; // Skip orphan loan payments
            }
            mapped.payment_date = r.payment_date || r.paymentDate || new Date().toISOString().substring(0, 10);
            mapped.principal_amount = Number(r.principal_amount || r.principalAmount || 0);
            mapped.interest_amount = Number(r.interest_amount || r.interestAmount || 0);
            mapped.total_amount = Number(r.amount || r.total_amount || r.totalAmount || 0);
            mapped.remaining_amount = Number(r.remaining_amount || r.remainingAmount || 0);
            mapped.payment_method = r.payment_method || r.paymentMethod || "bank";
            mapped.branch_id = r.branch_id || r.branchId || "CN1";
          }
          
          else if (table === "employee_advances") {
            const empId = r.employee_id || r.employeeId;
            if (!insertedEmployeeIds.has(empId)) {
              continue; // Skip orphan employee advances (FK NOT NULL)
            }
            mapped.employee_name = r.employee_name || r.employeeName || "Nhân viên";
            mapped.amount = Number(r.amount || r.advance_amount || 0);
            const dateStr = r.date || r.advance_date;
            mapped.date = dateStr ? dateStr.substring(0, 10) : new Date().toISOString().substring(0, 10);
            
            let statusVal = r.status || "approved";
            if (!["pending", "approved", "rejected"].includes(statusVal)) {
              statusVal = "approved";
            }
            mapped.status = statusVal;
            mapped.branch_id = r.branch_id || r.branchId || "CN1";
          }
          
          else if (table === "payroll_records") {
            const empId = r.employee_id || r.employeeId;
            if (!insertedEmployeeIds.has(empId)) {
              continue; // Skip orphan payroll records (FK NOT NULL)
            }
            mapped.employee_name = r.employee_name || r.employeeName || "Nhân viên";
            
            let monthYearVal = "07-2026";
            if (r.month_year) {
              monthYearVal = r.month_year;
            } else if (r.monthYear) {
              monthYearVal = r.monthYear;
            } else if (r.month && typeof r.month === "string") {
              if (r.month.includes("-")) {
                const parts = r.month.split("-");
                if (parts.length === 2) {
                  if (parts[0].length === 4) {
                    monthYearVal = `${parts[1]}-${parts[0]}`;
                  } else {
                    monthYearVal = `${parts[0]}-${parts[1]}`;
                  }
                }
              } else {
                monthYearVal = r.month;
              }
            } else if (r.month && r.year) {
              monthYearVal = `${String(r.month).padStart(2, "0")}-${r.year}`;
            }
            mapped.month_year = monthYearVal;

            mapped.basic_salary = Number(r.basic_salary || r.basicSalary || r.base_salary || r.salary || 0);
            mapped.commission_amount = Number(r.commission_amount || r.commissionAmount || 0);
            mapped.advance_amount = Number(r.advance_amount || r.advanceAmount || r.advances || 0);
            mapped.bonus_amount = Number(r.bonus_amount || r.bonusAmount || r.bonus || 0);
            mapped.deduction_amount = Number(r.deduction_amount || r.deductionAmount || r.deduction || r.deductions || 0);
            mapped.net_salary = Number(r.net_salary || r.netSalary || 0);
            mapped.status = r.status || "approved";
            mapped.branch_id = r.branch_id || r.branchId || "CN1";
          }
          
          else if (table === "promotions") {
            mapped.title = r.title || r.name || "Khuyến mãi";
            mapped.discount_value = Number(r.discount_value || r.value || 0);
            mapped.discount_type = r.discount_type || r.type || "amount";
            mapped.branch_id = r.branch_id || r.branchId || "CN1";
          }
          
          else if (table === "repair_templates") {
            mapped.parts_list = r.parts_list || r.parts || [];
            mapped.branch_id = r.branch_id || r.branchId || "CN1";
          }
          
          else if (table === "notifications") {
            mapped.content = r.content || r.message || "Thông báo hệ thống";
            mapped.type = r.type || "info";
            mapped.branch_id = r.branch_id || r.branchId || "CN1";
          }
          
          else if (table === "audit_logs") {
            mapped.table_name = r.table_name || r.tableName || "unknown";
            mapped.record_id = r.record_id || r.recordId || "unknown";
            mapped.action = r.action || "audit";
          }

          mappedRecords.push(sanitizeRecord(table, mapped));
        }

        if (mappedRecords.length > 0) {
          for (let i = 0; i < mappedRecords.length; i += batchSize) {
            const batch = mappedRecords.slice(i, i + batchSize);
            const { error } = await v2.from(table).insert(batch);
            if (error) {
              console.error(`❌ Table ${table} batch insert error:`, error.message);
            }
          }
          console.log(`   ✅ Migrated ${mappedRecords.length} records for ${table}.`);
        }
      }
    }

    // Flush issues to DB
    await flushMigrationErrors();

    console.log("\n=========================================================");
    console.log("🎉 MIGRATION COMPLETED SUCCESSFULLY!");
    console.log(`Total issues logged: ${migrationErrors.length}`);
    console.log("Please check 'migration_errors' table on Supabase V2 dashboard");
    console.log("for details on any legacy parts that were set to NULL.");
    console.log("=========================================================");

  } catch (err) {
    console.error("\n❌ MIGRATION FAILED:", err.message);
    process.exit(1);
  }
}

runMigration();
