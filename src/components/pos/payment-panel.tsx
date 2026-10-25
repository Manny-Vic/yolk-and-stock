import { useMemo, useState } from "react";
import {
  Banknote,
  HandCoins,
  Landmark,
  Layers,
  Smartphone,
  Wallet,
  AlertTriangle,
  Trash2,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

import { ToneBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { customerStats } from "@/lib/derive";
import { calcOrder } from "@/lib/calc";
import { addDaysISO, fmtPeso, parsePeso, todayISO } from "@/lib/money";
import type { PaymentMethod } from "@/lib/types";
import { useStore, type NewPayment } from "@/store/useStore";
import { cn } from "@/lib/utils";

type PayMode = Exclude<PaymentMethod, "credit"> | "credit" | "split";

const MODES: { id: PayMode; label: string; icon: typeof Banknote }[] = [
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "gcash", label: "GCash", icon: Smartphone },
  { id: "maya", label: "Maya", icon: Wallet },
  { id: "bank", label: "Bank", icon: Landmark },
  { id: "credit", label: "Credit", icon: HandCoins },
  { id: "split", label: "Split", icon: Layers },
];

interface SplitRow {
  id: string;
  method: Exclude<PaymentMethod, "credit">;
  amount: string;
  ref: string;
}

export function PaymentPanel({ onCompleted }: { onCompleted: (orderId: string) => void }) {
  const cart = useStore((s) => s.cart);
  const products = useStore((s) => s.products);
  const customers = useStore((s) => s.customers);
  const orders = useStore((s) => s.orders);
  const settings = useStore((s) => s.settings);
  const completeOrder = useStore((s) => s.completeOrder);

  const totals = useMemo(() => calcOrder(cart), [cart]);
  const reserve = settings.reserveOnConfirm;

  const [mode, setMode] = useState<PayMode>("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [partialAmount, setPartialAmount] = useState("");
  const [reference, setReference] = useState("");
  const [verified, setVerified] = useState(true);
  const [splitRows, setSplitRows] = useState<SplitRow[]>([
    { id: "r1", method: "cash", amount: "", ref: "" },
  ]);

  const customer = customers.find((c) => c.id === cart.customerId);
  const customerStatsRow = customer ? customerStats(customer, orders) : null;

  const stockWarnings = cart.lines
    .filter((l) => {
      const p = products.find((x) => x.id === l.productId);
      if (!p) return false;
      const available = Math.max(0, reserve ? p.cases - p.reserved : p.cases);
      return l.qty > available;
    })
    .map((l) => l.productName);

  const received = cashReceived === "" ? totals.total : parsePeso(cashReceived) ?? 0;
  const change = Math.max(0, received - totals.total);
  const cashApplied = Math.min(Math.max(0, received), totals.total);

  const splitAllocated = splitRows.reduce((s, r) => s + (parsePeso(r.amount) ?? 0), 0);

  const dueDate = customer ? addDaysISO(todayISO(), customer.dueDays) : addDaysISO(todayISO(), 14);

  const buildPayments = (): NewPayment[] => {
    if (mode === "cash") {
      if (cashApplied <= 0) throw new Error("Enter the amount received.");
      return [{ method: "cash", amount: cashApplied }];
    }
    if (mode === "split") {
      const payments = splitRows
        .map((r) => ({
          method: r.method,
          amount: parsePeso(r.amount) ?? 0,
          reference: r.ref || undefined,
          verified: true,
        }))
        .filter((p) => p.amount > 0);
      if (!payments.length) throw new Error("Add at least one split payment with an amount.");
      const sum = payments.reduce((s, p) => s + p.amount, 0);
      if (sum > totals.total) throw new Error("Split payments exceed the order amount.");
      return payments;
    }
    const amount = partialAmount === "" ? totals.total : parsePeso(partialAmount) ?? 0;
    if (amount <= 0) throw new Error("Enter a payment amount greater than zero.");
    if (amount > totals.total) throw new Error("Payment cannot exceed the order amount.");
    if ((mode === "gcash" || mode === "maya" || mode === "bank") && !verified) {
      toast.message("Recorded as unverified", { description: "You can verify the payment later in the order details." });
    }
    if (mode === "credit") {
      if (!customer) throw new Error("Credit sales require a customer account — pick one in Order details.");
    }
    return [
      {
        method: mode,
        amount,
        reference: reference || undefined,
        verified: mode === "credit" ? true : verified,
      },
    ];
  };

  const onComplete = () => {
    try {
      const payments = buildPayments();
      const id = completeOrder(payments);
      toast.success(`Order ${id} confirmed`, { description: `${totals.cases} cases · ${fmtPeso(totals.total)}` });
      setMode("cash");
      setCashReceived("");
      setPartialAmount("");
      setReference("");
      setSplitRows([{ id: "r1", method: "cash", amount: "", ref: "" }]);
      onCompleted(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not complete the order.");
    }
  };

  const canComplete = cart.lines.length > 0 && stockWarnings.length === 0;

  const creditNewOutstanding = (customerStatsRow?.outstanding ?? 0) + totals.total;

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {/* Summary */}
        <div className="rounded-xl border bg-card p-3 shadow-card">
          <div className="space-y-1 text-[13px]">
            <Row label={`Total cases (${totals.lineCount} line${totals.lineCount === 1 ? "" : "s"})`} value={String(totals.cases)} />
            <Row label="Gross amount" value={fmtPeso(totals.gross)} />
            {totals.lineDiscounts > 0 ? <Row label="Line-item discounts" value={`−${fmtPeso(totals.lineDiscounts)}`} tone="primary" /> : null}
            {totals.orderDiscount > 0 ? <Row label="Order discount" value={`−${fmtPeso(totals.orderDiscount)}`} tone="primary" /> : null}
            {totals.deliveryFee > 0 ? <Row label="Delivery fee" value={fmtPeso(totals.deliveryFee)} /> : null}
          </div>
          <div className="mt-2 flex items-end justify-between border-t pt-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Amount due</span>
            <span className="text-2xl font-extrabold tabular-nums text-primary">{fmtPeso(totals.total)}</span>
          </div>
        </div>

        {stockWarnings.length > 0 ? (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-[12px] text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>Not enough stock for: {stockWarnings.join(", ")}. Reduce quantities or receive a purchase first.</span>
          </div>
        ) : null}

        {/* Payment mode */}
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payment</Label>
          <div className="mt-1.5 grid grid-cols-3 gap-1.5">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-[11px] font-semibold transition-colors",
                  mode === m.id ? "border-primary bg-primary/10 text-primary" : "bg-card hover:bg-accent",
                )}
              >
                <m.icon className="size-4" />
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {mode === "cash" ? (
          <div className="space-y-2 rounded-lg border bg-card p-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">Amount received</Label>
              <Input
                inputMode="decimal"
                placeholder={(totals.total / 100).toFixed(2)}
                className="h-8 w-28 text-right tabular-nums"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
              />
            </div>
            {received >= totals.total && totals.total > 0 ? (
              <div className="flex items-center justify-between rounded-md bg-primary/10 px-2 py-1.5 text-[12px] font-semibold text-primary">
                <span>Change due</span>
                <span className="tabular-nums">{fmtPeso(change)}</span>
              </div>
            ) : received > 0 ? (
              <div className="flex items-center justify-between rounded-md bg-warning/15 px-2 py-1.5 text-[12px] font-semibold text-warning-foreground">
                <span>Deposit — balance left</span>
                <span className="tabular-nums">{fmtPeso(totals.total - cashApplied)}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        {mode === "gcash" || mode === "maya" || mode === "bank" ? (
          <div className="space-y-2 rounded-lg border bg-card p-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">Amount (blank = full {fmtPeso(totals.total)})</Label>
              <Input
                inputMode="decimal"
                placeholder={(totals.total / 100).toFixed(2)}
                className="h-8 w-28 text-right tabular-nums"
                value={partialAmount}
                onChange={(e) => setPartialAmount(e.target.value)}
              />
            </div>
            <Input
              placeholder="Reference number"
              className="h-8"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
            <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <Checkbox checked={verified} onCheckedChange={(v) => setVerified(v === true)} />
              Payment verified
            </label>
          </div>
        ) : null}

        {mode === "credit" ? (
          <div className="space-y-2 rounded-lg border bg-card p-3">
            {!customer ? (
              <p className="text-[12px] text-destructive">No customer selected — pick one in Order details below to sell on credit.</p>
            ) : (
              <>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground">Due date ({customer.dueDays}-day terms)</span>
                  <span className="font-semibold">{dueDate}</span>
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground">Outstanding now</span>
                  <span className="font-semibold tabular-nums">{fmtPeso(customerStatsRow?.outstanding ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground">After this order</span>
                  <span className={cn("font-bold tabular-nums", creditNewOutstanding > customer.creditLimit && "text-destructive")}>
                    {fmtPeso(creditNewOutstanding)}
                    <span className="ml-1 font-normal text-muted-foreground">/ {fmtPeso(customer.creditLimit)} limit</span>
                  </span>
                </div>
                {creditNewOutstanding > customer.creditLimit ? (
                  <p className="text-[11px] font-semibold text-destructive">Exceeds the credit limit — needs owner approval.</p>
                ) : creditNewOutstanding > settings.creditApprovalLimit ? (
                  <ToneBadge tone="warning">Above approval threshold</ToneBadge>
                ) : null}
              </>
            )}
          </div>
        ) : null}

        {mode === "split" ? (
          <div className="space-y-2 rounded-lg border bg-card p-3">
            {splitRows.map((r, i) => (
              <div key={r.id} className="flex items-center gap-1.5">
                <Select
                  value={r.method}
                  onValueChange={(v) => setSplitRows((rows) => rows.map((x) => (x.id === r.id ? { ...x, method: v as SplitRow["method"] } : x)))}
                >
                  <SelectTrigger className="h-8 w-28 shrink-0"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="gcash">GCash</SelectItem>
                    <SelectItem value="maya">Maya</SelectItem>
                    <SelectItem value="bank">Bank</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  inputMode="decimal"
                  placeholder="Amount"
                  className="h-8 text-right tabular-nums"
                  value={r.amount}
                  onChange={(e) => setSplitRows((rows) => rows.map((x) => (x.id === r.id ? { ...x, amount: e.target.value } : x)))}
                />
                <Input
                  placeholder={i === 0 ? "Ref (optional)" : "Ref"}
                  className="h-8 w-24"
                  value={r.ref}
                  onChange={(e) => setSplitRows((rows) => rows.map((x) => (x.id === r.id ? { ...x, ref: e.target.value } : x)))}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label="Remove split payment"
                  onClick={() => setSplitRows((rows) => rows.filter((x) => x.id !== r.id))}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-full"
              onClick={() => setSplitRows((rows) => [...rows, { id: `r${Date.now()}`, method: "cash", amount: "", ref: "" }])}
            >
              <Plus className="mr-1 size-3.5" /> Add payment
            </Button>
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-muted-foreground">Allocated</span>
              <span className="font-semibold tabular-nums">{fmtPeso(splitAllocated)} / {fmtPeso(totals.total)}</span>
            </div>
            {splitAllocated > totals.total ? (
              <p className="text-[11px] font-semibold text-destructive">Allocated amount exceeds the order total.</p>
            ) : totals.total - splitAllocated > 0 ? (
              <div className="flex items-center justify-between rounded-md bg-warning/15 px-2 py-1.5 text-[12px] font-semibold text-warning-foreground">
                <span>Unpaid balance</span>
                <span className="tabular-nums">{fmtPeso(totals.total - splitAllocated)}</span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="border-t bg-card/70 p-3 backdrop-blur">
        <Button
          size="lg"
          className="h-12 w-full text-base font-bold shadow-card"
          disabled={!canComplete}
          onClick={onComplete}
        >
          Confirm Order · {fmtPeso(totals.total)}
        </Button>
        {!canComplete && stockWarnings.length === 0 ? (
          <p className="mt-1.5 text-center text-[11px] text-muted-foreground">Add products to the order first.</p>
        ) : null}
      </div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "primary" }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-semibold tabular-nums", tone === "primary" && "text-primary")}>{value}</span>
    </div>
  );
}
