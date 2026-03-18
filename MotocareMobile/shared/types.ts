// Shared types — mirrored from web app src/types.ts
// Keep in sync with the web project types

export interface UserSession {
  id: string;
  email: string;
  name?: string;
}

export interface MaintenanceRecord {
  km: number;
  date: string;
}

export interface VehicleMaintenances {
  oilChange?: MaintenanceRecord;
  gearboxOil?: MaintenanceRecord;
  throttleClean?: MaintenanceRecord;
}

export interface Vehicle {
  id: string;
  model: string;
  licensePlate: string;
  isPrimary?: boolean;
  currentKm?: number;
  firstRecordedKm?: number;
  firstRecordedDate?: string;
  lastMaintenances?: VehicleMaintenances;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  vehicles?: Vehicle[];
  created_at?: string;
  status?: 'active' | 'inactive';
  segment?: 'VIP' | 'Loyal' | 'Potential' | 'At Risk' | 'Lost' | 'New';
  loyaltyPoints?: number;
  totalSpent?: number;
  visitCount?: number;
  lastVisit?: string;
}

export interface Part {
  id: string;
  name: string;
  sku: string;
  imageUrl?: string;
  barcode?: string;
  stock: { [branchId: string]: number };
  reservedstock?: { [branchId: string]: number };
  retailPrice: { [branchId: string]: number };
  wholesalePrice?: { [branchId: string]: number };
  category?: string;
  description?: string;
  costPrice?: { [branchId: string]: number };
  created_at?: string;
}

export interface CartItem {
  partId: string;
  partName: string;
  sku: string;
  category?: string;
  quantity: number;
  sellingPrice: number;
  stockSnapshot: number;
  discount?: number;
  isService?: boolean;
}

export interface Sale {
  id: string;
  sale_code?: string;
  date: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  status?: 'completed' | 'cancelled' | 'refunded';
  customer: { id?: string; name: string; phone?: string };
  paymentMethod: 'cash' | 'bank' | 'card';
  paymentType?: 'full' | 'partial' | 'note' | 'installment';
  partialAmount?: number;
  orderNote?: string;
  paidAmount?: number;
  remainingAmount?: number;
  installmentDetails?: {
    financeCompany?: string;
    prepaidAmount?: number;
    term?: number;
    monthlyPayment?: number;
    interestRate?: number;
    totalDetail?: number;
  };
  deliveryMethod?: 'store_pickup' | 'cod';
  deliveryStatus?: 'pending' | 'preparing' | 'shipping' | 'delivered' | 'cancelled';
  deliveryAddress?: string;
  deliveryPhone?: string;
  deliveryNotes?: string;
  codAmount?: number;
  shippingFee?: number;
  trackingNumber?: string;
  shippingCarrier?: string;
  estimatedDeliveryDate?: string;
  userId: string;
  userName: string;
  branchId: string;
}

export interface WorkOrderPart {
  partId: string;
  partName: string;
  sku: string;
  quantity: number;
  price: number;
  costPrice?: number;
}

export interface WorkOrderService {
  id?: string;
  description?: string;
  quantity?: number;
  price?: number;
  costPrice?: number;
}

export interface WorkOrder {
  id: string;
  creationDate: string;
  estimatedCompletion?: string;
  customerName: string;
  customerPhone?: string;
  customerId?: string;
  vehicleModel?: string;
  licensePlate?: string;
  currentKm?: number;
  issueDescription?: string;
  technicianName?: string;
  assignedTechnician?: string;
  status: 'Tiếp nhận' | 'Đang sửa' | 'Đã sửa xong' | 'Trả máy' | 'Đã hủy';
  laborCost: number;
  discount?: number;
  partsUsed?: WorkOrderPart[];
  additionalServices?: WorkOrderService[];
  notes?: string;
  total: number;
  branchId: string;
  depositAmount?: number;
  paymentStatus?: 'unpaid' | 'paid' | 'partial';
  paymentMethod?: 'cash' | 'bank';
  totalPaid?: number;
  remainingAmount?: number;
  paymentDate?: string;
}

export interface Employee {
  id: string;
  name: string;
  phone?: string;
  position: string;
  department?: string;
  baseSalary: number;
  status: 'active' | 'inactive' | 'terminated';
  branchId?: string;
}

export interface CustomerDebt {
  id: string;
  customerId: string;
  customerName: string;
  phone?: string;
  licensePlate?: string;
  description: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  createdDate: string;
  branchId: string;
}
