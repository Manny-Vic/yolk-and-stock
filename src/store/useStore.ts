import { create } from "zustand";
import { persist } from "zustand/middleware";

import { calcOrder, perCaseDiscountCents, validateDiscount } from "@/lib/calc";
import { addDaysISO, fmtPeso, todayISO } from "@/lib/money";
import type {
  AuditEntry,
  CashEntry,
  Customer,
  DiscountType,
  Expense,
  FulfillmentStatus,
  Order,
  OrderLine,
  Payment,
  PaymentMethod,
  Product,
  PurchaseOrder,
  Settings,
  Supplier,
} from "@/lib/types";
import {
  SEED_ACCOUNTS,
  SEED_AUDIT,
  SEED_CASH_ENTRIES,
  SEED_CUSTOMERS,
  SEED_EXPENSES,
  SEED_ORDERS,
  SEED_PRODUCTS,
  SEED_PURCHASES,
  SEED_SEQ,
  SEED_SETTINGS,
  SEED_SUPPLIERS,
} from "./seed";

const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();

export const METHOD_ACCOUNT: Record<Exclude<PaymentMethod, "credit">, string> = {
  cash: "acc-cash",
  gcash: "acc-gcash",
  maya: "acc-maya",
  bank: "acc-bank",
};

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Cash",
  gcash: "GCash",
  maya: "Maya",
  bank: "Bank transfer",
  credit: "Credit / utang",
};

export interface CartLine extends OrderLine {}

export interface Cart {
  lines: OrderLine[];
  customerId: string | null;
  customerName: string;
  source: string;
  sourceDetail: string;
  notes: string;
  staffNotes: string;
  fulfillment: "delivery" | "pickup";
  requestedDate: string;
  deliveryFee: number;
  orderDiscount: number;
  orderDiscountType: DiscountType;
}

export const emptyCart = (): Cart => ({
  lines: [],
  customerId: null,
  customerName: "Walk-in Customer",
  source: "Walk-in",
  sourceDetail: "",
  notes: "",
  staffNotes: "",
  fulfillment: "pickup",
  requestedDate: "",
  deliveryFee: 0,
  orderDiscount: 0,
  orderDiscountType: "fixed",
});

export interface NewPayment {
  method: Exclude<PaymentMethod, "credit">;
  amount: number;
  reference?: string;
  verified?: boolean;
}

export interface StoreState {
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  orders: Order[];
  expenses: Expense[];
  accounts: { id: string; name: string; kind: string; opening: number }[];
  cashEntries: CashEntry[];
  purchases: PurchaseOrder[];
  auditLog: AuditEntry[];
  settings: Settings;
  cart: Cart;
  nextSeqOrder: number;
  nextSeqPurchase: number;

  // Cart / POS
  addToCart: (productId: string, qty?: number) => void;
  setLineQty: (lineId: string, qty: number) => void;
  setLinePrice: (lineId: string, centavos: number) => void;
  setLineDiscount: (lineId: string, value: number, type: DiscountType) => string | null;
  resetLinePrice: (lineId: string) => void;
  removeLine: (lineId: string) => void;
  updateCart: (patch: Partial<Cart>) => void;
  clearCart: () => void;
  loadOrderToCart: (orderId: string) => void;

  // Orders
  completeOrder: (payments: NewPayment[]) => string;
  setOrderStatus: (orderId: string, status: FulfillmentStatus) => void;
  recordPayment: (
    orderId: string,
    input: { method: Exclude<PaymentMethod, "credit">; amount: number; reference?: string; verified?: boolean },
  ) => void;
  deleteDraftOrder: (orderId: string) => void;

  // Inventory
  adjustStock: (productId: string, delta: number, reason: string, note?: string) => void;
  updateProduct: (productId: string, patch: Partial<Pick<Product, "name" | "defaultPrice" | "cost" | "reorderThreshold" | "supplierId">>) => void;

  // Customers / suppliers
  addCustomer: (c: Omit<Customer, "id">) => void;
  updateCustomer: (id: string, patch: Partial<Customer>) => void;
  addSupplier: (s: Omit<Supplier, "id">) => void;

  // Purchasing
  addPurchase: (input: { supplierId: string; items: { productId: string; qty: number; cost: number }[]; deliveryCost: number; expectedDate?: string }) => void;
  receivePurchase: (purchaseId: string, accepted: Record<string, number>, date: string) => void;
  payPurchase: (purchaseId: string, amount: number, accountId: string) => void;

  // Money
  addExpense: (e: Omit<Expense, "id">) => void;
  addCashEntry: (e: Omit<CashEntry, "id">) => void;

  updateSettings: (patch: Partial<Settings>) => void;
  resetDemo: () => void;
}

function audit(state: { auditLog: AuditEntry[] }, action: string, detail: string): AuditEntry[] {
  return [{ ts: now(), action, detail }, ...state.auditLog].slice(0, 300);
}

function freshSeed() {
  return {
    products: SEED_PRODUCTS.map((p) => ({ ...p })),
    customers: SEED_CUSTOMERS.map((c) => ({ ...c })),
    suppliers: SEED_SUPPLIERS.map((s) => ({ ...s })),
    orders: SEED_ORDERS.map((o) => ({ ...o, lines: o.lines.map((l) => ({ ...l })), payments: o.payments.map((p) => ({ ...p })) })),
    expenses: SEED_EXPENSES.map((e) => ({ ...e })),
    accounts: SEED_ACCOUNTS.map((a) => ({ ...a })),
    cashEntries: SEED_CASH_ENTRIES.map((e) => ({ ...e })),
    purchases: SEED_PURCHASES.map((p) => ({ ...p, items: p.items.map((i) => ({ ...i })) })),
    auditLog: SEED_AUDIT.map((a) => ({ ...a })),
    settings: { ...SEED_SETTINGS },
    cart: emptyCart(),
    nextSeqOrder: SEED_SEQ.order,
    nextSeqPurchase: SEED_SEQ.purchase,
  };
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...freshSeed(),

      // ---------- Cart / POS ----------
      addToCart: (productId, qty = 1) => {
        const st = get();
        const p = st.products.find((x) => x.id === productId);
        if (!p) return;
        set((state) => {
          let lines = state.cart.lines;
          if (!state.settings.separateLinesOnRepeat) {
            const existing = lines.find((l) => l.productId === productId);
            if (existing) {
              lines = lines.map((l) => (l.id === existing.id ? { ...l, qty: l.qty + qty } : l));
              return { cart: { ...state.cart, lines } };
            }
          }
          const line: OrderLine = {
            id: uid(),
            productId,
            productName: p.name,
            qty,
            unitPrice: p.defaultPrice,
            discount: 0,
            discountType: "fixed",
            unitCost: p.cost,
          };
          return { cart: { ...state.cart, lines: [...lines, line] } };
        });
      },

      setLineQty: (lineId, qty) => {
        set((state) => {
          if (qty <= 0) {
            return { cart: { ...state.cart, lines: state.cart.lines.filter((l) => l.id !== lineId) } };
          }
          return {
            cart: { ...state.cart, lines: state.cart.lines.map((l) => (l.id === lineId ? { ...l, qty } : l)) },
          };
        });
      },

      setLinePrice: (lineId, centavos) => {
        set((state) => {
          const line = state.cart.lines.find((l) => l.id === lineId);
          if (!line) return {};
          const price = Math.max(0, centavos);
          const product = state.products.find((p) => p.id === line.productId);
          const lines = state.cart.lines.map((l) => (l.id === lineId ? { ...l, unitPrice: price } : l));
          let auditLog = state.auditLog;
          if (product && price !== product.defaultPrice) {
            auditLog = audit(state, "Price override", `${line.productName} set to ${fmtPeso(price)}/case (default ${fmtPeso(product.defaultPrice)})`);
          }
          return { cart: { ...state.cart, lines }, auditLog };
        });
      },

      setLineDiscount: (lineId, value, type) => {
        const st = get();
        const line = st.cart.lines.find((l) => l.id === lineId);
        if (!line) return "Line not found.";
        const err = validateDiscount(value, type, line.unitPrice, st.settings.allowOverDiscount);
        if (err) return err;
        set((state) => {
          let auditLog = state.auditLog;
          const lines = state.cart.lines.map((l) => {
            if (l.id !== lineId) return l;
            if (value > 0) {
              const perCase = type === "percent" ? Math.round(l.unitPrice * (value / 100)) : value;
              auditLog = audit(state, "Discount applied", `${l.productName} −${type === "percent" ? `${value}%` : fmtPeso(perCase)}/case`);
            }
            return { ...l, discount: Math.max(0, value), discountType: type };
          });
          return { cart: { ...state.cart, lines }, auditLog };
        });
        return null;
      },

      resetLinePrice: (lineId) => {
        set((state) => {
          const line = state.cart.lines.find((l) => l.id === lineId);
          if (!line) return {};
          const product = state.products.find((p) => p.id === line.productId);
          if (!product) return {};
          return {
            cart: {
              ...state.cart,
              lines: state.cart.lines.map((l) => (l.id === lineId ? { ...l, unitPrice: product.defaultPrice } : l)),
            },
          };
        });
      },

      removeLine: (lineId) => {
        set((state) => ({ cart: { ...state.cart, lines: state.cart.lines.filter((l) => l.id !== lineId) } }));
      },

      updateCart: (patch) => set((state) => ({ cart: { ...state.cart, ...patch } })),

      clearCart: () => set({ cart: emptyCart() }),

      loadOrderToCart: (orderId) => {
        const st = get();
        const order = st.orders.find((o) => o.id === orderId);
        if (!order || order.status !== "draft") return;
        set({
          cart: {
            lines: order.lines.map((l) => ({ ...l, id: uid() })),
            customerId: order.customerId,
            customerName: order.customerName,
            source: order.source,
            sourceDetail: order.sourceDetail ?? "",
            notes: order.notes ?? "",
            staffNotes: order.staffNotes ?? "",
            fulfillment: order.fulfillment,
            requestedDate: order.requestedDate ?? "",
            deliveryFee: order.deliveryFee,
            orderDiscount: order.orderDiscount,
            orderDiscountType: order.orderDiscountType,
          },
          orders: st.orders.filter((o) => o.id !== orderId),
        });
      },

      // ---------- Orders ----------
      completeOrder: (payments) => {
        const st = get();
        const cart = st.cart;
        if (!cart.lines.length) throw new Error("Add at least one product to the order.");
        const reserve = st.settings.reserveOnConfirm;
        const stockErrors: string[] = [];
        for (const line of cart.lines) {
          const p = st.products.find((x) => x.id === line.productId);
          if (!p) continue;
          const available = reserve ? p.cases - p.reserved : p.cases;
          if (line.qty > available) stockErrors.push(`${p.name} (only ${available} case${available === 1 ? "" : "s"} available)`);
        }
        if (stockErrors.length) throw new Error(`Not enough stock — ${stockErrors.join("; ")}`);

        const totalPayments = payments.reduce((s, p) => s + p.amount, 0);
        const t = calcOrder({ ...cart, payments });
        if (totalPayments > t.total) throw new Error("Total payments cannot exceed the order amount.");
        if (payments.some((p) => p.amount <= 0)) throw new Error("Payment amounts must be greater than zero.");
        const credit = payments.find((p) => p.method === "credit") as undefined | (typeof payments)[number] & { method: "credit" };
        if (credit) {
          // credit comes through as a payment entry flagged by the checkout UI
        }

        const seq = st.nextSeqOrder;
        const id = `ORD-${seq}`;
        const today = todayISO();
        const customer = cart.customerId ? st.customers.find((c) => c.id === cart.customerId) : undefined;
        const order: Order = {
          id,
          createdAt: now(),
          date: today,
          customerId: cart.customerId,
          customerName: cart.customerName || "Walk-in Customer",
          source: cart.source,
          sourceDetail: cart.sourceDetail || undefined,
          notes: cart.notes || undefined,
          staffNotes: cart.staffNotes || undefined,
          fulfillment: cart.fulfillment,
          requestedDate: cart.requestedDate || undefined,
          deliveryFee: t.deliveryFee,
          orderDiscount: cart.orderDiscount,
          orderDiscountType: cart.orderDiscountType,
          lines: cart.lines.map((l) => ({ ...l })),
          payments: payments.map((p) => ({
            id: uid(),
            method: p.method,
            amount: p.amount,
            reference: p.reference || undefined,
            verified: p.verified ?? p.method === "cash",
            paidAt: today,
          })),
          status: "confirmed",
          reservedCases: reserve ? t.cases : 0,
          stockDeducted: !reserve,
        };

        set((state) => {
          const products = state.products.map((p) => {
            const q = order.lines.find((l) => l.productId === p.id)?.qty ?? 0;
            if (!q) return p;
            return reserve ? { ...p, reserved: p.reserved + q } : { ...p, cases: Math.max(0, p.cases - q) };
          });
          const cashEntries = [...state.cashEntries];
          for (const p of payments) {
            cashEntries.push({
              id: uid(),
              date: today,
              accountId: METHOD_ACCOUNT[p.method],
              direction: "in",
              amount: p.amount,
              kind: "sale",
              description: `${METHOD_LABEL[p.method]} payment for ${id}`,
              ref: p.reference,
            });
          }
          const log = credit
            ? audit(state, "Order confirmed", `${id} — ${fmtPeso(t.total)} on credit`)
            : audit(state, "Order confirmed", `${id} — ${fmtPeso(t.total)}`);
          return {
            products,
            orders: [order, ...state.orders],
            cashEntries,
            auditLog: log,
            nextSeqOrder: state.nextSeqOrder + 1,
            cart: emptyCart(),
          };
        });
        return id;
      },

      setOrderStatus: (orderId, status) => {
        const st = get();
        const o = st.orders.find((x) => x.id === orderId);
        if (!o || o.status === status) return;
        let products = st.products;
        let reservedCases = o.reservedCases;

        if (status === "fulfilled" && !o.stockDeducted) {
          products = products.map((p) => {
            const q = o.lines.find((l) => l.productId === p.id)?.qty ?? 0;
            return q ? { ...p, cases: Math.max(0, p.cases - q) } : p;
          });
          reservedCases = 0;
        }
        if (status === "cancelled") {
          if (!o.stockDeducted) reservedCases = 0; // release reservation
          else {
            // return deducted stock
            products = products.map((p) => {
              const q = o.lines.find((l) => l.productId === p.id)?.qty ?? 0;
              return q ? { ...p, cases: p.cases + q } : p;
            });
          }
        }
        set((state) => ({
          products,
          orders: state.orders.map((x) =>
            x.id === orderId ? { ...x, status, reservedCases, stockDeducted: x.stockDeducted || status === "fulfilled" } : x,
          ),
          auditLog: audit(state, "Order updated", `${orderId} → ${status.replace("_", " ")}`),
        }));
      },

      recordPayment: (orderId, input) => {
        const st = get();
        const order = st.orders.find((o) => o.id === orderId);
        if (!order) throw new Error("Order not found.");
        if (input.amount <= 0) throw new Error("Enter a payment amount greater than zero.");
        const t = calcOrder(order);
        if (input.amount > t.balance) throw new Error("Payment exceeds the remaining balance.");
        const today = todayISO();
        const payment: Payment = {
          id: uid(),
          method: input.method,
          amount: input.amount,
          reference: input.reference || undefined,
          verified: input.verified ?? input.method === "cash",
          paidAt: today,
        };
        set((state) => ({
          orders: state.orders.map((o) => (o.id === orderId ? { ...o, payments: [...o.payments, payment] } : o)),
          cashEntries: [
            ...state.cashEntries,
            {
              id: uid(),
              date: today,
              accountId: METHOD_ACCOUNT[input.method],
              direction: "in",
              amount: input.amount,
              kind: "customer_payment",
              description: `${METHOD_LABEL[input.method]} payment for ${orderId}`,
              ref: payment.reference,
            },
          ],
          auditLog: audit(state, "Payment recorded", `${orderId} — ${fmtPeso(input.amount)} via ${METHOD_LABEL[input.method]}`),
        }));
      },

      deleteDraftOrder: (orderId) => {
        set((state) => ({
          orders: state.orders.filter((o) => !(o.id === orderId && o.status === "draft")),
          auditLog: audit(state, "Draft deleted", orderId),
        }));
      },

      // ---------- Inventory ----------
      adjustStock: (productId, delta, reason, note) => {
        set((state) => {
          const p = state.products.find((x) => x.id === productId);
          if (!p) return {};
          const cases = Math.max(0, p.cases + delta);
          return {
            products: state.products.map((x) => (x.id === productId ? { ...x, cases } : x)),
            auditLog: audit(state, `Stock adjustment — ${reason}`, `${p.name} ${delta > 0 ? "+" : ""}${delta} case(s). ${note ?? ""}`.trim()),
          };
        });
      },

      updateProduct: (productId, patch) => {
        set((state) => {
          const p = state.products.find((x) => x.id === productId);
          if (!p) return {};
          let auditLog = state.auditLog;
          if (patch.defaultPrice !== undefined && patch.defaultPrice !== p.defaultPrice) {
            auditLog = audit(state, "Default price changed", `${p.name}: ${fmtPeso(p.defaultPrice)} → ${fmtPeso(patch.defaultPrice)}/case`);
          }
          return {
            products: state.products.map((x) => (x.id === productId ? { ...x, ...patch } : x)),
            auditLog,
          };
        });
      },

      // ---------- Customers / suppliers ----------
      addCustomer: (c) => set((state) => ({ customers: [...state.customers, { ...c, id: `c${uid()}` }] })),
      updateCustomer: (id, patch) =>
        set((state) => ({ customers: state.customers.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      addSupplier: (s) => set((state) => ({ suppliers: [...state.suppliers, { ...s, id: `s${uid()}` }] })),

      // ---------- Purchasing ----------
      addPurchase: (input) => {
        set((state) => {
          const po: PurchaseOrder = {
            id: `PO-${state.nextSeqPurchase}`,
            supplierId: input.supplierId,
            date: todayISO(),
            expectedDate: input.expectedDate,
            items: input.items.map((i) => ({ ...i, accepted: 0 })),
            deliveryCost: input.deliveryCost,
            status: "ordered",
            paidAmount: 0,
          };
          return {
            purchases: [po, ...state.purchases],
            nextSeqPurchase: state.nextSeqPurchase + 1,
            auditLog: audit(state, "Purchase order created", `${po.id} — ${input.items.length} item(s) from ${state.suppliers.find((s) => s.id === input.supplierId)?.name ?? "supplier"}`),
          };
        });
      },

      receivePurchase: (purchaseId, accepted, date) => {
        set((state) => {
          const po = state.purchases.find((p) => p.id === purchaseId);
          if (!po || po.status !== "ordered") return {};
          const items = po.items.map((it) => ({ ...it, accepted: accepted[it.productId] ?? 0 }));
          const totalAccepted = items.reduce((s, it) => s + it.accepted, 0);
          const itemsCost = items.reduce((s, it) => s + it.accepted * it.cost, 0);
          const landed = totalAccepted > 0 ? Math.round((itemsCost + po.deliveryCost) / totalAccepted) : 0;
          const products = state.products.map((p) => {
            const it = items.find((x) => x.productId === p.id);
            if (!it || it.accepted <= 0) return p;
            return { ...p, cases: p.cases + it.accepted, cost: landed };
          });
          return {
            purchases: state.purchases.map((x) => (x.id === purchaseId ? { ...po, items, status: "received", receivedDate: date } : x)),
            products,
            auditLog: audit(state, "Goods received", `${po.id} — ${totalAccepted} case(s) received. Landed cost ${fmtPeso(landed)}/case`),
          };
        });
      },

      payPurchase: (purchaseId, amount, accountId) => {
        set((state) => {
          const po = state.purchases.find((p) => p.id === purchaseId);
          if (!po) return {};
          const payable = Math.max(0, po.items.reduce((s, it) => s + (it.accepted || it.qty) * it.cost, 0) + po.deliveryCost - po.paidAmount);
          if (amount <= 0 || amount > payable) return {};
          const paidAmount = po.paidAmount + amount;
          return {
            purchases: state.purchases.map((x) =>
              x.id === purchaseId ? { ...x, paidAmount, status: paidAmount >= payable ? "paid" : x.status } : x,
            ),
            cashEntries: [
              ...state.cashEntries,
              { id: uid(), date: todayISO(), accountId, direction: "out", amount, kind: "supplier_payment", description: `Payment for ${po.id}` },
            ],
            auditLog: audit(state, "Supplier payment", `${po.id} — ${fmtPeso(amount)}`),
          };
        });
      },

      // ---------- Money ----------
      addExpense: (e) => {
        set((state) => ({
          expenses: [{ ...e, id: uid() }, ...state.expenses],
          cashEntries: [
            ...state.cashEntries,
            { id: uid(), date: e.date, accountId: METHOD_ACCOUNT[e.method], direction: "out", amount: e.amount, kind: "expense", description: `${e.category} — ${e.payee}` },
          ],
          auditLog: audit(state, "Expense recorded", `${e.category} — ${fmtPeso(e.amount)} via ${METHOD_LABEL[e.method]}`),
        }));
      },

      addCashEntry: (e) => {
        set((state) => ({ cashEntries: [{ ...e, id: uid() }, ...state.cashEntries] }));
      },

      updateSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),

      resetDemo: () => set(freshSeed()),
    }),
    {
      name: "golden-nest-pos-v1",
      version: 1,
      // Hydrate manually from the root component to avoid SSR mismatches.
      skipHydration: true,
    },
  ),
);

/** Call once on the client after mount. */
export function hydrateStore() {
  if (typeof window === "undefined") return;
  void useStore.persist.rehydrate();
}

export { perCaseDiscountCents };
