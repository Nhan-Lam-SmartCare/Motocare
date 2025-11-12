import { supabase } from "../../supabaseClient";
import type { WorkOrder } from "../../types";
import { RepoResult, success, failure } from "./types";
import { safeAudit } from "./auditLogsRepository";

const WORK_ORDERS_TABLE = "work_orders";

export async function fetchWorkOrders(): Promise<RepoResult<WorkOrder[]>> {
  try {
    const { data, error } = await supabase
      .from(WORK_ORDERS_TABLE)
      .select("*")
      .order("creationDate", { ascending: false });
    if (error)
      return failure({
        code: "supabase",
        message: "Không thể tải danh sách phiếu sửa chữa",
        cause: error,
      });
    return success((data || []) as WorkOrder[]);
  } catch (e: any) {
    return failure({
      code: "network",
      message: "Lỗi kết nối tới máy chủ",
      cause: e,
    });
  }
}

// Atomic variant: delegates to DB RPC to ensure stock decrement, inventory tx, cash tx, and work order insert happen in a single transaction.
export async function createWorkOrderAtomic(input: Partial<WorkOrder>): Promise<
  RepoResult<
    WorkOrder & {
      depositTransactionId?: string;
      paymentTransactionId?: string;
      inventoryTxCount?: number;
    }
  >
> {
  try {
    if (!input.id)
      return failure({
        code: "validation",
        message: "Thiếu ID phiếu sửa chữa",
      });

    const payload = {
      p_order_id: input.id,
      p_customer_name: input.customerName || "",
      p_customer_phone: input.customerPhone || "",
      p_vehicle_model: input.vehicleModel || "",
      p_license_plate: input.licensePlate || "",
      p_issue_description: input.issueDescription || "",
      p_technician_name: input.technicianName || "",
      p_status: input.status || "Tiếp nhận",
      p_labor_cost: input.laborCost || 0,
      p_discount: input.discount || 0,
      p_parts_used: input.partsUsed || [],
      p_additional_services: input.additionalServices || null,
      p_total: input.total || 0,
      p_branch_id: input.branchId || "CN1",
      p_payment_status: input.paymentStatus || "unpaid",
      p_payment_method: input.paymentMethod || null,
      p_deposit_amount: input.depositAmount || 0,
      p_additional_payment: input.additionalPayment || 0,
      p_user_id: (input as any).userId || "unknown",
    } as any;

    const { data, error } = await supabase.rpc(
      "work_order_create_atomic",
      payload
    );

    if (error || !data) {
      // Map PostgREST function error details to usable validation messages
      const rawDetails = error?.details || error?.message || "";
      const upper = rawDetails.toUpperCase();

      if (upper.includes("INSUFFICIENT_STOCK")) {
        // Try to parse JSON list after prefix 'INSUFFICIENT_STOCK:' from rawDetails
        let items: any[] = [];
        const colon = rawDetails.indexOf(":");
        if (colon !== -1) {
          const jsonStr = rawDetails.slice(colon + 1).trim();
          try {
            items = JSON.parse(jsonStr);
          } catch {}
        }
        const list = Array.isArray(items)
          ? items
              .map(
                (d: any) =>
                  `${d.partName || d.partId || "?"} (còn ${d.available}, cần ${
                    d.requested
                  })`
              )
              .join(", ")
          : "";
        return failure({
          code: "validation",
          message: list
            ? `Thiếu tồn kho: ${list}`
            : "Tồn kho không đủ cho một hoặc nhiều phụ tùng",
          cause: error,
        });
      }
      if (upper.includes("PART_NOT_FOUND"))
        return failure({
          code: "validation",
          message: "Không tìm thấy phụ tùng trong kho",
          cause: error,
        });
      if (upper.includes("INVALID_PART"))
        return failure({
          code: "validation",
          message: "Dữ liệu phụ tùng không hợp lệ",
          cause: error,
        });
      if (upper.includes("INVALID_STATUS"))
        return failure({
          code: "validation",
          message: "Trạng thái không hợp lệ",
          cause: error,
        });
      if (upper.includes("INVALID_PAYMENT_STATUS"))
        return failure({
          code: "validation",
          message: "Trạng thái thanh toán không hợp lệ",
          cause: error,
        });
      if (upper.includes("UNAUTHORIZED"))
        return failure({
          code: "supabase",
          message: "Bạn không có quyền tạo phiếu sửa chữa",
          cause: error,
        });
      if (upper.includes("BRANCH_MISMATCH"))
        return failure({
          code: "validation",
          message: "Chi nhánh không khớp với quyền hiện tại",
          cause: error,
        });
      return failure({
        code: "supabase",
        message: "Tạo phiếu sửa chữa (atomic) thất bại",
        cause: error,
      });
    }

    const workOrderRow = (data as any).workOrder as WorkOrder | undefined;
    const depositTransactionId = (data as any).depositTransactionId as
      | string
      | undefined;
    const paymentTransactionId = (data as any).paymentTransactionId as
      | string
      | undefined;
    const inventoryTxCount = (data as any).inventoryTxCount as
      | number
      | undefined;

    if (!workOrderRow) {
      return failure({ code: "unknown", message: "Kết quả RPC không hợp lệ" });
    }

    // Audit (best-effort)
    let userId: string | null = null;
    try {
      const { data: userData } = await supabase.auth.getUser();
      userId = userData?.user?.id || null;
    } catch {}
    await safeAudit(userId, {
      action: "work_order.create",
      tableName: WORK_ORDERS_TABLE,
      recordId: (workOrderRow as any).id,
      oldData: null,
      newData: workOrderRow,
    });

    return success({
      ...(workOrderRow as any),
      depositTransactionId,
      paymentTransactionId,
      inventoryTxCount,
    });
  } catch (e: any) {
    return failure({
      code: "network",
      message: "Lỗi kết nối khi tạo phiếu sửa chữa (atomic)",
      cause: e,
    });
  }
}

export async function updateWorkOrder(
  id: string,
  updates: Partial<WorkOrder>
): Promise<RepoResult<WorkOrder>> {
  try {
    const { data, error } = await supabase
      .from(WORK_ORDERS_TABLE)
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error)
      return failure({
        code: "supabase",
        message: "Không thể cập nhật phiếu sửa chữa",
        cause: error,
      });

    // Audit
    let userId: string | null = null;
    try {
      const { data: userData } = await supabase.auth.getUser();
      userId = userData?.user?.id || null;
    } catch {}
    await safeAudit(userId, {
      action: "work_order.update",
      tableName: WORK_ORDERS_TABLE,
      recordId: id,
      oldData: null, // Would need to fetch before update
      newData: data,
    });

    return success(data as WorkOrder);
  } catch (e: any) {
    return failure({
      code: "network",
      message: "Lỗi kết nối khi cập nhật phiếu sửa chữa",
      cause: e,
    });
  }
}

export async function deleteWorkOrder(id: string): Promise<RepoResult<void>> {
  try {
    const { error } = await supabase
      .from(WORK_ORDERS_TABLE)
      .delete()
      .eq("id", id);

    if (error)
      return failure({
        code: "supabase",
        message: "Không thể xóa phiếu sửa chữa",
        cause: error,
      });

    // Audit
    let userId: string | null = null;
    try {
      const { data: userData } = await supabase.auth.getUser();
      userId = userData?.user?.id || null;
    } catch {}
    await safeAudit(userId, {
      action: "work_order.delete",
      tableName: WORK_ORDERS_TABLE,
      recordId: id,
      oldData: null,
      newData: null,
    });

    return success(undefined);
  } catch (e: any) {
    return failure({
      code: "network",
      message: "Lỗi kết nối khi xóa phiếu sửa chữa",
      cause: e,
    });
  }
}
