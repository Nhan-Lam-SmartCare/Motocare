import type { WorkOrder } from "../../../types";

export type MobileDateFilter = "today" | "week" | "month" | "all";

interface MobileServiceKpis {
  tiepNhan: number;
  dangSua: number;
  daHoanThanh: number;
  traMay: number;
  doanhThu: number;
  loiNhuan: number;
}

const ACTIVE_WORK_ORDER_STATUSES = new Set(["Tiếp nhận", "Đang sửa"]);

export function filterMobileWorkOrdersByDate(
  workOrders: WorkOrder[],
  dateFilter: MobileDateFilter,
  now = new Date()
): WorkOrder[] {
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  return workOrders.filter((workOrder) => {
    if (ACTIVE_WORK_ORDER_STATUSES.has(workOrder.status)) {
      return true;
    }

    if (!workOrder.creationDate) return false;

    const orderDate = new Date(workOrder.creationDate);

    switch (dateFilter) {
      case "today":
        return orderDate >= startOfToday;
      case "week": {
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);
        return orderDate >= sevenDaysAgo;
      }
      case "month": {
        const startOfMonth = new Date(
          now.getFullYear(),
          now.getMonth(),
          1
        );
        return orderDate >= startOfMonth;
      }
      case "all":
      default:
        return true;
    }
  });
}

export function calculateMobileServiceKpis(
  workOrders: WorkOrder[]
): MobileServiceKpis {
  let tiepNhan = 0;
  let dangSua = 0;
  let daHoanThanh = 0;
  let traMay = 0;
  let doanhThu = 0;
  let loiNhuan = 0;

  workOrders.forEach((workOrder) => {
    switch (workOrder.status) {
      case "Tiếp nhận":
        tiepNhan++;
        break;
      case "Đang sửa":
        dangSua++;
        break;
      case "Đã sửa xong":
        daHoanThanh++;
        break;
      case "Trả máy":
        traMay++;
        break;
    }

    if (
      workOrder.paymentStatus !== "paid" &&
      workOrder.paymentStatus !== "partial"
    ) {
      return;
    }

    const revenueCollected =
      workOrder.paymentStatus === "paid"
        ? workOrder.total || 0
        : workOrder.totalPaid || 0;

    doanhThu += revenueCollected;

    const partsCost =
      workOrder.partsUsed?.reduce(
        (sum, part) => sum + (part.costPrice || 0) * (part.quantity || 1),
        0
      ) || 0;

    const servicesCost =
      workOrder.additionalServices?.reduce(
        (sum, service) =>
          sum + (service.costPrice || 0) * (service.quantity || 1),
        0
      ) || 0;

    loiNhuan += revenueCollected - partsCost - servicesCost;
  });

  return {
    tiepNhan,
    dangSua,
    daHoanThanh,
    traMay,
    doanhThu,
    loiNhuan,
  };
}
