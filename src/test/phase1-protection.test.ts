import { describe, expect, it } from "vitest";

import { checkoutApprovalReasons } from "@/lib/approval";
import { hashPin, isValidPin, verifyPin } from "@/lib/pin";
import { overShort, shiftSummary } from "@/lib/shift";
import type { CashEntry, OrderLine } from "@/lib/types";

const line = (p: Partial<OrderLine>): OrderLine => ({ id: "l", productId: "p", productName: "Large", qty: 1, unitPrice: 20000, discount: 0, discountType: "fixed", unitCost: 18000, ...p });
const cart = (lines: OrderLine[]) => ({ lines, deliveryFee: 0, orderDiscount: 0, orderDiscountType: "fixed" as const, payments: [] });

describe("staff PINs", () => {
  it("accepts only 4–6 digit PINs", () => {
    expect(isValidPin("123")).toBe(false);
    expect(isValidPin("1234")).toBe(true);
    expect(isValidPin("1234567")).toBe(false);
  });
  it("verifies the right PIN and rejects a wrong one", async () => {
    const s = { id: "st-1", pinHash: await hashPin("st-1", "4321") };
    expect(await verifyPin(s, "4321")).toBe(true);
    expect(await verifyPin(s, "1111")).toBe(false);
  });
});

describe("owner approval at checkout", () => {
  it("needs approval when selling below cost", () => {
    expect(checkoutApprovalReasons(cart([line({ unitPrice: 17000 })]), 5)).toHaveLength(1);
  });
  it("needs approval for a discount above the cashier limit", () => {
    expect(checkoutApprovalReasons(cart([line({ discount: 10, discountType: "percent", unitCost: 0 })]), 5)).toHaveLength(1);
  });
  it("needs no approval for a 5% discount at a 5% limit above cost", () => {
    expect(checkoutApprovalReasons(cart([line({ discount: 5, discountType: "percent", unitCost: 15000 })]), 5)).toHaveLength(0);
  });
});

describe("shift drawer count", () => {
  const e = (p: Partial<CashEntry>): CashEntry => ({ id: "e", date: "2026-11-03", accountId: "acc-cash", direction: "in", amount: 0, kind: "sale", description: "", shiftId: "S1", ...p });
  it("expected cash = float + cash in − cash out, ignoring other shifts and e-wallets", () => {
    const entries = [
      e({ amount: 100000 }),
      e({ amount: 20000, kind: "customer_payment" }),
      e({ amount: 5000, direction: "out", kind: "expense" }),
      e({ amount: 30000, direction: "out", toAccountId: "acc-bank", kind: "transfer" }),
      e({ amount: 99999, accountId: "acc-gcash" }),
      e({ amount: 77777, shiftId: "S2" }),
    ];
    expect(shiftSummary({ id: "S1", openingFloat: 200000 }, entries).expectedCash).toBe(285000);
  });
  it("reports short as negative and over as positive", () => {
    expect(overShort(280000, 285000)).toBe(-5000);
    expect(overShort(286000, 285000)).toBe(1000);
  });
});
