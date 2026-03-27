import { describe, expect, it } from "vitest";
import type { WorkOrder } from "../../../types";
import {
  calculateMobileServiceKpis,
  filterMobileWorkOrdersByDate,
} from "./serviceMobile.utils";

function makeWorkOrder(overrides: Partial<WorkOrder> = {}): WorkOrder {
  return {
    id: overrides.id || "WO-1",
    customerName: "Test Customer",
    customerPhone: "0900000000",
    vehicleModel: "Wave",
    licensePlate: "59A-12345",
    issueDescription: "",
    technicianName: "",
    status: "Tiếp nhận",
    laborCost: 0,
    discount: 0,
    partsUsed: [],
    total: 0,
    branchId: "CN1",
    paymentStatus: "unpaid",
    creationDate: "2026-03-19T09:00:00.000Z",
    ...overrides,
  };
}

describe("filterMobileWorkOrdersByDate", () => {
  it("keeps active work orders visible even when outside the selected range", () => {
    const now = new Date("2026-03-19T10:00:00.000Z");
    const oldOpenOrder = makeWorkOrder({
      id: "WO-open",
      status: "Đang sửa",
      creationDate: "2026-02-01T09:00:00.000Z",
    });
    const oldDeliveredOrder = makeWorkOrder({
      id: "WO-delivered",
      status: "Trả máy",
      creationDate: "2026-02-01T09:00:00.000Z",
    });

    const filtered = filterMobileWorkOrdersByDate(
      [oldOpenOrder, oldDeliveredOrder],
      "today",
      now
    );

    expect(filtered.map((order) => order.id)).toEqual(["WO-open"]);
  });

  it("still returns recent non-active orders within range", () => {
    const now = new Date("2026-03-19T10:00:00.000Z");
    const recentDeliveredOrder = makeWorkOrder({
      id: "WO-recent",
      status: "Trả máy",
      creationDate: "2026-03-18T09:00:00.000Z",
    });

    const filtered = filterMobileWorkOrdersByDate(
      [recentDeliveredOrder],
      "week",
      now
    );

    expect(filtered.map((order) => order.id)).toEqual(["WO-recent"]);
  });

  it("uses month-to-date boundary for month filter", () => {
    const now = new Date("2026-03-27T10:00:00.000Z");
    const inCurrentMonth = makeWorkOrder({
      id: "WO-current-month",
      status: "Trả máy",
      creationDate: "2026-03-05T09:00:00.000Z",
    });
    const inPreviousMonth = makeWorkOrder({
      id: "WO-previous-month",
      status: "Trả máy",
      creationDate: "2026-02-28T09:00:00.000Z",
    });

    const filtered = filterMobileWorkOrdersByDate(
      [inCurrentMonth, inPreviousMonth],
      "month",
      now
    );

    expect(filtered.map((order) => order.id)).toEqual(["WO-current-month"]);
  });
});

describe("calculateMobileServiceKpis", () => {
  it("counts paid revenue fully and partial revenue by collected amount", () => {
    const paidOrder = makeWorkOrder({
      id: "WO-paid",
      status: "Trả máy",
      paymentStatus: "paid",
      total: 500_000,
      partsUsed: [{ partId: "P1", partName: "Part", sku: "P1", quantity: 1, price: 300_000, costPrice: 200_000 }],
      additionalServices: [{ id: "S1", description: "Service", quantity: 1, price: 200_000, costPrice: 50_000 }],
    });
    const partialOrder = makeWorkOrder({
      id: "WO-partial",
      status: "Đã sửa xong",
      paymentStatus: "partial",
      total: 400_000,
      totalPaid: 150_000,
      partsUsed: [{ partId: "P2", partName: "Part 2", sku: "P2", quantity: 1, price: 250_000, costPrice: 100_000 }],
      additionalServices: [{ id: "S2", description: "Service 2", quantity: 1, price: 150_000, costPrice: 20_000 }],
    });

    const kpis = calculateMobileServiceKpis([paidOrder, partialOrder]);

    expect(kpis.traMay).toBe(1);
    expect(kpis.daHoanThanh).toBe(1);
    expect(kpis.doanhThu).toBe(650_000);
    expect(kpis.loiNhuan).toBe(280_000);
  });
});
