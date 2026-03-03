import { supabase } from "../../supabaseClient";
import type { WorkOrder, StockWarning } from "../../types";
import { RepoResult, success, failure } from "./types";
import { safeAudit } from "./auditLogsRepository";

const WORK_ORDERS_TABLE = "work_orders";

// Helper: Convert snake_case DB response to camelCase TypeScript
function normalizeWorkOrder(row: any): WorkOrder {
  return {
    id: row.id,
    creationDate: row.creationdate || row.creationDate,
    customerName: row.customername || row.customerName,
    customerPhone: row.customerphone || row.customerPhone,
    vehicleId: row.vehicleid || row.vehicleId,
    vehicleModel: row.vehiclemodel || row.vehicleModel,
    licensePlate: row.licenseplate || row.licensePlate,
    currentKm: row.currentkm ?? row.currentKm ?? undefined,
    issueDescription: row.issuedescription || row.issueDescription,
    technicianName: row.technicianname || row.technicianName,
    status: row.status,
    laborCost: row.laborcost ?? row.laborCost ?? 0,
    discount: row.discount ?? 0,
    // BUG 14 fix: normalize each part inside partsUsed so consumers always get camelCase partId
    partsUsed: (row.partsused || row.partsUsed || []).map((p: any) => ({
      ...p,
      partId: p.partId || p.partid || "",
      partName: p.partName || p.partname || "",
      sku: p.sku || "",
      category: p.category || "",
      quantity: typeof p.quantity === "number" ? p.quantity : 0,
      price: p.price ?? p.sellingprice ?? p.sellingPrice ?? 0,
      costPrice: p.costPrice ?? p.costprice ?? undefined,
    })),
    additionalServices: row.additionalservices || row.additionalServices,
    notes: row.notes,
    total: row.total ?? 0,
    branchId: row.branchid || row.branchId,
    depositAmount: row.depositamount ?? row.depositAmount ?? 0,
    depositDate: row.depositdate || row.depositDate,
    depositTransactionId: row.deposittransactionid || row.depositTransactionId,
    paymentStatus: row.paymentstatus || row.paymentStatus,
    paymentMethod: row.paymentmethod || row.paymentMethod,
    additionalPayment: row.additionalpayment ?? row.additionalPayment ?? 0,
    totalPaid: row.totalpaid ?? row.totalPaid ?? 0,
    remainingAmount: row.remainingamount ?? row.remainingAmount ?? 0,
    paymentDate: row.paymentdate || row.paymentDate,
    cashTransactionId: row.cashtransactionid || row.cashTransactionId,
    refunded: row.refunded,
    refunded_at: row.refunded_at || row.refundedAt,
    refund_transaction_id: row.refund_transaction_id || row.refundTransactionId,
    refund_reason: row.refund_reason || row.refundReason,
  };
}

export async function fetchWorkOrders(): Promise<RepoResult<WorkOrder[]>> {
  try {
    const { data, error } = await supabase
      .from(WORK_ORDERS_TABLE)
      .select("*")
      .order("creationdate", { ascending: false }); // Use lowercase to match DB column

    if (error)
      return failure({
        code: "supabase",
        message: "Không thể tải danh sách phiếu sửa chữa",
        cause: error,
      });
    return success((data || []).map(normalizeWorkOrder));
  } catch (e: any) {
    return failure({
      code: "network",
      message: "Lỗi kết nối tới máy chủ",
      cause: e,
    });
  }
}

// 🔹 NEW: Fetch single work order by ID - used when opening modal to get fresh data
export async function fetchWorkOrderById(id: string): Promise<RepoResult<WorkOrder>> {
  try {
    const { data, error } = await supabase
      .from(WORK_ORDERS_TABLE)
      .select("*")
      .eq("id", id)
      .single();

    if (error)
      return failure({
        code: error.code === "PGRST116" ? "not_found" : "supabase",
        message: error.code === "PGRST116" ? "Không tìm thấy phiếu sửa chữa" : "Không thể tải phiếu sửa chữa",
        cause: error,
      });
    return success(normalizeWorkOrder(data));
  } catch (e: any) {
    return failure({
      code: "network",
      message: "Lỗi kết nối tới máy chủ",
      cause: e,
    });
  }
}

// Optimized fetch with filtering and pagination
export async function fetchWorkOrdersFiltered(options?: {
  limit?: number;
  daysBack?: number;
  status?: string;
  branchId?: string;
}): Promise<RepoResult<WorkOrder[]>> {
  try {
    const {
      limit = 100, // Default load 100 recent orders
      daysBack = 7, // Default 7 days back
      status,
      branchId,
    } = options || {};

    let query = supabase
      .from(WORK_ORDERS_TABLE)
      .select("*")
      .order("creationdate", { ascending: false })
      .limit(limit);

    // Filter by date (last N days) - if daysBack is 0, load all
    if (daysBack > 0) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);
      query = query.gte("creationdate", startDate.toISOString());
    }

    // Filter by status
    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    // Filter by branch
    if (branchId && branchId !== "all") {
      query = query.eq("branchid", branchId);
    }

    const { data, error } = await query;

    if (error)
      return failure({
        code: "supabase",
        message: "Không thể tải danh sách phiếu sửa chữa",
        cause: error,
      });
    return success((data || []).map(normalizeWorkOrder));
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
      stockWarnings?: StockWarning[];
      inventoryDeducted?: boolean;
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
      p_vehicle_id: input.vehicleId || null, // 🔹 FIX: Thêm vehicleId
      p_current_km: input.currentKm || null, // 🔹 FIX: Thêm currentKm
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
      p_user_id: null, // For audit log only
    } as any;

    const { data, error } = await supabase.rpc(
      "work_order_create_atomic",
      payload
    );

    // 🔹 DETAILED ERROR LOGGING
    if (error) {
      console.error("[createWorkOrderAtomic] RPC Error:", {
        code: error.code,
        message: error.message,
        details: error.details,
      });
    }

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
          } catch (_e) {
            void _e;
          }
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

    // 🔹 FIX: RPC returns { success, orderId, depositTransactionId, paymentTransactionId }
    // Not { workOrder: {...} } format
    const workOrderRow = (data as any).workOrder as any;
    const orderId = (data as any).orderId as string | undefined;
    const depositTransactionId = (data as any).depositTransactionId as
      | string
      | undefined;
    const paymentTransactionId = (data as any).paymentTransactionId as
      | string
      | undefined;
    const inventoryTxCount = (data as any).inventoryTxCount as
      | number
      | undefined;
    const stockWarnings = (data as any).stockWarnings as
      | StockWarning[]
      | undefined;
    const inventoryDeducted = (data as any).inventoryDeducted as
      | boolean
      | undefined;

    // Accept either workOrder object OR orderId from RPC
    if (!workOrderRow && !orderId) {
      return failure({ code: "unknown", message: "Kết quả RPC không hợp lệ" });
    }

    let normalizedWorkOrder: WorkOrder | null = null;
    if (workOrderRow) {
      normalizedWorkOrder = normalizeWorkOrder(workOrderRow);
    } else if (orderId) {
      const { data: fetchedRow, error: fetchError } = await supabase
        .from(WORK_ORDERS_TABLE)
        .select("*")
        .eq("id", orderId)
        .single();

      if (fetchError) {
        console.error("[createWorkOrderAtomic] Cannot fetch order by ID", {
          orderId,
          fetchError,
        });
      } else if (fetchedRow) {
        normalizedWorkOrder = normalizeWorkOrder(fetchedRow);
      }
    }

    if (!normalizedWorkOrder) {
      return failure({
        code: "supabase",
        message: "Không thể tải dữ liệu phiếu sửa chữa vừa tạo",
      });
    }

    // Audit (best-effort)
    let userId: string | null = null;
    try {
      const { data: userData } = await supabase.auth.getUser();
      userId = userData?.user?.id || null;
    } catch (_e) {
      void _e;
    }

    await safeAudit(userId, {
      action: "work_order.create",
      tableName: WORK_ORDERS_TABLE,
      recordId: normalizedWorkOrder.id,
      oldData: null,
      newData: normalizedWorkOrder,
    });

    return success({
      ...normalizedWorkOrder,
      depositTransactionId,
      paymentTransactionId,
      inventoryTxCount,
      stockWarnings,
      inventoryDeducted,
    });
  } catch (e: any) {
    return failure({
      code: "network",
      message: "Lỗi kết nối khi tạo phiếu sửa chữa (atomic)",
      cause: e,
    });
  }
}

// Atomic update variant: adjusts inventory and cash when parts are added/removed
export async function updateWorkOrderAtomic(input: Partial<WorkOrder>): Promise<
  RepoResult<
    WorkOrder & {
      depositTransactionId?: string;
      paymentTransactionId?: string;
      stockWarnings?: StockWarning[];
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
      p_additional_services: input.additionalServices && Array.isArray(input.additionalServices) && input.additionalServices.length > 0 ? input.additionalServices : null,
      p_total: input.total || 0,
      p_payment_status: input.paymentStatus || "unpaid",
      p_payment_method: input.paymentMethod || null,
      p_deposit_amount: input.depositAmount || 0,
      p_additional_payment: input.additionalPayment || 0,
      p_user_id: null, // For audit log only
      p_vehicle_id: input.vehicleId || null, // 🔹 FIX: Thêm vehicleId
      p_current_km: input.currentKm || null, // 🔹 FIX: Thêm currentKm
    } as any;

    const { data, error } = await supabase.rpc(
      "work_order_update_atomic",
      payload
    );

    if (error || !data) {
      // Map error details similar to create
      const rawDetails = error?.details || error?.message || "";
      const upper = rawDetails.toUpperCase();

      if (upper.includes("INSUFFICIENT_STOCK")) {
        let items: any[] = [];
        const colon = rawDetails.indexOf(":");
        if (colon !== -1) {
          const jsonStr = rawDetails.slice(colon + 1).trim();
          try {
            items = JSON.parse(jsonStr);
          } catch (_e) {
            void _e;
          }
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
      if (upper.includes("ORDER_NOT_FOUND"))
        return failure({
          code: "validation",
          message: "Không tìm thấy phiếu sửa chữa",
          cause: error,
        });
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
      if (upper.includes("UNAUTHORIZED"))
        return failure({
          code: "supabase",
          message: "Bạn không có quyền cập nhật phiếu sửa chữa",
          cause: error,
        });
      if (upper.includes("BRANCH_MISMATCH"))
        return failure({
          code: "validation",
          message: "Chi nhánh không khớp với quyền hiện tại",
          cause: error,
        });
      // 🔹 Log chi tiết lỗi để debug
      console.error("[updateWorkOrderAtomic] Full error:", JSON.stringify(error, null, 2));
      return failure({
        code: "supabase",
        message: `Cập nhật phiếu sửa chữa (atomic) thất bại: ${error?.message || error?.details || 'Lỗi không xác định'}`,
        cause: error,
      });
    }

    const workOrderRow = (data as any).workOrder as any | undefined;
    const depositTransactionId = (data as any).depositTransactionId as
      | string
      | undefined;
    const paymentTransactionId = (data as any).paymentTransactionId as
      | string
      | undefined;
    const stockWarnings = (data as any).stockWarnings as
      | StockWarning[]
      | undefined;

    if (!workOrderRow) {
      return failure({ code: "unknown", message: "Kết quả RPC không hợp lệ" });
    }

    // 🔹 FIX: Normalize data (RPC returns snake_case from row_to_json)
    const normalized = normalizeWorkOrder(workOrderRow);

    // Audit (best-effort)
    let userId: string | null = null;
    try {
      const { data: userData } = await supabase.auth.getUser();
      userId = userData?.user?.id || null;
    } catch (_e) {
      void _e;
    }
    await safeAudit(userId, {
      action: "work_order.update",
      tableName: WORK_ORDERS_TABLE,
      recordId: normalized.id,
      oldData: null,
      newData: normalized,
    });

    return success({
      ...normalized,
      depositTransactionId,
      paymentTransactionId,
      stockWarnings,
    });
  } catch (e: any) {
    return failure({
      code: "network",
      message: "Lỗi kết nối khi cập nhật phiếu sửa chữa (atomic)",
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
    } catch (_e) {
      void _e;
    }
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
    } catch (_e) {
      void _e;
    }
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

// Refund work order atomically: restore inventory, create refund transaction
export async function refundWorkOrder(
  orderId: string,
  refundReason: string
): Promise<
  RepoResult<
    WorkOrder & {
      refund_transaction_id?: string;
      refundAmount?: number;
    }
  >
> {
  try {
    let userId: string | null = null;
    try {
      const { data: userData } = await supabase.auth.getUser();
      userId = userData?.user?.id || null;
    } catch (_e) {
      void _e;
    }

    const { data, error } = await supabase.rpc("work_order_refund_atomic", {
      p_order_id: orderId,
      p_refund_reason: refundReason,
      p_user_id: userId || "unknown",
    });

    if (error || !data) {
      console.error("[refundWorkOrder] RPC error:", error);
      console.error("[refundWorkOrder] Error code:", error?.code);
      console.error("[refundWorkOrder] Error message:", error?.message);
      console.error("[refundWorkOrder] Error details:", error?.details);

      const rawDetails = error?.details || error?.message || "";
      const upper = rawDetails.toUpperCase();

      if (upper.includes("ORDER_NOT_FOUND"))
        return failure({
          code: "validation",
          message: "Không tìm thấy phiếu sửa chữa",
          cause: error,
        });
      if (upper.includes("ALREADY_REFUNDED"))
        return failure({
          code: "validation",
          message: "Phiếu này đã được hoàn tiền rồi",
          cause: error,
        });
      if (upper.includes("UNAUTHORIZED"))
        return failure({
          code: "supabase",
          message: "Bạn không có quyền hoàn tiền",
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
        message: `Hoàn tiền thất bại: ${error?.message || "Lỗi không xác định"}`,
        cause: error,
      });
    }

    const workOrderRow = (data as any).workOrder as WorkOrder | undefined;
    const refund_transaction_id = (data as any).refund_transaction_id as
      | string
      | undefined;
    const refundAmount = (data as any).refundAmount as number | undefined;

    if (!workOrderRow) {
      return failure({ code: "unknown", message: "Kết quả RPC không hợp lệ" });
    }

    await safeAudit(userId, {
      action: "work_order.refund",
      tableName: WORK_ORDERS_TABLE,
      recordId: orderId,
      oldData: null,
      newData: workOrderRow,
    });

    return success({
      ...(workOrderRow as any),
      refund_transaction_id,
      refundAmount,
    });
  } catch (e: any) {
    return failure({
      code: "network",
      message: "Lỗi kết nối khi hoàn tiền",
      cause: e,
    });
  }
}

/**
 * Thanh toán phiếu sửa chữa và trừ kho khi đã thanh toán đủ
 * @param orderId - ID phiếu sửa chữa
 * @param paymentMethod - Phương thức thanh toán (cash, transfer, card)
 * @param paymentAmount - Số tiền thanh toán
 */
export async function completeWorkOrderPayment(
  orderId: string,
  paymentMethod: string,
  paymentAmount: number
): Promise<
  RepoResult<
    WorkOrder & {
      paymentTransactionId?: string;
      newPaymentStatus?: string;
      inventoryDeducted?: boolean;
    }
  >
> {
  try {
    let userId: string | null = null;
    try {
      const { data: userData } = await supabase.auth.getUser();
      userId = userData?.user?.id || null;
    } catch (_e) {
      void _e;
    }

    const { data, error } = await supabase.rpc("work_order_complete_payment", {
      p_order_id: orderId,
      p_payment_method: paymentMethod,
      p_payment_amount: paymentAmount,
      p_user_id: userId || "unknown",
    });

    if (error || !data) {
      console.error("[completeWorkOrderPayment] RPC error:", error);

      const rawDetails = error?.details || error?.message || "";
      const upper = rawDetails.toUpperCase();

      if (upper.includes("INSUFFICIENT_STOCK")) {
        let items: any[] = [];
        const colon = rawDetails.indexOf(":");
        if (colon !== -1) {
          const jsonStr = rawDetails.slice(colon + 1).trim();
          try {
            items = JSON.parse(jsonStr);
          } catch (_e) {
            void _e;
          }
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
            : "Tồn kho không đủ để hoàn thành thanh toán",
          cause: error,
        });
      }
      if (upper.includes("ORDER_NOT_FOUND"))
        return failure({
          code: "validation",
          message: "Không tìm thấy phiếu sửa chữa",
          cause: error,
        });
      if (upper.includes("ORDER_REFUNDED"))
        return failure({
          code: "validation",
          message: "Phiếu này đã được hoàn tiền",
          cause: error,
        });
      if (upper.includes("UNAUTHORIZED"))
        return failure({
          code: "supabase",
          message: "Bạn không có quyền thanh toán",
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
        message: `Thanh toán thất bại: ${error?.message || "Lỗi không xác định"}`,
        cause: error,
      });
    }

    const workOrderRow = (data as any).workOrder as WorkOrder | undefined;
    const paymentTransactionId = (data as any).paymentTransactionId as
      | string
      | undefined;
    const newPaymentStatus = (data as any).newPaymentStatus as
      | string
      | undefined;
    const inventoryDeducted = (data as any).inventoryDeducted as
      | boolean
      | undefined;

    if (!workOrderRow) {
      console.error("[completeWorkOrderPayment] Invalid RPC result:", {
        data,
        orderId,
        paymentMethod,
        paymentAmount,
      });
      return failure({
        code: "unknown",
        message: `Kết quả RPC không hợp lệ. Vui lòng kiểm tra lại database function 'work_order_complete_payment'. Data received: ${JSON.stringify(
          data
        )}`,
      });
    }

    await safeAudit(userId, {
      action: "work_order.payment",
      tableName: WORK_ORDERS_TABLE,
      recordId: orderId,
      oldData: null,
      newData: workOrderRow,
    });

    return success({
      ...normalizeWorkOrder(workOrderRow),
      paymentTransactionId,
      newPaymentStatus,
      inventoryDeducted,
    });
  } catch (e: any) {
    return failure({
      code: "network",
      message: "Lỗi kết nối khi thanh toán",
      cause: e,
    });
  }
}
