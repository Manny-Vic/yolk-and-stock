import type { FulfillmentStatus, Order, OrderLine, PaymentStatus } from "./types";

export interface LineCalc {
  /** qty × unit price */
  gross: number;
  /** total peso discount for the line */
  discount: number;
  /** per-case price after discount, centavos */
  effective: number;
  /** line total */
  total: number;
  /** per-case discount in centavos */
  perCase: number;
}

/** Per-case discount expressed in centavos, whatever the discount type. */
export function perCaseDiscountCents(line: Pick<OrderLine, "unitPrice" | "discount" | "discountType">): number {
  if (line.discount <= 0) return 0;
  if (line.discountType === "percent") {
    return Math.min(Math.round(line.unitPrice * (Math.min(line.discount, 100) / 100)), line.unitPrice);
  }
  return Math.min(line.discount, line.unitPrice);
}

export function calcLine(line: OrderLine): LineCalc {
  const perCase = perCaseDiscountCents(line);
  const gross = line.qty * line.unitPrice;
  const discount = line.qty * perCase;
  const effective = line.unitPrice - perCase;
  const total = line.qty * effective;
  return { gross, discount, effective, total, perCase };
}

export interface OrderTotals {
  cases: number;
  lineCount: number;
  gross: number;
  lineDiscounts: number;
  afterLine: number;
  orderDiscount: number;
  deliveryFee: number;
  total: number;
  paid: number;
  balance: number;
}

export interface OrderLike {
  lines: OrderLine[];
  orderDiscount: number;
  orderDiscountType: "fixed" | "percent";
  deliveryFee: number;
  payments?: Pick<PaymentLite, "method" | "amount">[];
}

interface PaymentLite {
  method: string;
  amount: number;
}

/**
 * Gross subtotal  = Σ qty × unit price
 * Line total      = qty × (unit price − per-case discount)
 * Order total     = Σ line totals − order-level discount + delivery fee
 */
export function calcOrder(o: OrderLike): OrderTotals {
  const calc = o.lines.map(calcLine);
  const cases = o.lines.reduce((s, l) => s + l.qty, 0);
  const gross = calc.reduce((s, c) => s + c.gross, 0);
  const lineDiscounts = calc.reduce((s, c) => s + c.discount, 0);
  const afterLine = gross - lineDiscounts;

  let orderDiscount = 0;
  const od = Math.max(0, o.orderDiscount || 0);
  if (od > 0) {
    orderDiscount =
      o.orderDiscountType === "percent"
        ? Math.round(afterLine * (Math.min(od, 100) / 100))
        : Math.min(od, afterLine);
  }

  const deliveryFee = Math.max(0, o.deliveryFee || 0);
  const total = Math.max(0, afterLine - orderDiscount + deliveryFee);
  const paid = (o.payments ?? [])
    .filter((p) => p.method !== "credit")
    .reduce((s, p) => s + p.amount, 0);
  const balance = Math.max(0, total - paid);

  return {
    cases,
    lineCount: o.lines.length,
    gross,
    lineDiscounts,
    afterLine,
    orderDiscount,
    deliveryFee,
    total,
    paid,
    balance,
  };
}

/** Amount still receivable, counting credit sales as outstanding. */
export function orderReceivable(order: Order): number {
  const t = calcOrder(order);
  return t.balance;
}

export function paymentStatus(order: Order): { status: PaymentStatus; overdue: boolean } {
  const t = calcOrder(order);
  let status: PaymentStatus;
  if (t.balance <= 0) status = "paid";
  else if (t.paid > 0) status = "partially_paid";
  else status = "unpaid";

  const today = new Date().toISOString().slice(0, 10);
  const overdue =
    t.balance > 0 &&
    order.payments.some((p) => p.method === "credit" && p.dueDate && p.dueDate < today);

  return { status, overdue };
}

export const FULFILLMENT_LABELS: Record<FulfillmentStatus, string> = {
  draft: "Draft",
  confirmed: "Confirmed",
  preparing: "Preparing",
  partially_fulfilled: "Partially fulfilled",
  fulfilled: "Fulfilled",
  cancelled: "Cancelled",
};

export const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  partially_paid: "Partially paid",
  paid: "Paid",
};

export const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  gcash: "GCash",
  maya: "Maya",
  bank: "Bank transfer",
  credit: "Credit / utang",
  split: "Split payment",
};

/** Validate a per-case discount edit. Returns an error message or null. */
export function validateDiscount(
  discount: number,
  type: "fixed" | "percent",
  unitPrice: number,
  allowOverDiscount: boolean,
): string | null {
  if (discount < 0) return "Discount cannot be negative.";
  if (type === "percent" && discount > 100) return "Percentage discount cannot exceed 100%.";
  if (!allowOverDiscount && type === "fixed" && discount > unitPrice) {
    return "Discount cannot exceed the unit price.";
  }
  return null;
}

export const STATUS_TONES: Record<FulfillmentStatus, string> = {
  draft: "secondary",
  confirmed: "default",
  preparing: "warning",
  partially_fulfilled: "warning",
  fulfilled: "success",
  cancelled: "destructive",
};
