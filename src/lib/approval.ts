import { calcLine, calcProfit, type OrderLike } from "./calc";

export const DEFAULT_MAX_CASHIER_DISCOUNT_PCT = 5;

/**
 * Reasons a cashier needs an owner PIN before checking out this cart.
 * Empty array = no approval needed.
 */
export function checkoutApprovalReasons(cart: OrderLike, maxDiscountPct: number): string[] {
  const reasons: string[] = [];
  const profit = calcProfit(cart);
  if (profit.belowCost.length) reasons.push(`Selling below cost: ${profit.belowCost.join(", ")}`);
  for (const l of cart.lines) {
    if (l.unitPrice <= 0 || l.qty <= 0) continue;
    const pct = ((l.unitPrice - calcLine(l).effective) / l.unitPrice) * 100;
    if (pct > maxDiscountPct + 1e-9) {
      reasons.push(`${l.productName} discount ${Math.round(pct * 10) / 10}% is above the ${maxDiscountPct}% cashier limit`);
    }
  }
  return reasons;
}
