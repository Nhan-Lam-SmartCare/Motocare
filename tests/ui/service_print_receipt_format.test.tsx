import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ServiceReceiptPreview from "../../src/components/service/ServiceReceiptPreview";
import { formatWorkOrderId } from "../../src/utils/format";

const workOrder = {
  id: "WO-1699999999000",
  creationDate: new Date(2024, 10, 1).toISOString(),
  customerName: "Khách Test",
  customerPhone: "0123456789",
  partsUsed: [{ name: "Part X", quantity: 1, price: 100 }],
  total: 100,
};

describe("ServiceReceiptPreview formatted id", () => {
  it("shows formatted work order ID using store prefix", async () => {
    const formatted = formatWorkOrderId(workOrder.id, "SC");
    render(
      <ServiceReceiptPreview
        workOrder={workOrder as any}
        storeSettings={{ work_order_prefix: "SC" }}
      />
    );

    expect(await screen.findByText(new RegExp(formatted))).not.toBeNull();
  });

  it("shows discount label and net price when a part has a discount", async () => {
    const discountedWorkOrder = {
      id: "WO-1699999999000",
      creationDate: new Date(2024, 10, 1).toISOString(),
      customerName: "Khách Test",
      customerPhone: "0123456789",
      partsUsed: [
        {
          partName: "Nhớt Castrol",
          quantity: 2,
          price: 150000,
          discount: 50000,
        },
      ],
      total: 250000, // (150000 * 2) - 50000 = 250000
    };

    render(
      <ServiceReceiptPreview
        workOrder={discountedWorkOrder as any}
      />
    );

    // Verify part name is shown
    expect(await screen.findByText("Nhớt Castrol")).not.toBeNull();
    // Verify discount label is shown: (Giảm -50.000 đ) or (Giảm -50.000)
    expect(await screen.findByText(/\(Giảm -50\.000/)).not.toBeNull();
    // Verify struck-through original total: 300.000
    expect(await screen.findByText(/300\.000/)).not.toBeNull();
    // Verify net subtotal and total both exist (should be 2 instances of 250.000)
    const netPriceElements = await screen.findAllByText(/250\.000/);
    expect(netPriceElements.length).toBe(2);
  });
});
