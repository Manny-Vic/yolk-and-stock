import { calcOrder, paymentStatus } from "./calc";
import { todayISO } from "./money";
import type {
  Account,
  CashEntry,
  Customer,
  Order,
  PurchaseOrder,
  Supplier,
} from "./types";

/** Purchase total = Σ (accepted ?? qty) × cost + delivery cost − paid so far. */
export function purchaseTotal(po: PurchaseOrder): number {
  const items = po.items.reduce((s, it) => s + (po.status === "ordered" ? it.qty : it.accepted || it.qty) * it.cost, 0);
  return items + po.deliveryCost;
}

export function purchasePayable(po: PurchaseOrder): number {
  return Math.max(0, purchaseTotal(po) - po.paidAmount);
}

export function accountBalances(accounts: Account[], entries: CashEntry[]): Record<string, { opening: number; in: number; out: number; closing: number }> {
  const result: Record<string, { opening: number; in: number; out: number; closing: number }> = {};
  for (const a of accounts) result[a.id] = { opening: a.opening, in: 0, out: 0, closing: a.opening };
  for (const e of entries) {
    const from = result[e.accountId];
    if (from) {
      if (e.toAccountId) from.out += e.amount;
      else if (e.direction === "in") from.in += e.amount;
      else from.out += e.amount;
      from.closing = from.opening + from.in - from.out;
    }
    const to = e.toAccountId ? result[e.toAccountId] : undefined;
    if (to) {
      to.in += e.amount;
      to.closing = to.opening + to.in - to.out;
    }
  }
  return result;
}

export function customerStats(customer: Customer, orders: Order[]) {
  const mine = orders.filter((o) => o.customerId === customer.id && o.status !== "cancelled" && o.status !== "draft");
  const outstanding = mine.reduce((s, o) => s + calcOrder(o).balance, 0);
  const today = todayISO();
  const overdue = mine.reduce(
    (s, o) => (paymentStatus(o).overdue ? s + calcOrder(o).balance : s),
    0,
  );
  const lifetime = mine.reduce((s, o) => s + calcOrder(o).total, 0);
  const ordersCount = mine.length;
  const lastOrder = mine.sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  return { outstanding, overdue, lifetime, ordersCount, lastOrderDate: lastOrder?.date, overLimit: outstanding > customer.creditLimit };
}

export function supplierStats(supplier: Supplier, purchases: PurchaseOrder[]) {
  const mine = purchases.filter((p) => p.supplierId === supplier.id);
  const payable = mine.filter((p) => p.status !== "paid").reduce((s, p) => s + purchasePayable(p), 0);
  const lifetime = mine.reduce((s, p) => s + purchaseTotal(p), 0);
  return { payable, lifetime, ordersCount: mine.length };
}

export function inventoryValue(products: { cases: number; cost: number }[]): number {
  return products.reduce((s, p) => s + p.cases * p.cost, 0);
}

/** Customer credit aging buckets from outstanding order balances. */
export function creditAging(orders: Order[], customers: Customer[]) {
  const today = todayISO();
  const buckets = { current: 0, d1_30: 0, d31_60: 0, d60plus: 0 };
  const byCustomer = new Map<string, number>();
  for (const o of orders) {
    if (o.status === "cancelled" || o.status === "draft") continue;
    const bal = calcOrder(o).balance;
    if (bal <= 0 || !o.customerId) continue;
    const creditDue = o.payments.find((p) => p.method === "credit" && p.dueDate)?.dueDate;
    const due = creditDue ?? o.date;
    const daysLate = Math.floor((new Date(today).getTime() - new Date(due).getTime()) / 86_400_000);
    if (daysLate <= 0) buckets.current += bal;
    else if (daysLate <= 30) buckets.d1_30 += bal;
    else if (daysLate <= 60) buckets.d31_60 += bal;
    else buckets.d60plus += bal;
    byCustomer.set(o.customerId, (byCustomer.get(o.customerId) ?? 0) + bal);
  }
  const rows = customers
    .filter((c) => byCustomer.has(c.id))
    .map((c) => ({ customer: c, balance: byCustomer.get(c.id) ?? 0 }));
  return { buckets, rows };
}
