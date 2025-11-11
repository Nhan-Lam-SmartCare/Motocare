import { supabase } from "../../supabaseClient";
import type { InventoryTransaction } from "../../types";
import { RepoResult, success, failure } from "./types";
import { safeAudit } from "./auditLogsRepository";

const TABLE = "inventory_transactions";

export interface CreateInventoryTxInput {
  type: InventoryTransaction["type"]; // "Nhập kho" | "Xuất kho"
  partId: string;
  partName: string;
  quantity: number; // positive number, will be signed logically by type
  branchId: string;
  date?: string; // ISO
  unitPrice?: number; // optional for Xuất kho
  totalPrice?: number; // if omitted -> quantity * unitPrice (if unitPrice provided)
  notes?: string;
  saleId?: string;
  workOrderId?: string;
}

// Fetch latest transactions (optionally by branch, limit, date range)
export async function fetchInventoryTransactions(params?: {
  branchId?: string;
  limit?: number;
  startDate?: string;
  endDate?: string;
}): Promise<RepoResult<InventoryTransaction[]>> {
  try {
    let query = supabase
      .from(TABLE)
      .select("*")
      .order("date", { ascending: false });
    if (params?.branchId) query = query.eq("branchId", params.branchId);
    if (params?.startDate) query = query.gte("date", params.startDate);
    if (params?.endDate) query = query.lte("date", params.endDate);
    if (params?.limit) query = query.limit(params.limit);
    const { data, error } = await query;
    if (error)
      return failure({
        code: "supabase",
        message: "Không thể tải lịch sử kho",
        cause: error,
      });
    return success((data || []) as InventoryTransaction[]);
  } catch (e: any) {
    return failure({
      code: "network",
      message: "Lỗi kết nối khi tải lịch sử kho",
      cause: e,
    });
  }
}

export async function createInventoryTransaction(
  input: CreateInventoryTxInput
): Promise<RepoResult<InventoryTransaction>> {
  try {
    if (!input.partId || !input.partName)
      return failure({
        code: "validation",
        message: "Thiếu thông tin phụ tùng",
      });
    if (!input.quantity || input.quantity <= 0)
      return failure({ code: "validation", message: "Số lượng phải > 0" });
    if (!input.branchId)
      return failure({ code: "validation", message: "Thiếu chi nhánh" });
    if (!input.type)
      return failure({
        code: "validation",
        message: "Thiếu loại giao dịch kho",
      });

    const unitPrice = input.unitPrice ?? 0;
    const totalPrice = input.totalPrice ?? unitPrice * input.quantity;

    const payload: any = {
      type: input.type,
      partId: input.partId,
      partName: input.partName,
      quantity: input.quantity,
      date: input.date || new Date().toISOString(),
      unitPrice: unitPrice || null,
      totalPrice,
      branchId: input.branchId,
      notes: input.notes,
      saleId: input.saleId,
      workOrderId: input.workOrderId,
    };

    const { data, error } = await supabase
      .from(TABLE)
      .insert([payload])
      .select()
      .single();
    if (error || !data)
      return failure({
        code: "supabase",
        message: "Ghi lịch sử kho thất bại",
        cause: error,
      });
    // Audit inventory transaction
    let userId: string | null = null;
    try {
      const { data: userData } = await supabase.auth.getUser();
      userId = userData?.user?.id || null;
    } catch {}
    await safeAudit(userId, {
      action:
        input.type === "Nhập kho" ? "inventory.receipt" : "inventory.adjust",
      tableName: TABLE,
      recordId: (data as any).id,
      oldData: null,
      newData: data,
    });
    return success(data as InventoryTransaction);
  } catch (e: any) {
    return failure({
      code: "network",
      message: "Lỗi kết nối khi ghi lịch sử kho",
      cause: e,
    });
  }
}
