import { describe, expect, it } from "vitest";

import { calcLine, calcOrder, perCaseDiscountCents, validateDiscount } from "@/lib/calc";
import type { OrderLine } from "@/lib/types";

const line = (
  qty: number,
  unitPrice: number,
  discount = 0,
  discountType: "fixed" | "percent" = "fixed",
  unitCost = 0,
): OrderLine => ({ id: "l", productId: "p", productName: "Test", qty, unitPrice, discount, discountType, unitCost });

describe("order math (integer centavos)", () => {
  it("matches the spec example: 10×(₱220−₱20) + 5×₱205 + 3×(₱185−₱15)", () => {
    const t = calcOrder({
      lines: [line(10, 22_000, 2_000), line(5, 20_500), line(3, 18_500, 1_500)],
      orderDiscount: 0,
      orderDiscountType: "fixed",
      deliveryFee: 0,
    });
    expect(t.gross).toBe(378_000);
    expect(t.lineDiscounts).toBe(24_500);
    // ₱2,000 + ₱1,025 + ₱510 = ₱3,535
    expect(t.afterLine).toBe(353_500);
    expect(t.total).toBe(353_500);
  });

  it("converts percent discounts to centavos per case", () => {
    const l = line(4, 20_000, 10, "percent");
    expect(perCaseDiscountCents(l)).toBe(2_000);
    expect(calcLine(l).total).toBe(72_000);
  });

  it("applies order-level discount and delivery fee and splits paid/balance", () => {
    const t = calcOrder({
      lines: [line(2, 10_000)],
      orderDiscount: 2_000,
      orderDiscountType: "fixed",
      deliveryFee: 5_000,
      payments: [{ method: "cash", amount: 10_000 }],
    });
    expect(t.total).toBe(23_000);
    expect(t.paid).toBe(10_000);
    expect(t.balance).toBe(13_000);
  });

  it("never produces a negative total from an oversized order discount", () => {
    const t = calcOrder({
      lines: [line(1, 10_000)],
      orderDiscount: 99_999,
      orderDiscountType: "fixed",
      deliveryFee: 0,
    });
    expect(t.total).toBe(0);
  });

  it("counts only non-credit payments as received", () => {
    const t = calcOrder({
      lines: [line(1, 50_000)],
      orderDiscount: 0,
      orderDiscountType: "fixed",
      deliveryFee: 0,
      payments: [
        { method: "credit", amount: 50_000 },
        { method: "cash", amount: 20_000 },
      ],
    });
    expect(t.paid).toBe(20_000);
    expect(t.balance).toBe(30_000);
  });

  it("blocks discounts above unit price unless the override is enabled", () => {
    expect(validateDiscount(11_000, "fixed", 10_000, false)).not.toBeNull();
    expect(validateDiscount(11_000, "fixed", 10_000, true)).toBeNull();
    expect(validateDiscount(101, "percent", 10_000, false)).not.toBeNull();
    expect(validateDiscount(1_000, "fixed", 10_000, false)).toBeNull();
  });
});
