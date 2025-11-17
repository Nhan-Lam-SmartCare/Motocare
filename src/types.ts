// Core session/user placeholder
export interface UserSession {
  id: string;
  email: string;
  name?: string;
}

// Domain Types (subset adapted from original repo for standalone needs)
export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  vehicleModel?: string; // Xe (Dòng xe)
  licensePlate?: string; // Biển số
  created_at?: string;
  status?: "active" | "inactive";
  segment?: "VIP" | "Loyal" | "Potential" | "At Risk" | "Lost" | "New";
  loyaltyPoints?: number; // Điểm tích lũy
  totalSpent?: number; // Tổng chi tiêu
  visitCount?: number; // Số lần ghé thăm
  lastVisit?: string; // Lần ghé thăm cuối
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  created_at?: string;
}

export interface Part {
  id: string;
  name: string;
  sku: string;
  // Stock & pricing are branch-mapped for multi-branch future extension
  stock: { [branchId: string]: number };
  retailPrice: { [branchId: string]: number };
  wholesalePrice?: { [branchId: string]: number };
  category?: string;
  description?: string;
  warrantyPeriod?: string;
  // Tax & costing extensions (for future real data integration)
  costPrice?: { [branchId: string]: number };
  vatRate?: number; // e.g. 0.1 for 10%
  created_at?: string;
}

// Product Category entity (normalized instead of deriving from parts)
export interface Category {
  id: string;
  name: string;
  icon?: string; // UI icon key
  color?: string; // Hex color
  created_at?: string;
  updated_at?: string;
}

export interface CartItem {
  partId: string;
  partName: string;
  sku: string;
  quantity: number;
  sellingPrice: number; // Final unit price after selecting retail/wholesale
  stockSnapshot: number; // Stock at time added for validation
  discount?: number; // Per-line discount (absolute)
}

export interface Sale {
  id: string;
  sale_code?: string; // Mã phiếu bán hàng (VD: BH-20241117-001)
  date: string; // ISO
  items: CartItem[];
  subtotal: number; // Sum of (sellingPrice * quantity) before discounts
  discount: number; // Order-level discount (absolute)
  total: number; // subtotal - discount - sum(per-line discounts) if applied
  customer: { id?: string; name: string; phone?: string };
  paymentMethod: "cash" | "bank";
  userId: string; // snapshot user
  userName: string;
  branchId: string;
  cashTransactionId?: string; // link to recorded cash transaction
}

export interface WorkOrderPart {
  partId: string;
  partName: string;
  sku: string;
  quantity: number;
  price: number; // Selling price snapshot
}

export interface WorkOrder {
  id: string;
  creationDate: string; // ISO
  customerName: string;
  customerPhone?: string;
  vehicleModel?: string;
  licensePlate?: string;
  issueDescription?: string;
  technicianName?: string;
  status: "Tiếp nhận" | "Đang sửa" | "Đã sửa xong" | "Trả máy";
  laborCost: number;
  discount?: number; // Order level discount
  partsUsed?: WorkOrderPart[];
  additionalServices?: Array<{
    id: string;
    description: string;
    quantity: number;
    price: number;
  }>; // Báo giá (Gia công, Đặt hàng)
  notes?: string;
  total: number; // labor + parts - discount
  branchId: string;

  // Deposit (Đặt cọc)
  depositAmount?: number; // Số tiền đặt cọc
  depositDate?: string; // Ngày đặt cọc
  depositTransactionId?: string; // Link to deposit transaction

  // Payment (Thanh toán)
  paymentStatus?: "unpaid" | "paid" | "partial";
  paymentMethod?: "cash" | "bank";
  additionalPayment?: number; // Số tiền thanh toán thêm khi trả xe
  totalPaid?: number; // Tổng đã trả = depositAmount + additionalPayment
  remainingAmount?: number; // Còn nợ = total - totalPaid
  paymentDate?: string;
  cashTransactionId?: string; // Link to final payment transaction

  // Refund (Hoàn tiền)
  refunded?: boolean; // True if refunded/cancelled
  refunded_at?: string; // Timestamp when refunded (snake_case to match DB)
  refund_transaction_id?: string; // Link to refund transaction (snake_case to match DB)
  refund_reason?: string; // Reason for refund (snake_case to match DB)
}

export interface InventoryTransaction {
  id: string;
  type: "Nhập kho" | "Xuất kho";
  partId: string;
  partName: string;
  quantity: number;
  date: string;
  unitPrice?: number; // for nhập kho (cost)
  totalPrice: number;
  branchId: string;
  notes?: string;
  saleId?: string;
  workOrderId?: string;
}

export interface PaymentSource {
  id: string; // e.g. 'cash', 'bank'
  name: string;
  balance: { [branchId: string]: number };
  isDefault?: boolean;
}

export type CashTransactionCategory =
  | "sale_income"
  | "service_income"
  | "other_income"
  | "inventory_purchase"
  | "salary"
  | "loan_payment"
  | "debt_collection"
  | "debt_payment"
  | "sale_refund"
  | "other_expense";

export interface CashTransaction {
  id: string;
  type: "income" | "expense";
  date: string;
  amount: number;
  recipient?: string; // Đối tượng thu/chi
  notes: string;
  paymentSourceId: string;
  branchId: string;
  category?: CashTransactionCategory;
  saleId?: string;
  workOrderId?: string;
}

// Employee & Payroll Types
export interface Employee {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  position: string; // Chức vụ
  department?: string; // Phòng ban
  baseSalary: number; // Lương cơ bản
  allowances?: number; // Phụ cấp
  startDate: string; // Ngày vào làm
  status: "active" | "inactive" | "terminated";
  branchId?: string; // Chi nhánh
  bankAccount?: string; // Số tài khoản
  bankName?: string; // Tên ngân hàng
  taxCode?: string; // Mã số thuế
  created_at?: string;
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  month: string; // Format: YYYY-MM
  baseSalary: number; // Lương cơ bản
  allowances: number; // Phụ cấp
  bonus: number; // Thưởng
  deduction: number; // Phạt/Khấu trừ
  workDays: number; // Số ngày làm việc
  standardWorkDays: number; // Số ngày chuẩn (26)
  socialInsurance: number; // BHXH (8%)
  healthInsurance: number; // BHYT (1.5%)
  unemploymentInsurance: number; // BHTN (1%)
  personalIncomeTax: number; // Thuế TNCN
  netSalary: number; // Lương thực nhận
  paymentStatus: "pending" | "paid";
  paymentDate?: string;
  paymentMethod?: "cash" | "bank";
  notes?: string;
  branchId: string;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  checkIn?: string; // HH:MM:SS
  checkOut?: string; // HH:MM:SS
  status: "present" | "absent" | "late" | "leave" | "holiday";
  workHours?: number;
  overtime?: number;
  notes?: string;
  branchId: string;
}

// Loan & Capital Types
export interface Loan {
  id: string;
  lenderName: string; // Tên ngân hàng/người cho vay
  loanType: "bank" | "personal" | "other"; // Loại vay
  principal: number; // Số tiền vay gốc
  interestRate: number; // Lãi suất %/năm
  term: number; // Kỳ hạn (tháng)
  startDate: string; // Ngày vay
  endDate: string; // Ngày đến hạn
  remainingAmount: number; // Số tiền còn nợ
  monthlyPayment: number; // Số tiền trả hàng tháng
  status: "active" | "paid" | "overdue";
  purpose?: string; // Mục đích vay
  collateral?: string; // Tài sản thế chấp
  notes?: string;
  branchId: string;
  created_at: string;
}

export interface LoanPayment {
  id: string;
  loanId: string;
  paymentDate: string;
  principalAmount: number; // Tiền gốc
  interestAmount: number; // Tiền lãi
  totalAmount: number; // Tổng tiền trả
  remainingAmount: number; // Số tiền còn lại sau khi trả
  paymentMethod: "cash" | "bank";
  notes?: string;
  branchId: string;
  cashTransactionId?: string;
}

export interface Capital {
  id: string;
  type: "owner" | "investor" | "loan"; // Vốn chủ/Nhà đầu tư/Vay
  sourceName: string; // Tên nguồn vốn
  amount: number; // Số tiền
  date: string; // Ngày nhận
  notes?: string;
  branchId: string;
  created_at: string;
}

export interface CustomerDebt {
  id: string;
  customerId: string;
  customerName: string;
  phone?: string;
  licensePlate?: string;
  description: string; // Nội dung
  totalAmount: number; // Số tiền
  paidAmount: number; // Đã trả
  remainingAmount: number; // Còn nợ
  createdDate: string;
  branchId: string;
}

export interface SupplierDebt {
  id: string;
  supplierId: string;
  supplierName: string;
  description: string; // Nội dung
  totalAmount: number; // Số tiền
  paidAmount: number; // Đã trả
  remainingAmount: number; // Còn nợ
  createdDate: string;
  branchId: string;
}

// High-level app state snapshot (not strictly used by context but handy)
export interface AppState {
  user: UserSession | null;
  customers: Customer[];
  parts: Part[];
  sales: Sale[];
  workOrders: WorkOrder[];
  cartItems: CartItem[];
  paymentSources: PaymentSource[];
  cashTransactions: CashTransaction[];
  employees: Employee[];
  payrollRecords: PayrollRecord[];
  loans: Loan[];
  loanPayments: LoanPayment[];
}
