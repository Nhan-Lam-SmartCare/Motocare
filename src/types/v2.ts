// ===================================================================
// MOTOCARE V2 - STANDARDIZED TYPES & SCHEMA INTERFACES
// File: src/types/v2.ts
// ===================================================================

export interface VehicleV2 {
  id: string;
  customer_id: string | null;
  license_plate: string;
  vehicle_model?: string;
  frame_number?: string;
  engine_number?: string;
  color?: string;
  year?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CategoryV2 {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PartV2 {
  id: string;
  name: string;
  sku: string;
  stock: Record<string, number>; // JSONB branch -> quantity mapping
  reservedstock: Record<string, number>;
  costPrice: Record<string, number>;
  retailPrice: Record<string, number>;
  wholesalePrice: Record<string, number>;
  category?: string;
  description?: string;
  warrantyperiod?: string;
  image_url?: string;
  min_stock?: number;
  created_at?: string;
}

export interface CustomerV2 {
  id: string;
  name: string;
  phone?: string;
  created_at?: string;
}

export interface EmployeeV2 {
  id: string;
  name: string;
  phone?: string;
  role: string;
  status: "active" | "inactive";
  bank_account_number?: string;
  bank_name?: string;
  monthly_salary: number;
  commission_rate_service: number;
  commission_rate_parts: number;
  branch_id: string;
  user_id?: string; // Links to auth.users.id
  created_at?: string;
  updated_at?: string;
}

export interface WorkOrderV2 {
  id: string;
  creationdate: string; // ISO
  customername: string;
  customerphone?: string;
  vehiclemodel?: string;
  licenseplate?: string;
  issuedescription?: string;
  technicianname?: string;
  status: "Tiếp nhận" | "Đang sửa" | "Đã sửa xong" | "Trả máy" | "Đã hủy";
  laborcost: number;
  discount: number;
  partsused: any[]; // JSONB backward compatibility fallback
  notes?: string;
  total: number;
  branchid: string;
  depositamount: number;
  depositdate?: string;
  deposittransactionid?: string;
  paymentstatus: "unpaid" | "paid" | "partial";
  paymentmethod?: "cash" | "bank";
  additionalpayment: number;
  totalpaid: number;
  remainingamount: number;
  paymentdate?: string;
  cashtransactionid?: string;
  vehicleid?: string;
  currentkm?: number;
  additionalservices?: any[]; // JSONB additional services array
  refunded: boolean;
  refunded_at?: string;
  refund_transaction_id?: string;
  refund_reason?: string;
  created_at?: string;
  updated_at?: string;
}

export interface WorkOrderItemV2 {
  id: string; // work_order_id || '_' || line_no
  work_order_id: string;
  part_id: string | null;
  part_name: string;
  sku: string;
  category?: string;
  quantity: number;
  price: number;
  cost_price?: number;
  created_at?: string;
}

export interface SaleV2 {
  id: string;
  date: string;
  items: any[]; // JSONB backward compatibility fallback
  subtotal: number;
  discount: number;
  total: number;
  customer: { id?: string; name: string; phone?: string }; // JSONB
  paymentmethod: "cash" | "bank";
  userid?: string;
  costprice?: Record<string, number>;
  vatrate?: number;
  branchid: string;
  cashtransactionid?: string;
  sale_code?: string;
  refunded: boolean;
  refunded_at?: string;
  refund_transaction_id?: string;
  refund_reason?: string;
  note?: string;
  created_at?: string;
}

export interface SaleItemV2 {
  id: string; // sale_id || '_' || line_no
  sale_id: string;
  part_id: string | null;
  part_name: string;
  sku: string;
  quantity: number;
  price: number;
  cost_price?: number;
  created_at?: string;
}

export interface CashTransactionV2 {
  id: string;
  type: "income" | "expense" | "deposit";
  category: string;
  amount: number;
  date: string;
  description: string;
  branchid: string;
  paymentsource: string;
  reference?: string;
  created_by?: string;
  saleid?: string;
}

export interface InventoryTransactionV2 {
  id: string;
  type: "Nhập kho" | "Xuất kho";
  partid: string | null;
  partname: string;
  quantity: number;
  unitprice?: number;
  totalprice: number;
  branchid: string;
  notes?: string;
  date: string;
  saleid?: string;
  workorderid?: string;
  supplierid?: string;
}

export interface CustomerDebtV2 {
  id: string;
  customer_id: string | null;
  customer_name: string;
  phone?: string;
  license_plate?: string;
  description: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  created_date: string;
  branch_id: string;
  sale_id?: string;
  work_order_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SupplierDebtV2 {
  id: string;
  supplier_id: string | null;
  supplier_name: string;
  description: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  created_date: string;
  branch_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface LoanV2 {
  id: string;
  lender_name: string;
  loan_type: "bank" | "personal" | "other";
  principal: number;
  interest_rate: number;
  term: number;
  start_date: string;
  end_date: string;
  remaining_amount: number;
  monthly_payment: number;
  status: "active" | "paid" | "overdue";
  purpose?: string;
  collateral?: string;
  notes?: string;
  branch_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface LoanPaymentV2 {
  id: string;
  loan_id: string;
  payment_date: string;
  principal_amount: number;
  interest_amount: number;
  total_amount: number;
  remaining_amount: number;
  payment_method: "cash" | "bank";
  notes?: string;
  branch_id: string;
  cash_transaction_id?: string;
  created_at?: string;
}

export interface EmployeeAdvanceV2 {
  id: string;
  employee_id: string;
  employee_name: string;
  amount: number;
  date: string;
  notes?: string;
  status: "pending" | "approved" | "rejected";
  branch_id: string;
  approved_by?: string;
  approved_at?: string;
  cash_transaction_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PayrollRecordV2 {
  id: string;
  employee_id: string;
  employee_name: string;
  month_year: string; // MM-YYYY
  basic_salary: number;
  commission_amount: number;
  advance_amount: number;
  bonus_amount: number;
  deduction_amount: number;
  net_salary: number;
  status: "draft" | "approved" | "paid";
  payment_date?: string;
  cash_transaction_id?: string;
  branch_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface PromotionV2 {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  discount_value?: number;
  discount_type?: "percent" | "amount";
  start_date?: string;
  end_date?: string;
  active: boolean;
  branch_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface RepairTemplateV2 {
  id: string;
  name: string;
  description?: string;
  labor_cost: number;
  parts_list: any[]; // JSONB list of parts template
  branch_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface NotificationV2 {
  id: string;
  title: string;
  content: string;
  type: string;
  read: boolean;
  branch_id: string;
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface AuditLogV2 {
  id: string;
  created_by?: string;
  action: string;
  table_name: string;
  record_id: string;
  old_data?: Record<string, any>;
  new_data?: Record<string, any>;
  created_at?: string;
}
