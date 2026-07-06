import { useMemo, useState } from "react";
import type { InventoryTransaction, WorkOrder } from "../../../types";

// =====================================================
// Best-Seller Restock Suggestions Hook
// Phân tích tốc độ bán để đề xuất bổ sung hàng kịp thời
// =====================================================

export type RestockUrgency = "critical" | "warning" | "normal";
export type RestockPeriod = 30 | 60 | 90;

export interface RestockSuggestion {
  partId: string;
  partName: string;
  sku: string;
  category: string;
  imageUrl?: string;
  currentStock: number;        // Tồn kho khả dụng hiện tại
  soldQty: number;             // SL đã bán trong kỳ
  avgDailySales: number;       // Bán TB/ngày
  daysUntilStockout: number;   // Số ngày còn bán được
  suggestedQty: number;        // SL đề xuất nhập (đủ bán cho chu kỳ tiếp theo)
  retailPrice: number;
  costPrice: number;
  supplierName: string;
  supplierId: string;
  urgency: RestockUrgency;     // Mức khẩn cấp
  lastImportDate: string;
  stockPercentage: number;     // % tồn kho còn lại so với mức cần (0-100)
}

interface UseBestSellerRestockParams {
  allPartsData: any[] | undefined;
  invTx: InventoryTransaction[];
  workOrders: WorkOrder[];
  suppliers: any[];
  currentBranchId: string;
}

/**
 * Trích xuất tên NCC từ notes inventory transaction
 */
function extractSupplierName(notes?: string | null): string {
  if (!notes || !notes.includes("NCC:")) return "";
  return notes.split("NCC:")[1]?.split("Phone:")[0]?.trim() || "";
}

export function useBestSellerRestock({
  allPartsData,
  invTx,
  workOrders,
  suppliers,
  currentBranchId,
}: UseBestSellerRestockParams) {
  const [period, setPeriod] = useState<RestockPeriod>(30);
  const [restockCycle, setRestockCycle] = useState(30); // Chu kỳ nhập hàng (ngày)

  const suggestions = useMemo<RestockSuggestion[]>(() => {
    if (!allPartsData || allPartsData.length === 0) return [];

    const branchKey = currentBranchId || "";
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - period);

    // ─── 1. Tính tổng SL đã bán trong kỳ ───
    const soldQtyMap = new Map<string, number>();

    // Từ inventory_transactions type="Xuất kho"
    invTx
      .filter(
        (tx: any) =>
          tx.type === "Xuất kho" && new Date(tx.date) >= cutoffDate
      )
      .forEach((tx: any) => {
        if (!tx.partId) return;
        soldQtyMap.set(
          tx.partId,
          (soldQtyMap.get(tx.partId) || 0) + Math.abs(tx.quantity || 0)
        );
      });

    // Từ phiếu sửa chữa (work orders)
    workOrders.forEach((wo: any) => {
      if (wo.status === "Đã hủy") return;
      const woDate = new Date(
        wo.creationDate || wo.creationdate || wo.date
      );
      if (woDate < cutoffDate) return;
      (wo.partsUsed || wo.partsused || []).forEach((part: any) => {
        const id = part.partId || part.partid;
        if (!id) return;
        soldQtyMap.set(id, (soldQtyMap.get(id) || 0) + (part.quantity || 0));
      });
    });

    // ─── 2. Map: partId -> last import tx (for supplier lookup) ───
    const lastImportMap = new Map<string, InventoryTransaction>();
    invTx
      .filter((tx: any) => tx.type === "Nhập kho")
      .sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )
      .forEach((tx: any) => {
        if (!lastImportMap.has(tx.partId))
          lastImportMap.set(tx.partId, tx);
      });

    // ─── 3. Lọc SP bán chạy (đã bán ≥ 1) & tính toán ───
    const results: RestockSuggestion[] = [];

    for (const part of allPartsData) {
      const soldQty = soldQtyMap.get(part.id) || 0;
      if (soldQty <= 0) continue; // Bỏ qua SP chưa bán

      const stock = part.stock?.[branchKey] || 0;
      const reserved = part.reservedstock?.[branchKey] || 0;
      const available = Math.max(0, stock - reserved);
      const costPrice = part.costPrice?.[branchKey] || 0;
      const retailPrice = part.retailPrice?.[branchKey] || 0;

      // Tốc độ bán TB/ngày
      const avgDailySales = soldQty / period;

      // Số ngày còn bán được
      const daysUntilStockout =
        avgDailySales > 0
          ? Math.round(available / avgDailySales)
          : available > 0
          ? 999
          : 0;

      // SL đề xuất nhập = (tốc độ bán/ngày × chu kỳ nhập) − tồn kho hiện tại
      const neededForCycle = Math.ceil(avgDailySales * restockCycle);
      const suggestedQty = Math.max(0, neededForCycle - available);

      // Bỏ qua nếu không cần nhập (tồn kho đủ cho chu kỳ tiếp)
      if (suggestedQty <= 0 && daysUntilStockout > restockCycle) continue;

      // Mức khẩn cấp
      let urgency: RestockUrgency = "normal";
      if (daysUntilStockout <= 3 || available === 0) {
        urgency = "critical";
      } else if (daysUntilStockout <= 7) {
        urgency = "warning";
      }

      // % tồn kho còn lại so với nhu cầu chu kỳ
      const stockPercentage =
        neededForCycle > 0
          ? Math.min(100, Math.round((available / neededForCycle) * 100))
          : 100;

      // Supplier lookup
      const lastTx = lastImportMap.get(part.id);
      let supplierName = "Chưa xác định";
      let supplierId = "";

      if (part.preferred_supplier_id) {
        const found = suppliers.find((s: any) => s.id === part.preferred_supplier_id);
        if (found) {
          supplierName = found.name;
          supplierId = found.id;
        }
      }

      if (!supplierId && lastTx) {
        if (lastTx.supplierId) {
          const found = suppliers.find(
            (s: any) => s.id === lastTx.supplierId
          );
          supplierName =
            found?.name ||
            extractSupplierName(lastTx.notes) ||
            "Chưa xác định";
          supplierId = lastTx.supplierId;
        } else {
          supplierName =
            extractSupplierName(lastTx.notes) || "Chưa xác định";
        }
      }

      results.push({
        partId: part.id,
        partName: part.name,
        sku: part.sku || "",
        category: part.category || "",
        imageUrl: part.imageUrl,
        currentStock: available,
        soldQty,
        avgDailySales: Math.round(avgDailySales * 100) / 100,
        daysUntilStockout,
        suggestedQty: Math.max(suggestedQty, 1), // Ít nhất 1
        retailPrice,
        costPrice,
        supplierName,
        supplierId,
        urgency,
        lastImportDate: lastTx?.date || "",
        stockPercentage,
      });
    }

    // Sắp xếp: critical trước → warning → normal, rồi theo SL bán giảm dần
    const urgencyOrder: Record<RestockUrgency, number> = {
      critical: 0,
      warning: 1,
      normal: 2,
    };
    results.sort((a, b) => {
      if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      }
      return b.soldQty - a.soldQty;
    });

    return results;
  }, [
    allPartsData,
    invTx,
    workOrders,
    suppliers,
    currentBranchId,
    period,
    restockCycle,
  ]);

  // Thống kê tổng quan
  const summary = useMemo(() => {
    const critical = suggestions.filter((s) => s.urgency === "critical").length;
    const warning = suggestions.filter((s) => s.urgency === "warning").length;
    const normal = suggestions.filter((s) => s.urgency === "normal").length;
    const totalCostToRestock = suggestions.reduce(
      (sum, s) => sum + s.suggestedQty * s.costPrice,
      0
    );
    return { critical, warning, normal, total: suggestions.length, totalCostToRestock };
  }, [suggestions]);

  return {
    suggestions,
    summary,
    period,
    setPeriod,
    restockCycle,
    setRestockCycle,
  };
}
