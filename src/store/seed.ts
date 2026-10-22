import eggsSmall from "@/assets/eggs-small.jpg";
import eggsMedium from "@/assets/eggs-medium.jpg";
import eggsLarge from "@/assets/eggs-large.jpg";
import eggsJumbo from "@/assets/eggs-jumbo.jpg";
import eggsMixed from "@/assets/eggs-mixed.jpg";
import type {
  Account,
  AuditEntry,
  CashEntry,
  Customer,
  DiscountType,
  Expense,
  Order,
  OrderLine,
  Payment,
  Product,
  PurchaseOrder,
  Settings,
  Supplier,
} from "@/lib/types";

export const SEED_SETTINGS: Settings = {
  storeName: "Golden Nest Egg Depot",
  address: "147 Poultry Ave., Balintawak, Quezon City",
  phone: "0917 555 0148",
  separateLinesOnRepeat: false,
  reserveOnConfirm: true,
  allowOverDiscount: false,
  creditApprovalLimit: 3_000_000_00,
};

export const SEED_PRODUCTS: Product[] = [
  { id: "p-small", name: "Small Eggs", size: "Small · 30-pc tray", image: eggsSmall, defaultPrice: 18_500, cost: 16_000, cases: 42, reserved: 19, reorderThreshold: 10, supplierId: "s1" },
  { id: "p-medium", name: "Medium Eggs", size: "Medium · 30-pc tray", image: eggsMedium, defaultPrice: 20_500, cost: 17_500, cases: 36, reserved: 18, reorderThreshold: 10, supplierId: "s1" },
  { id: "p-large", name: "Large Eggs", size: "Large · 30-pc tray", image: eggsLarge, defaultPrice: 22_000, cost: 18_800, cases: 48, reserved: 21, reorderThreshold: 12, supplierId: "s2" },
  { id: "p-jumbo", name: "Jumbo Eggs", size: "Jumbo · 12-pc tray", image: eggsJumbo, defaultPrice: 24_000, cost: 20_500, cases: 18, reserved: 2, reorderThreshold: 8, supplierId: "s2" },
  { id: "p-mixed", name: "Mixed-size Eggs", size: "Mixed · 30-pc tray", image: eggsMixed, defaultPrice: 19_500, cost: 16_800, cases: 25, reserved: 12, reorderThreshold: 8, supplierId: "s1" },
];

export const SEED_CUSTOMERS: Customer[] = [
  { id: "c1", name: "Tita Nena Eatery", phone: "0918 220 4471", creditLimit: 3_000_000_00, dueDays: 14 },
  { id: "c2", name: "Golden Spoon Bakeshop", phone: "0917 884 2210", creditLimit: 2_000_000_00, dueDays: 15 },
  { id: "c3", name: "Fiesta Mart QC", phone: "0920 118 7335", creditLimit: 1_500_000_00, dueDays: 7 },
  { id: "c4", name: "Kusina ni Lola Carinderia", phone: "0995 402 8817", creditLimit: 800_000_00, dueDays: 10 },
  { id: "c5", name: "Hotel Aurora Dining", phone: "0908 771 5540", creditLimit: 5_000_000_00, dueDays: 30 },
  { id: "c6", name: "Marikina Sari-sari Coop", phone: "0921 665 3029", creditLimit: 1_200_000_00, dueDays: 10 },
];

export const SEED_SUPPLIERS: Supplier[] = [
  { id: "s1", name: "San Miguel Poultry Supply", contact: "Liza Ramos", phone: "0917 300 2211", notes: "Delivers Mon/Thu. Net 15." },
  { id: "s2", name: "Cavite Fresh Farms", contact: "Ding Bautista", phone: "0928 441 9087", notes: "Best for large & jumbo. Net 7." },
  { id: "s3", name: "Bulacan Egg Center", contact: "Nena Cruz", phone: "0939 200 1145", notes: "Backup supplier, medium sizes." },
];

export const SEED_ACCOUNTS: Account[] = [
  { id: "acc-cash", name: "Cash drawer", kind: "cash", opening: 12_000_000_00 },
  { id: "acc-gcash", name: "GCash wallet", kind: "ewallet", opening: 2_500_000_00 },
  { id: "acc-maya", name: "Maya wallet", kind: "ewallet", opening: 800_000_00 },
  { id: "acc-bank", name: "BPI current account", kind: "bank", opening: 15_000_000_00 },
];

let n = 0;
const L = (productId: string, productName: string, qty: number, unitPrice: number, unitCost: number, discount = 0, discountType: DiscountType = "fixed"): OrderLine => ({
  id: `sl${++n}`,
  productId,
  productName,
  qty,
  unitPrice,
  discount,
  discountType,
  unitCost,
});

const P = (method: Payment["method"], amount: number, opts: Partial<Payment> = {}): Payment => ({
  id: `sp${++n}`,
  method,
  amount,
  verified: opts.verified ?? true,
  paidAt: opts.paidAt ?? "2026-10-22",
  reference: opts.reference,
  dueDate: opts.dueDate,
});

export const SEED_ORDERS: Order[] = [
  {
    id: "ORD-1042", createdAt: "2026-10-22T08:41:00", date: "2026-10-22", customerId: "c2", customerName: "Golden Spoon Bakeshop",
    source: "Repeat customer", fulfillment: "delivery", requestedDate: "2026-10-23",
    notes: "Deliver before 7 AM. Handle cases carefully.", deliveryFee: 0, orderDiscount: 0, orderDiscountType: "fixed",
    lines: [L("p-large", "Large Eggs", 10, 22_000, 18_800, 2_000), L("p-medium", "Medium Eggs", 5, 20_500, 17_500)],
    payments: [P("cash", 302_500)], status: "fulfilled", reservedCases: 0, stockDeducted: true,
  },
  {
    id: "ORD-1041", createdAt: "2026-10-22T09:05:00", date: "2026-10-22", customerId: null, customerName: "Walk-in Customer",
    source: "Walk-in", fulfillment: "pickup", deliveryFee: 0, orderDiscount: 0, orderDiscountType: "fixed",
    lines: [L("p-small", "Small Eggs", 3, 18_500, 16_000, 15, "percent"), L("p-jumbo", "Jumbo Eggs", 2, 24_000, 20_500)],
    payments: [P("gcash", 50_000, { reference: "GC-88213", verified: true })], status: "confirmed", reservedCases: 5, stockDeducted: false,
  },
  {
    id: "ORD-1040", createdAt: "2026-10-21T14:22:00", date: "2026-10-21", customerId: "c1", customerName: "Tita Nena Eatery",
    source: "Phone call", fulfillment: "delivery", requestedDate: "2026-10-24", deliveryFee: 30_000, orderDiscount: 0, orderDiscountType: "fixed",
    lines: [L("p-large", "Large Eggs", 15, 22_000, 18_800, 1_000), L("p-medium", "Medium Eggs", 10, 20_500, 17_500, 500)],
    payments: [P("credit", 515_300, { dueDate: "2026-11-04" })], status: "preparing", reservedCases: 25, stockDeducted: false,
  },
  {
    id: "ORD-1039", createdAt: "2026-10-20T10:12:00", date: "2026-10-20", customerId: "c5", customerName: "Hotel Aurora Dining",
    source: "Sales representative", sourceDetail: "Agent: Marco delos Reyes", fulfillment: "delivery", requestedDate: "2026-10-22",
    deliveryFee: 50_000, orderDiscount: 5, orderDiscountType: "percent",
    lines: [L("p-jumbo", "Jumbo Eggs", 20, 24_000, 20_500), L("p-large", "Large Eggs", 20, 22_000, 18_800, 500)],
    payments: [P("bank", 914_500, { reference: "BPI-773412", verified: true })], status: "fulfilled", reservedCases: 0, stockDeducted: true,
  },
  {
    id: "ORD-1038", createdAt: "2026-10-19T16:48:00", date: "2026-10-19", customerId: "c3", customerName: "Fiesta Mart QC",
    source: "Facebook", sourceDetail: "FB page: Egg Deals PH", fulfillment: "pickup", deliveryFee: 0, orderDiscount: 0, orderDiscountType: "fixed",
    lines: [L("p-mixed", "Mixed-size Eggs", 12, 19_500, 16_800, 500), L("p-small", "Small Eggs", 10, 18_500, 16_000, 1_000)],
    payments: [P("maya", 200_000, { reference: "MY-55102", verified: true }), P("credit", 203_000, { dueDate: "2026-10-26" })],
    status: "confirmed", reservedCases: 22, stockDeducted: false,
  },
  {
    id: "ORD-1037", createdAt: "2026-10-18T11:30:00", date: "2026-10-18", customerId: "c4", customerName: "Kusina ni Lola Carinderia",
    source: "Messenger", fulfillment: "delivery", requestedDate: "2026-10-19", notes: "Customer ordered through Messenger. Deliver tomorrow morning. Handle cases carefully.",
    deliveryFee: 20_000, orderDiscount: 0, orderDiscountType: "fixed",
    lines: [L("p-medium", "Medium Eggs", 8, 20_500, 17_500, 250)],
    payments: [P("credit", 182_000, { dueDate: "2026-10-28" })], status: "preparing", reservedCases: 8, stockDeducted: false,
  },
  {
    id: "ORD-1036", createdAt: "2026-10-18T09:15:00", date: "2026-10-18", customerId: "c6", customerName: "Marikina Sari-sari Coop",
    source: "Referral", sourceDetail: "Referred by Aling Rosa", fulfillment: "delivery", requestedDate: "2026-10-20",
    deliveryFee: 0, orderDiscount: 0, orderDiscountType: "fixed",
    lines: [L("p-large", "Large Eggs", 6, 22_000, 18_800), L("p-small", "Small Eggs", 6, 18_500, 16_000)],
    payments: [P("cash", 100_000), P("credit", 143_000, { dueDate: "2026-10-25" })], status: "preparing", reservedCases: 12, stockDeducted: false,
  },
  {
    id: "ORD-1035", createdAt: "2026-10-17T15:02:00", date: "2026-10-17", customerId: null, customerName: "Walk-in Customer",
    source: "Walk-in", fulfillment: "pickup", deliveryFee: 0, orderDiscount: 0, orderDiscountType: "fixed",
    lines: [L("p-jumbo", "Jumbo Eggs", 4, 24_000, 20_500)], payments: [], status: "cancelled", reservedCases: 0, stockDeducted: false,
  },
  {
    id: "ORD-1034", createdAt: "2026-10-16T08:20:00", date: "2026-10-16", customerId: "c1", customerName: "Tita Nena Eatery",
    source: "Repeat customer", fulfillment: "delivery", requestedDate: "2026-10-17", deliveryFee: 25_000, orderDiscount: 0, orderDiscountType: "fixed",
    lines: [L("p-large", "Large Eggs", 12, 22_000, 18_800, 2_000)],
    payments: [P("cash", 265_000)], status: "fulfilled", reservedCases: 0, stockDeducted: true,
  },
  {
    id: "ORD-1032", createdAt: "2026-10-05T13:40:00", date: "2026-10-05", customerId: "c4", customerName: "Kusina ni Lola Carinderia",
    source: "Phone call", fulfillment: "pickup", deliveryFee: 0, orderDiscount: 0, orderDiscountType: "fixed",
    lines: [L("p-medium", "Medium Eggs", 5, 20_500, 17_500)],
    payments: [P("cash", 50_000), P("credit", 52_500, { dueDate: "2026-10-12" })], status: "fulfilled", reservedCases: 0, stockDeducted: true,
  },
];

export const SEED_EXPENSES: Expense[] = [
  { id: "ex1", date: "2026-10-01", category: "Rent", amount: 3_500_000_00, method: "cash", payee: "Vera Realty Holdings", description: "Monthly warehouse rent" },
  { id: "ex2", date: "2026-10-02", category: "Utilities", amount: 980_000_00, method: "cash", payee: "Meralco / Maynilad", description: "Electricity and water" },
  { id: "ex3", date: "2026-10-05", category: "Wages", amount: 2_200_000_00, method: "cash", payee: "Payroll (4 staff)", description: "1st cutoff" },
  { id: "ex4", date: "2026-10-06", category: "Packaging", amount: 450_000_00, method: "cash", payee: "CartonKing Trading", description: "Trays and cartons" },
  { id: "ex5", date: "2026-10-08", category: "Transportation & delivery", amount: 120_000_00, method: "gcash", payee: "Fuel & tolls", description: "Two delivery runs" },
  { id: "ex6", date: "2026-10-10", category: "Bank & e-wallet fees", amount: 85_000_00, method: "bank", payee: "BPI & GCash", description: "Transfer and cash-in fees" },
  { id: "ex7", date: "2026-10-12", category: "Licenses & permits", amount: 500_000_00, method: "cash", payee: "Barangay & city hall", description: "Annual business permit" },
  { id: "ex8", date: "2026-10-15", category: "Marketing", amount: 300_000_00, method: "gcash", payee: "Facebook page boost", description: "Weekly promo post" },
  { id: "ex9", date: "2026-10-19", category: "Repairs & maintenance", amount: 150_000_00, method: "cash", payee: "CoolFix Services", description: "Walk-in chiller repair" },
  { id: "ex10", date: "2026-10-20", category: "Wages", amount: 2_200_000_00, method: "cash", payee: "Payroll (4 staff)", description: "2nd cutoff" },
  { id: "ex11", date: "2026-10-21", category: "Utilities", amount: 350_000_00, method: "maya", payee: "Converge", description: "Internet + store load" },
];

export const SEED_PURCHASES: PurchaseOrder[] = [
  {
    id: "PO-208", supplierId: "s2", date: "2026-10-19", expectedDate: "2026-10-20",
    items: [
      { productId: "p-large", qty: 60, cost: 18_800, accepted: 60 },
      { productId: "p-jumbo", qty: 20, cost: 20_500, accepted: 20 },
    ],
    deliveryCost: 150_000_00, status: "received", receivedDate: "2026-10-20", paidAmount: 0,
  },
  {
    id: "PO-207", supplierId: "s1", date: "2026-10-15", expectedDate: "2026-10-16",
    items: [
      { productId: "p-small", qty: 50, cost: 16_000, accepted: 50 },
      { productId: "p-mixed", qty: 30, cost: 16_800, accepted: 30 },
    ],
    deliveryCost: 100_000_00, status: "paid", receivedDate: "2026-10-16", paidAmount: 1_404_000_00,
  },
  {
    id: "PO-206", supplierId: "s3", date: "2026-10-12", expectedDate: "2026-10-13",
    items: [{ productId: "p-medium", qty: 40, cost: 17_500, accepted: 40 }],
    deliveryCost: 50_000_00, status: "received", receivedDate: "2026-10-13", paidAmount: 500_000_00,
  },
];

let c = 0;
const E = (date: string, accountId: string, direction: "in" | "out", amount: number, kind: CashEntry["kind"], description: string, toAccountId?: string): CashEntry => ({
  id: `ce${++c}`, date, accountId, toAccountId, direction, amount, kind, description,
});

export const SEED_CASH_ENTRIES: CashEntry[] = [
  E("2026-10-16", "acc-bank", "out", 1_404_000_00, "supplier_payment", "Payment to San Miguel Poultry Supply (PO-207)"),
  E("2026-10-13", "acc-bank", "out", 500_000_00, "supplier_payment", "Partial payment to Bulacan Egg Center (PO-206)"),
  E("2026-10-22", "acc-cash", "in", 302_500_00, "sale", "Cash payment for ORD-1042"),
  E("2026-10-22", "acc-gcash", "in", 50_000_00, "sale", "GCash payment for ORD-1041"),
  E("2026-10-20", "acc-bank", "in", 914_500_00, "sale", "Bank payment for ORD-1039"),
  E("2026-10-19", "acc-maya", "in", 200_000_00, "customer_payment", "Maya payment for ORD-1038"),
  E("2026-10-18", "acc-cash", "in", 100_000_00, "customer_payment", "Cash payment for ORD-1036"),
  E("2026-10-16", "acc-cash", "in", 265_000_00, "sale", "Cash payment for ORD-1034"),
  E("2026-10-05", "acc-cash", "in", 50_000_00, "customer_payment", "Cash payment for ORD-1032"),
  E("2026-10-01", "acc-cash", "out", 3_500_000_00, "expense", "Rent — Vera Realty Holdings"),
  E("2026-10-02", "acc-cash", "out", 980_000_00, "expense", "Utilities — Meralco / Maynilad"),
  E("2026-10-05", "acc-cash", "out", 2_200_000_00, "expense", "Wages — 1st cutoff"),
  E("2026-10-06", "acc-cash", "out", 450_000_00, "expense", "Packaging — CartonKing Trading"),
  E("2026-10-08", "acc-gcash", "out", 120_000_00, "expense", "Transportation — fuel & tolls"),
  E("2026-10-10", "acc-bank", "out", 85_000_00, "expense", "Bank & e-wallet fees"),
  E("2026-10-12", "acc-cash", "out", 500_000_00, "expense", "Licenses & permits"),
  E("2026-10-15", "acc-gcash", "out", 300_000_00, "expense", "Marketing — FB boost"),
  E("2026-10-19", "acc-cash", "out", 150_000_00, "expense", "Repairs — CoolFix Services"),
  E("2026-10-20", "acc-cash", "out", 2_200_000_00, "expense", "Wages — 2nd cutoff"),
  E("2026-10-21", "acc-maya", "out", 350_000_00, "expense", "Utilities — Converge"),
  E("2026-10-05", "acc-bank", "in", 5_000_000_00, "capital", "Owner capital top-up — M. Vic"),
  E("2026-10-10", "acc-cash", "out", 400_000_00, "withdrawal", "Owner withdrawal — groceries advance"),
];

export const SEED_AUDIT: AuditEntry[] = [
  { ts: "2026-10-21T14:25:00", action: "Price override", detail: "ORD-1040 · Large Eggs set to ₱210.00/case (default ₱220.00) by cashier" },
  { ts: "2026-10-20T09:02:00", action: "Stock adjustment", detail: "2 case(s) of Jumbo Eggs marked broken/spoiled" },
  { ts: "2026-10-19T16:50:00", action: "Discount applied", detail: "ORD-1038 · Mixed-size Eggs −₱5.00/case" },
];

export const SEED_SEQ = { order: 1043, purchase: 209 };
