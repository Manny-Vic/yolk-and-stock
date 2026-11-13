import { beforeEach, describe, expect, it } from "vitest";

import { fmtTime } from "@/lib/money";
import { receiptHtml } from "@/components/pos/receipt";
import { useStore } from "@/store/useStore";

describe("customer name/address and receipt time", () => {
  beforeEach(() => {
    useStore.getState().startFresh();
  });

  it("formats time in Philippine time", () => {
    expect(fmtTime("2026-11-13T06:35:00.000Z")).toBe("2:35 PM");
    expect(fmtTime("2026-11-13T04:05:00.000Z")).toBe("12:05 PM");
    expect(fmtTime(undefined)).toBe("");
    expect(fmtTime("garbage")).toBe("");
  });

  it("starts each cart with no address and resets after clearing", () => {
    const s = useStore.getState();
    expect(s.cart.customerAddress).toBe("");
    s.updateCart({ customerName: "Aling Nena", customerAddress: "12 Rizal St, Cebu" });
    expect(useStore.getState().cart.customerAddress).toBe("12 Rizal St, Cebu");
    useStore.getState().clearCart();
    expect(useStore.getState().cart.customerAddress).toBe("");
    expect(useStore.getState().cart.customerName).toBe("Walk-in Customer");
  });

  it("prints name, address and time on the receipt, and escapes HTML", () => {
    const html = receiptHtml(
      {
        id: "ORD-1",
        createdAt: "2026-11-13T06:35:00.000Z",
        date: "2026-11-13",
        customerId: null,
        customerName: "Nena <b>X</b>",
        customerAddress: "12 Rizal St & Co",
        source: "Walk-in",
        fulfillment: "pickup",
        deliveryFee: 0,
        orderDiscount: 0,
        orderDiscountType: "fixed",
        lines: [],
        payments: [],
        status: "draft",
        reservedCases: 0,
        stockDeducted: false,
      },
      useStore.getState().settings,
    );
    expect(html).toContain("2:35 PM");
    expect(html).toContain("12 Rizal St &amp; Co");
    expect(html).toContain("Nena &lt;b&gt;X&lt;/b&gt;");
    expect(html).not.toContain("<b>X</b>");
  });
});
