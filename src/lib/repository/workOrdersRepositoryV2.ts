import { supabase } from "../../supabaseClient";
import type { WorkOrderItemV2 } from "../../types/v2";
import { RepoResult, success, failure } from "./types";

const WORK_ORDER_ITEMS_TABLE = "work_order_items";

export interface WorkOrderItemsQuery {
  branchId?: string;
  partId?: string;
  sku?: string;
  licensePlate?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Fetch normalized work order items (materials used in mechanical repair services)
 */
export async function fetchWorkOrderItems(
  query: WorkOrderItemsQuery
): Promise<RepoResult<WorkOrderItemV2[]>> {
  const {
    branchId,
    partId,
    sku,
    licensePlate,
    fromDate,
    toDate,
    page = 1,
    pageSize = 50,
  } = query || {};

  try {
    let builder = supabase
      .from(WORK_ORDER_ITEMS_TABLE)
      .select(`
        *,
        work_orders!inner (
          creationdate,
          branchid,
          licenseplate,
          status
        )
      `)
      .order("created_at", { ascending: false });

    if (branchId) builder = builder.eq("work_orders.branchid", branchId);
    if (partId) builder = builder.eq("part_id", partId);
    if (sku) builder = builder.eq("sku", sku);
    if (licensePlate) builder = builder.ilike("work_orders.licenseplate", `%${licensePlate}%`);
    if (fromDate) builder = builder.gte("work_orders.creationdate", fromDate);
    if (toDate) builder = builder.lte("work_orders.creationdate", toDate);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    builder = builder.range(from, to);

    const { data, error, count } = (await builder) as any;

    if (error) {
      return failure({
        code: "supabase",
        message: "Không thể tải danh sách phụ tùng sửa chữa chi tiết",
        cause: error,
      });
    }

    const items: WorkOrderItemV2[] = (data || []).map((item: any) => ({
      id: item.id,
      work_order_id: item.work_order_id,
      part_id: item.part_id,
      part_name: item.part_name,
      sku: item.sku,
      category: item.category,
      quantity: Number(item.quantity),
      price: Number(item.price),
      cost_price: item.cost_price !== null ? Number(item.cost_price) : undefined,
      created_at: item.created_at,
    }));

    const total = count || 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return success(items, {
      page,
      pageSize,
      total,
      totalPages,
      hasMore: page < totalPages,
    });
  } catch (e: any) {
    return failure({
      code: "network",
      message: "Lỗi kết nối khi tải chi tiết phụ tùng sửa chữa",
      cause: e,
    });
  }
}

/**
 * Retrieve summary report of parts consumed during workshop repair services (quantity, revenue, gross profit)
 */
export async function getWorkshopPartsReport(params: {
  branchId?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<RepoResult<Array<{
  part_name: string;
  sku: string;
  quantity_used: number;
  total_revenue: number;
  total_cost: number;
  gross_profit: number;
}>>> {
  const { branchId, fromDate, toDate } = params || {};
  try {
    let builder = supabase
      .from(WORK_ORDER_ITEMS_TABLE)
      .select(`
        part_name,
        sku,
        quantity,
        price,
        cost_price,
        work_orders!inner (
          creationdate,
          branchid,
          status
        )
      `)
      .neq("work_orders.status", "Đã hủy"); // Exclude cancelled work orders

    if (branchId) builder = builder.eq("work_orders.branchid", branchId);
    if (fromDate) builder = builder.gte("work_orders.creationdate", fromDate);
    if (toDate) builder = builder.lte("work_orders.creationdate", toDate);

    const { data, error } = (await builder) as any;

    if (error) {
      return failure({
        code: "supabase",
        message: "Không thể tính toán báo cáo phụ tùng xưởng sửa chữa",
        cause: error,
      });
    }

    const aggMap = new Map<string, {
      part_name: string;
      sku: string;
      quantity_used: number;
      total_revenue: number;
      total_cost: number;
    }>();

    (data || []).forEach((item: any) => {
      const key = item.sku;
      const qty = Number(item.quantity || 0);
      const rev = qty * Number(item.price || 0);
      const costPrice = item.cost_price !== null ? Number(item.cost_price) : Number(item.price || 0);
      const cost = qty * costPrice;

      if (!aggMap.has(key)) {
        aggMap.set(key, {
          part_name: item.part_name,
          sku: item.sku,
          quantity_used: qty,
          total_revenue: rev,
          total_cost: cost,
        });
      } else {
        const current = aggMap.get(key)!;
        current.quantity_used += qty;
        current.total_revenue += rev;
        current.total_cost += cost;
      }
    });

    const report = Array.from(aggMap.values()).map(r => ({
      ...r,
      gross_profit: r.total_revenue - r.total_cost,
    })).sort((a, b) => b.quantity_used - a.quantity_used);

    return success(report);
  } catch (e: any) {
    return failure({
      code: "network",
      message: "Lỗi kết nối khi kết xuất báo cáo xưởng sửa chữa",
      cause: e,
    });
  }
}
