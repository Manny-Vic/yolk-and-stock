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
  /** Staff member who recorded this payment */
  recordedBy?: string | undefined;
}

export interface Order {
  id: string;
  createdAt: string;
  date: string;
  customerId: string | null;
  customerName: string;
  /** Delivery / billing address typed at checkout (optional) */
  customerAddress?: string | undefined;
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
  /** Staff member who rang up the order */
  staffName?: string | undefined;
  /** Shift the order was rung up in */
  shiftId?: string | undefined;
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
  address?: string | undefined;
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
  /** Supplier credit terms in days, counted from the received date */
  termsDays?: number | undefined;
  /** Date the supplier must be paid by */
  dueDate?: string | undefined;
  createdBy?: string | undefined;
  receivedBy?: string | undefined;
  returns?: PurchaseReturn[] | undefined;
  payments?: SupplierPayment[] | undefined;
}

export interface PurchaseReturn {
  id: string;
  date: string;
  productId: string;
  qty: number;
  /** Cost per case credited back, centavos */
  cost: number;
  reason: string;
  by?: string | undefined;
}

export interface SupplierPayment {
  id: string;
  date: string;
  amount: number;
  accountId: string;
  by?: string | undefined;
}

/** One correction of an expense amount. Kept forever so the mistake stays visible. */
export interface ExpenseCorrection {
  id: string;
  ts: string;
  /** Amount before this correction, in centavos */
  from: number;
  /** Amount after this correction, in centavos */
  to: number;
  reason?: string | undefined;
  by?: string | undefined;
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  /** Current (corrected) amount in centavos. This is the figure every total uses. */
  amount: number;
  /** Earlier amounts that were corrected, oldest first. Absent when never corrected. */
  corrections?: ExpenseCorrection[] | undefined;
  method: Exclude<PaymentMethod, "credit">;
  payee: string;
  description?: string | undefined;
  receiptName?: string | undefined;
  /** Staff member who recorded the expense */
  by?: string | undefined;
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
  /** Shift that was open when this entry was recorded */
  shiftId?: string | undefined;
  /** Staff member who recorded this entry */
  by?: string | undefined;
}

export interface AuditEntry {
  ts: string;
  action: string;
  detail: string;
  /** Staff member who was signed in when this happened */
  by?: string | undefined;
}

export type StaffRole = "owner" | "cashier";

export interface Staff {
  id: string;
  name: string;
  role: StaffRole;
  /** SHA-256 of `${id}:${pin}` — never the raw PIN */
  pinHash: string;
}

export interface Shift {
  id: string;
  staffId: string;
  staffName: string;
  openedAt: string;
  /** Cash put in the drawer for change, centavos */
  openingFloat: number;
  closedAt?: string | undefined;
  closedBy?: string | undefined;
  /** Cash physically counted at close, centavos */
  countedCash?: number | undefined;
  /** What the system expected in the drawer at close, centavos */
  expectedCash?: number | undefined;
  notes?: string | undefined;
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
  /** Cashiers need an owner PIN for any line discount above this percent */
  maxCashierDiscountPct?: number | undefined;
  /** Receipt paper: full page, or 80mm / 58mm thermal roll */
  receiptPaper?: ReceiptPaper | undefined;
}

export type ReceiptPaper = "standard" | "80mm" | "58mm";
