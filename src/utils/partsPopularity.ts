import type { Sale, WorkOrder } from "../types";

/**
 * Calculates a map of partId -> totalQuantitySold
 * based on sales history and work orders.
 */
export function getPartsPopularityMap(sales: Sale[], workOrders: WorkOrder[]): Map<string, number> {
  const map = new Map<string, number>();

  // 1. Process Sales items
  sales.forEach((sale) => {
    if (sale.refunded) return;
    sale.items?.forEach((item: any) => {
      const pid = item.partId || item.partid;
      if (pid) {
        if (pid.startsWith("quick_service_manual_")) return;
        map.set(pid, (map.get(pid) || 0) + (item.quantity || 0));
      }
    });
  });

  // 2. Process Work Orders parts
  workOrders.forEach((wo) => {
    if (wo.status === "Đã hủy" || wo.refunded) return;
    wo.partsUsed?.forEach((part: any) => {
      const pid = part.partId || part.partid;
      if (pid) {
        map.set(pid, (map.get(pid) || 0) + (part.quantity || 0));
      }
    });
  });

  return map;
}
