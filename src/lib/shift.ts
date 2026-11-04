import type { CashEntry, Shift } from "./types";

export const DRAWER_ACCOUNT = "acc-cash";

export interface ShiftSummary {
  openingFloat: number;
  cashSales: number;
  cashCollections: number;
  cashOut: number;
  cashIn: number;
  /** openingFloat + all cash in − all cash out for this shift */
  expectedCash: number;
}

/** Expected drawer cash for a shift, from the cash entries tagged with that shift. */
export function shiftSummary(shift: Pick<Shift, "id" | "openingFloat">, entries: CashEntry[]): ShiftSummary {
  let cashSales = 0;
  let cashCollections = 0;
  let cashOut = 0;
  let cashIn = 0;
  for (const e of entries) {
    if (e.shiftId !== shift.id) continue;
    if (e.accountId === DRAWER_ACCOUNT) {
      if (e.toAccountId || e.direction === "out") cashOut += e.amount;
      else if (e.kind === "sale") cashSales += e.amount;
      else if (e.kind === "customer_payment") cashCollections += e.amount;
      else cashIn += e.amount;
    } else if (e.toAccountId === DRAWER_ACCOUNT) {
      cashIn += e.amount;
    }
  }
  return {
    openingFloat: shift.openingFloat,
    cashSales,
    cashCollections,
    cashOut,
    cashIn,
    expectedCash: shift.openingFloat + cashSales + cashCollections + cashIn - cashOut,
  };
}

/** Positive = drawer over, negative = drawer short. */
export function overShort(counted: number, expected: number): number {
  return counted - expected;
}
