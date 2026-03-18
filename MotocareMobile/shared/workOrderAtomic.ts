import { supabase } from './supabaseClient';

type PaymentStatus = 'unpaid' | 'partial' | 'paid';
type PaymentMethod = 'cash' | 'bank';

type AtomicPart = {
  partId: string;
  partName: string;
  quantity: number;
  price: number;
  costPrice?: number;
  sku?: string;
  category?: string;
};

type AtomicService = {
  id: string;
  description: string;
  quantity: number;
  price: number;
  costPrice?: number;
};

type CreateAtomicInput = {
  id: string;
  customerName: string;
  customerPhone: string;
  vehicleModel: string;
  licensePlate: string;
  vehicleId?: string | null;
  currentKm?: number | null;
  issueDescription: string;
  technicianName: string;
  status: string;
  laborCost: number;
  discount: number;
  partsUsed: AtomicPart[];
  additionalServices?: AtomicService[];
  total: number;
  branchId: string;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod | null;
  depositAmount?: number;
  additionalPayment?: number;
};

type UpdateAtomicInput = Omit<CreateAtomicInput, 'id' | 'branchId'> & {
  id: string;
};

type AtomicResult = {
  workOrder?: Record<string, unknown>;
  depositTransactionId?: string;
  paymentTransactionId?: string;
  inventoryTxCount?: number;
  inventoryDeducted?: boolean;
  stockWarnings?: unknown[];
};

const parseInsufficientStockMessage = (raw: string): string | null => {
  const upper = raw.toUpperCase();
  if (!upper.includes('INSUFFICIENT_STOCK')) return null;

  const colon = raw.indexOf(':');
  if (colon < 0) return 'Ton kho khong du';

  const jsonStr = raw.slice(colon + 1).trim();
  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) return 'Ton kho khong du';
    const detail = parsed
      .map((item: any) => {
        const name = String(item?.partName || item?.partId || '?');
        const available = Number(item?.available || 0);
        const requested = Number(item?.requested || 0);
        return `${name} (con ${available}, can ${requested})`;
      })
      .join(', ');
    return detail ? `Thieu ton kho: ${detail}` : 'Ton kho khong du';
  } catch {
    return 'Ton kho khong du';
  }
};

const toAtomicError = (error: any) => {
  const raw = String(error?.details || error?.message || '');
  const insufficient = parseInsufficientStockMessage(raw);
  if (insufficient) return new Error(insufficient);

  const upper = raw.toUpperCase();
  if (upper.includes('ORDER_NOT_FOUND')) return new Error('Khong tim thay phieu sua chua');
  if (upper.includes('PART_NOT_FOUND')) return new Error('Khong tim thay phu tung trong kho');
  if (upper.includes('INVALID_PART')) return new Error('Du lieu phu tung khong hop le');
  if (upper.includes('UNAUTHORIZED')) return new Error('Ban khong co quyen thuc hien thao tac nay');
  if (upper.includes('BRANCH_MISMATCH')) return new Error('Chi nhanh khong khop voi quyen hien tai');

  return new Error(error?.message || 'Khong the xu ly phieu sua');
};

const getAuthUserId = async () => {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id || null;
  } catch {
    return null;
  }
};

const callCreateAtomic = async (payload: Record<string, unknown>) => {
  return supabase.rpc('work_order_create_atomic', payload);
};

const callUpdateAtomic = async (payload: Record<string, unknown>) => {
  return supabase.rpc('work_order_update_atomic', payload);
};

export async function createWorkOrderAtomicMobile(input: CreateAtomicInput): Promise<AtomicResult> {
  const userId = (await getAuthUserId()) || 'unknown';

  const payloadWithVehicle = {
    p_order_id: input.id,
    p_customer_name: input.customerName || '',
    p_customer_phone: input.customerPhone || '',
    p_vehicle_model: input.vehicleModel || '',
    p_license_plate: input.licensePlate || '',
    p_vehicle_id: input.vehicleId || null,
    p_current_km: input.currentKm || null,
    p_issue_description: input.issueDescription || '',
    p_technician_name: input.technicianName || '',
    p_status: input.status || 'Tiếp nhận',
    p_labor_cost: input.laborCost || 0,
    p_discount: input.discount || 0,
    p_parts_used: input.partsUsed || [],
    p_additional_services: input.additionalServices && input.additionalServices.length > 0 ? input.additionalServices : null,
    p_total: input.total || 0,
    p_branch_id: input.branchId || 'CN1',
    p_payment_status: input.paymentStatus || 'unpaid',
    p_payment_method: input.paymentMethod || null,
    p_deposit_amount: input.depositAmount || 0,
    p_additional_payment: input.additionalPayment || 0,
    p_user_id: userId,
  };

  const payloadLegacy = {
    p_order_id: input.id,
    p_customer_name: input.customerName || '',
    p_customer_phone: input.customerPhone || '',
    p_vehicle_model: input.vehicleModel || '',
    p_license_plate: input.licensePlate || '',
    p_issue_description: input.issueDescription || '',
    p_technician_name: input.technicianName || '',
    p_status: input.status || 'Tiếp nhận',
    p_labor_cost: input.laborCost || 0,
    p_discount: input.discount || 0,
    p_parts_used: input.partsUsed || [],
    p_additional_services: input.additionalServices && input.additionalServices.length > 0 ? input.additionalServices : null,
    p_total: input.total || 0,
    p_branch_id: input.branchId || 'CN1',
    p_payment_status: input.paymentStatus || 'unpaid',
    p_payment_method: input.paymentMethod || null,
    p_deposit_amount: input.depositAmount || 0,
    p_additional_payment: input.additionalPayment || 0,
    p_user_id: userId,
  };

  let result = await callCreateAtomic(payloadWithVehicle);
  if (result.error) {
    const msg = String(result.error.message || '').toLowerCase();
    if (msg.includes('function') && (msg.includes('p_vehicle_id') || msg.includes('p_current_km'))) {
      result = await callCreateAtomic(payloadLegacy);
    }
  }

  if (result.error || !result.data) throw toAtomicError(result.error);
  return result.data as AtomicResult;
}

export async function updateWorkOrderAtomicMobile(input: UpdateAtomicInput): Promise<AtomicResult> {
  const userId = (await getAuthUserId()) || 'unknown';

  const payloadWithVehicle = {
    p_order_id: input.id,
    p_customer_name: input.customerName || '',
    p_customer_phone: input.customerPhone || '',
    p_vehicle_model: input.vehicleModel || '',
    p_license_plate: input.licensePlate || '',
    p_vehicle_id: input.vehicleId || null,
    p_current_km: input.currentKm || null,
    p_issue_description: input.issueDescription || '',
    p_technician_name: input.technicianName || '',
    p_status: input.status || 'Tiếp nhận',
    p_labor_cost: input.laborCost || 0,
    p_discount: input.discount || 0,
    p_parts_used: input.partsUsed || [],
    p_additional_services: input.additionalServices && input.additionalServices.length > 0 ? input.additionalServices : null,
    p_total: input.total || 0,
    p_payment_status: input.paymentStatus || 'unpaid',
    p_payment_method: input.paymentMethod || null,
    p_deposit_amount: input.depositAmount || 0,
    p_additional_payment: input.additionalPayment || 0,
    p_user_id: userId,
  };

  const payloadLegacy = {
    p_order_id: input.id,
    p_customer_name: input.customerName || '',
    p_customer_phone: input.customerPhone || '',
    p_vehicle_model: input.vehicleModel || '',
    p_license_plate: input.licensePlate || '',
    p_issue_description: input.issueDescription || '',
    p_technician_name: input.technicianName || '',
    p_status: input.status || 'Tiếp nhận',
    p_labor_cost: input.laborCost || 0,
    p_discount: input.discount || 0,
    p_parts_used: input.partsUsed || [],
    p_additional_services: input.additionalServices && input.additionalServices.length > 0 ? input.additionalServices : null,
    p_total: input.total || 0,
    p_payment_status: input.paymentStatus || 'unpaid',
    p_payment_method: input.paymentMethod || null,
    p_deposit_amount: input.depositAmount || 0,
    p_additional_payment: input.additionalPayment || 0,
    p_user_id: userId,
  };

  let result = await callUpdateAtomic(payloadWithVehicle);
  if (result.error) {
    const msg = String(result.error.message || '').toLowerCase();
    if (msg.includes('function') && (msg.includes('p_vehicle_id') || msg.includes('p_current_km'))) {
      result = await callUpdateAtomic(payloadLegacy);
    }
  }

  if (result.error || !result.data) throw toAtomicError(result.error);
  return result.data as AtomicResult;
}
