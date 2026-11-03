import { describe, expect, it } from "vitest";
import { calcProfit } from "@/lib/calc";
import type { OrderLine } from "@/lib/types";

const line = (p: Partial<OrderLine>): OrderLine => ({
  id: "l", productId: "p", productName: "Small Eggs", qty: 10, unitPrice: 18_500, discount: 0, discountType: "fixed", unitCost: 16_000, ...p,
});

describe("calcProfit", () => {
  it("profit = net sales − qty × cost, delivery excluded", () => {
    const r = calcProfit({ lines: [line({})], orderDiscount: 0, orderDiscountType: "fixed", deliveryFee: 50_000 });
    expect(r.netSales).toBe(185_000);
    expect(r.cogs).toBe(160_000);
    expect(r.profit).toBe(25_000);
    expect(r.marginPct).toBe(13.5);
  });
  it("order discount reduces profit", () => {
    const r = calcProfit({ lines: [line({})], orderDiscount: 5_000, orderDiscountType: "fixed", deliveryFee: 0 });
    expect(r.profit).toBe(20_000);
  });
  it("flags lines discounted below cost", () => {
    const r = calcProfit({ lines: [line({ discount: 3_000 })], orderDiscount: 0, orderDiscountType: "fixed", deliveryFee: 0 });
    expect(r.belowCost).toEqual(["Small Eggs"]);
    expect(r.profit).toBe(-5_000);
  });
});
