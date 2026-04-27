// Deprecated local client: use the unified client defined in supabaseClient.ts
// to prevent multiple GoTrue instances (warning in console).
import { supabase } from "../supabaseClient";
import { canonicalizeMotocareCashTxCategory } from "./finance/cashTxCategories";

// Helper functions for common operations
export const supabaseHelpers = {
  // Customers
  async getCustomers() {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Map database column names (lowercase) to TypeScript property names (camelCase)
    return (data || []).map((customer: any) => ({
      ...customer,
      // Ensure camelCase properties are available
      totalSpent: customer.totalSpent ?? customer.totalspent ?? 0,
      visitCount: customer.visitCount ?? customer.visitcount ?? 0,
      lastVisit: customer.lastVisit ?? customer.lastvisit ?? null,
      vehicleModel: customer.vehicleModel ?? customer.vehiclemodel ?? null,
      licensePlate: customer.licensePlate ?? customer.licenseplate ?? null,
      loyaltyPoints: customer.loyaltyPoints ?? customer.loyaltypoints ?? 0,
    }));
  },

  async createCustomer(customer: any) {
    // Accept both camelCase and lowercase keys to avoid losing vehicle info.
    const vehicleModel = String(
      customer?.vehicleModel ?? customer?.vehiclemodel ?? ""
    ).trim();
    const licensePlate = String(
      customer?.licensePlate ?? customer?.licenseplate ?? ""
    )
      .trim()
      .toUpperCase();

    const {
      vehicleModel: _vehicleModel,
      vehiclemodel: _vehiclemodel,
      licensePlate: _licensePlate,
      licenseplate: _licenseplate,
      ...customerData
    } = customer;

    // Build vehicles array if we have vehicle info
    const vehicles =
      vehicleModel || licensePlate
        ? [{ model: vehicleModel || "", licensePlate: licensePlate || "" }]
        : [];

    const insertData = {
      ...customerData,
      // customers table uses lowercase columns in production DB.
      vehiclemodel: vehicleModel || null,
      licenseplate: licensePlate || null,
      vehicles: vehicles.length > 0 ? vehicles : undefined,
    };

    const { data, error } = await supabase
      .from("customers")
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      vehicleModel: data?.vehicleModel ?? data?.vehiclemodel ?? null,
      licensePlate: data?.licensePlate ?? data?.licenseplate ?? null,
      totalSpent: data?.totalSpent ?? data?.totalspent ?? 0,
      visitCount: data?.visitCount ?? data?.visitcount ?? 0,
      lastVisit: data?.lastVisit ?? data?.lastvisit ?? null,
      loyaltyPoints: data?.loyaltyPoints ?? data?.loyaltypoints ?? 0,
    };
  },

  async createCustomersBulk(customers: any[]) {
    const { data, error } = await supabase
      .from("customers")
      .insert(customers)
      .select();

    if (error) throw error;
    return data;
  },

  async updateCustomer(id: string, updates: any) {
    // Filter out fields that don't exist in the customers table
    // The actual DB columns are: id, name, phone, email, address, vehicles (jsonb),
    // segment, status, loyaltyPoints, totalSpent, visitCount, notes, lastVisit, created_at
    const {
      licensePlate: _licensePlate,
      vehicleModel: _vehicleModel,
      vehicleId: _vehicleId,
      ...validUpdates
    } = updates;

    const { data, error } = await supabase
      .from("customers")
      .update(validUpdates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteCustomer(id: string) {
    const { error } = await supabase.from("customers").delete().eq("id", id);

    if (error) throw error;
    return true;
  },

  // Suppliers
  async getSuppliers() {
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  async createSupplier(supplier: any) {
    const { data, error } = await supabase
      .from("suppliers")
      .insert([supplier])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async createSuppliersBulk(suppliers: any[]) {
    const { data, error } = await supabase
      .from("suppliers")
      .insert(suppliers)
      .select();

    if (error) throw error;
    return data;
  },

  async updateSupplier(id: string, updates: any) {
    const { data, error } = await supabase
      .from("suppliers")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Parts
  async getParts() {
    const { data, error } = await supabase
      .from("parts")
      .select("*")
      .order("name");

    if (error) throw error;
    return data;
  },

  async createPart(part: any) {
    const { data, error } = await supabase
      .from("parts")
      .insert([part])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updatePart(id: string, updates: any) {
    const { data, error } = await supabase
      .from("parts")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Work Orders
  async getWorkOrders() {
    const { data, error } = await supabase
      .from("work_orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  async createWorkOrder(workOrder: any) {
    const { data, error } = await supabase
      .from("work_orders")
      .insert([workOrder])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateWorkOrder(id: string, updates: any) {
    const { data, error } = await supabase
      .from("work_orders")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Sales
  async getSales() {
    const { data, error } = await supabase
      .from("sales")
      .select("*")
      .order("date", { ascending: false });

    if (error) throw error;
    return data;
  },

  async createSale(sale: any) {
    const { data, error } = await supabase
      .from("sales")
      .insert([sale])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Cash Transactions
  async getCashTransactions() {
    const { data, error } = await supabase
      .from("cash_transactions")
      .select("*")
      .order("date", { ascending: false });

    if (error) throw error;

    console.warn(
      "[supabase.getCashTransactions] Raw data from DB:",
      data?.length,
      "records"
    );
    if (data?.length) {
      console.warn("[supabase.getCashTransactions] Sample record:", data[0]);
    }

    // Map DB columns to TypeScript interface (handle both lowercase and camelCase)
    const mapped = (data || []).map((row: any) => ({
      ...row,
      paymentSourceId:
        row.paymentsource || row.paymentSource || row.paymentSourceId || "cash",
      branchId: row.branchid || row.branchId || row.branch_id,
      // Infer type from category if not present
      type:
        row.type ||
        ([
          "sale_income",
          "service_income",
          "other_income",
          "debt_collection",
          "general_income",
        ].includes(row.category)
          ? "income"
          : "expense"),
    }));

    console.warn(
      "[supabase.getCashTransactions] Mapped data:",
      mapped?.length,
      "records"
    );
    return mapped;
  },

  async createCashTransaction(transaction: any) {
    const rawCategory = transaction?.category;
    const canonicalCategory = canonicalizeMotocareCashTxCategory(rawCategory);

    const payload =
      canonicalCategory && typeof canonicalCategory === "string"
        ? { ...transaction, category: canonicalCategory }
        : transaction;

    const { data, error } = await supabase
      .from("cash_transactions")
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Payment Sources
  async getPaymentSources() {
    const { data, error } = await supabase.from("payment_sources").select("*");

    if (error) throw error;
    return data;
  },

  async updatePaymentSource(id: string, updates: any) {
    const { data, error } = await supabase
      .from("payment_sources")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Inventory Transactions
  async getInventoryTransactions() {
    const { data, error } = await supabase
      .from("inventory_transactions")
      .select("*")
      .order("date", { ascending: false });

    if (error) throw error;
    return data;
  },

  async createInventoryTransaction(transaction: any) {
    const { data, error } = await supabase
      .from("inventory_transactions")
      .insert([transaction])
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
