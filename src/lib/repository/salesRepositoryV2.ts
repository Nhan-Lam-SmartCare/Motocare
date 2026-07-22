import { supabase } from "../../supabaseClient";
import type { SaleItemV2 } from "../../types/v2";
import { RepoResult, success, failure } from "./types";

const SALE_ITEMS_TABLE = "sale_items";

export interface SaleItemsQuery {
  branchId?: string;
  partId?: string;
  sku?: string;
  fromDate?: string; // ISO date
  toDate?: string; // ISO date
  page?: number;
  pageSize?: number;
}

/**
 * Fetch normalized sale items with optional branch, part, and date filters
 */
export async function fetchSaleItems(
  query: SaleItemsQuery
): Promise<RepoResult<SaleItemV2[]>> {
  const {
    branchId,
    partId,
    sku,
    fromDate,
    toDate,
    page = 1,
    pageSize = 50,
  } = query || {};

  try {
    let builder = supabase
      .from(SALE_ITEMS_TABLE)
      .select(`
        *,
        sales!inner (
          date,
          branchid,
          sale_code
        )
      `)
      .order("created_at", { ascending: false });

    if (branchId) builder = builder.eq("sales.branchid", branchId);
    if (partId) builder = builder.eq("part_id", partId);
    if (sku) builder = builder.eq("sku", sku);
    if (fromDate) builder = builder.gte("sales.date", fromDate);
    if (toDate) builder = builder.lte("sales.date", toDate);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    builder = builder.range(from, to);

    const { data, error, count } = (await builder) as any;

    if (error) {
      return failure({
        code: "supabase",
        message: "Không thể tải danh sách sản phẩm bán lẻ chi tiết",
        cause: error,
      });
    }

    const items: SaleItemV2[] = (data || []).map((item: any) => ({
      id: item.id,
      sale_id: item.sale_id,
      part_id: item.part_id,
      part_name: item.part_name,
      sku: item.sku,
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
      message: "Lỗi kết nối khi tải chi tiết bán lẻ",
      cause: e,
    });
  }
}

/**
 * Retrieve a summary report of parts sold (quantity, revenue, and gross profit)
 */
export async function getPartsSalesReport(params: {
  branchId?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<RepoResult<Array<{
  part_name: string;
  sku: string;
  quantity_sold: number;
  total_revenue: number;
  total_cost: number;
  gross_profit: number;
}>>> {
  const { branchId, fromDate, toDate } = params || {};
  try {
    let builder = supabase
      .from(SALE_ITEMS_TABLE)
      .select(`
        part_name,
        sku,
        quantity,
        price,
        cost_price,
        sales!inner (
          date,
          branchid,
          refunded
        )
      `)
      .or("sales.refunded.is.null,sales.refunded.eq.false"); // Exclude refunded sales

    if (branchId) builder = builder.eq("sales.branchid", branchId);
    if (fromDate) builder = builder.gte("sales.date", fromDate);
    if (toDate) builder = builder.lte("sales.date", toDate);

    const { data, error } = (await builder) as any;

    if (error) {
      return failure({
        code: "supabase",
        message: "Không thể tính toán báo cáo bán lẻ phụ tùng",
        cause: error,
      });
    }

    // Aggregate results in memory
    const aggMap = new Map<string, {
      part_name: string;
      sku: string;
      quantity_sold: number;
      total_revenue: number;
      total_cost: number;
    }>();

    (data || []).forEach((item: any) => {
      const key = item.sku;
      const qty = Number(item.quantity || 0);
      const rev = qty * Number(item.price || 0);
      // Fallback cost to retail price if not recorded
      const costPrice = item.cost_price !== null ? Number(item.cost_price) : Number(item.price || 0);
      const cost = qty * costPrice;

      if (!aggMap.has(key)) {
        aggMap.set(key, {
          part_name: item.part_name,
          sku: item.sku,
          quantity_sold: qty,
          total_revenue: rev,
          total_cost: cost,
        });
      } else {
        const current = aggMap.get(key)!;
        current.quantity_sold += qty;
        current.total_revenue += rev;
        current.total_cost += cost;
      }
    });

    const report = Array.from(aggMap.values()).map(r => ({
      ...r,
      gross_profit: r.total_revenue - r.total_cost,
    })).sort((a, b) => b.quantity_sold - a.quantity_sold);

    return success(report);
  } catch (e: any) {
    return failure({
      code: "network",
      message: "Lỗi kết nối khi kết xuất báo cáo bán lẻ",
      cause: e,
    });
  }
}
