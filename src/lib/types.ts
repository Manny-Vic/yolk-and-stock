export type PaymentMethod = "cash" | "gcash" | "maya" | "bank" | "credit";
export type DiscountType = "fixed" | "percent";

export type FulfillmentStatus =
  | "draft"
  | "confirmed"
  | "preparing"
  | "partially_fulfilled"
  | "fulfilled"
  | "cancelled";

export type PaymentStatus = "unpaid" | "partially_paid" | "paid";

export const ORDER_SOURCES = [
  "Walk-in",
  "Facebook",
  "Messenger",
  "Phone call",
  "Repeat customer",
  "Referral",
  "Sales representative",
  "Other",
] as const;

export interface OrderLine {
  id: string;
  productId: string;
  productName: string;
  /** Cases */
  qty: number;
  /** Negotiated unit price per case, in centavos */
  unitPrice: number;
  /** Fixed centavos per case, or percent 0–100 when discountType is "percent" */
  discount: number;
  discountType: DiscountType;
  /** Product cost per case at time of sale, in centavos (for profit) */
  unitCost: number;
}

export interface Payment {
  id: string;
  method: PaymentMethod;
  amount: number;
  reference?: string | undefined;
  verified: boolean;
  paidAt: string;
  /** Only for credit sales */
  dueDate?: string | undefined;
}

export interface Order {
  id: string;
  createdAt: string;
  date: string;
  customerId: string | null;
  customerName: string;
  source: string;
  sourceDetail?: string | undefined;
  notes?: string | undefined;
  staffNotes?: string | undefined;
  fulfillment: "delivery" | "pickup";
  requestedDate?: string | undefined;
  deliveryFee: number;
  orderDiscount: number;
  orderDiscountType: DiscountType;
  lines: OrderLine[];
  payments: Payment[];
  status: FulfillmentStatus;
  /** Cases reserved for this order (when reservations are enabled) */
  reservedCases: number;
  /** True once stock has been deducted for this order exactly once */
  stockDeducted: boolean;
}

export interface Product {
  id: string;
  name: string;
  size: string;
  image: string;
  /** Default selling price per case, centavos */
  defaultPrice: number;
  /** Current cost per case, centavos */
  cost: number;
  cases: number;
  reserved: number;
  reorderThreshold: number;
  supplierId: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string | undefined;
  /** Credit limit, centavos */
  creditLimit: number;
  /** Payment terms in days */
  dueDays: number;
}

export interface Supplier {
  id: string;
  name: string;
  contact?: string | undefined;
  phone?: string | undefined;
  notes?: string | undefined;
}

export interface PurchaseItem {
  productId: string;
  qty: number;
  /** Cost per case, centavos */
  cost: number;
  accepted: number;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  date: string;
  expectedDate?: string | undefined;
  items: PurchaseItem[];
  deliveryCost: number;
  status: "ordered" | "received" | "paid";
  receivedDate?: string;
  paidAmount: number;
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  amount: number;
  method: Exclude<PaymentMethod, "credit">;
  payee: string;
  description?: string | undefined;
  receiptName?: string | undefined;
}

export const EXPENSE_CATEGORIES = [
  "Rent",
  "Utilities",
  "Wages",
  "Transportation & delivery",
  "Packaging",
  "Repairs & maintenance",
  "Bank & e-wallet fees",
  "Licenses & permits",
  "Marketing",
  "Other operating",
] as const;

export type AccountKind = "cash" | "ewallet" | "bank";

export interface Account {
  id: string;
  name: string;
  kind: AccountKind;
  /** Opening balance, centavos */
  opening: number;
}

export type CashEntryKind =
  | "sale"
  | "customer_payment"
  | "supplier_payment"
  | "expense"
  | "capital"
  | "withdrawal"
  | "loan_proceeds"
  | "loan_repayment"
  | "transfer";

export interface CashEntry {
  id: string;
  date: string;
  /** Money moves out of accountId… */
  accountId: string;
  /** …and into toAccountId when this is a transfer */
  toAccountId?: string | undefined;
  direction: "in" | "out";
  amount: number;
  kind: CashEntryKind;
  description: string;
  ref?: string | undefined;
}

export interface AuditEntry {
  ts: string;
  action: string;
  detail: string;
}

export interface Settings {
  storeName: string;
  address: string;
  phone: string;
  /** Create separate cart lines when clicking a product already in the order */
  separateLinesOnRepeat: boolean;
  /** Reserve stock when an order is confirmed, deduct when fulfilled */
  reserveOnConfirm: boolean;
  /** Allow per-case discounts larger than the unit price */
  allowOverDiscount: boolean;
  /** Credit sales above this (centavos) show an approval warning */
  creditApprovalLimit: number;
}
