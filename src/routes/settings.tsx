import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { fmtPeso, parsePeso } from "@/lib/money";
import { useStore } from "@/store/useStore";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Golden Nest Egg Depot" },
      {
        name: "description",
        content: "Store profile, POS behavior toggles, credit approval rules, and the audit trail.",
      },
      { property: "og:title", content: "Settings — Golden Nest Egg Depot" },
      { property: "og:description", content: "Configure POS behavior, credit rules, and review the audit trail." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const resetDemo = useStore((s) => s.resetDemo);
  const auditLog = useStore((s) => s.auditLog);

  const [name, setName] = useState(settings.storeName);
  const [address, setAddress] = useState(settings.address);
  const [phone, setPhone] = useState(settings.phone);
  const [approvalLimit, setApprovalLimit] = useState((settings.creditApprovalLimit / 100).toFixed(2));

  const saveApproval = () => {
    const v = parsePeso(approvalLimit);
    if (v === null) {
      toast.error("Enter a valid peso amount.");
      return;
    }
    updateSettings({ creditApprovalLimit: v });
    toast.success("Credit approval threshold updated");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div>
        <h1 className="text-lg font-bold tracking-tight">Settings</h1>
        <p className="text-xs text-muted-foreground">Store profile, POS behavior, and credit rules.</p>
      </div>

      <section className="rounded-xl border bg-card p-4 shadow-card">
        <h2 className="mb-3 text-sm font-bold">Store profile</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label className="text-xs">Store name</Label><Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => updateSettings({ storeName: name.trim() || settings.storeName })} /></div>
          <div><Label className="text-xs">Phone</Label><Input className="mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} onBlur={() => updateSettings({ phone })} /></div>
          <div className="sm:col-span-2"><Label className="text-xs">Address</Label><Input className="mt-1" value={address} onChange={(e) => setAddress(e.target.value)} onBlur={() => updateSettings({ address })} /></div>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-4 shadow-card">
        <h2 className="mb-3 text-sm font-bold">POS behavior</h2>
        <div className="space-y-3">
          <ToggleRow
            label="Separate lines on repeat clicks"
            hint="Off: clicking a product already in the order increases its quantity. On: each click creates a new line for different negotiated prices."
            checked={settings.separateLinesOnRepeat}
            onChange={(v) => updateSettings({ separateLinesOnRepeat: v })}
          />
          <ToggleRow
            label="Reserve stock on confirmed orders"
            hint="On: confirming an order reserves cases until fulfilled. Off: stock deducts immediately when the order is completed."
            checked={settings.reserveOnConfirm}
            onChange={(v) => updateSettings({ reserveOnConfirm: v })}
          />
          <ToggleRow
            label="Allow over-discount override"
            hint="Off: per-case discounts cannot exceed the unit price. On: authorized overrides are allowed and audited."
            checked={settings.allowOverDiscount}
            onChange={(v) => updateSettings({ allowOverDiscount: v })}
          />
        </div>
      </section>

      <section className="rounded-xl border bg-card p-4 shadow-card">
        <h2 className="mb-3 text-sm font-bold">Credit rules</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-48">
            <Label className="text-xs">Approval threshold (₱)</Label>
            <Input inputMode="decimal" className="mt-1 text-right tabular-nums" value={approvalLimit} onChange={(e) => setApprovalLimit(e.target.value)} />
          </div>
          <Button variant="outline" size="sm" onClick={saveApproval}>Save threshold</Button>
          <p className="text-[11px] text-muted-foreground">
            Credit sales above {fmtPeso(settings.creditApprovalLimit)} total after the order show an approval warning at checkout.
          </p>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-4 shadow-card">
        <h2 className="mb-3 text-sm font-bold">Audit trail</h2>
        <ul className="max-h-64 space-y-1.5 overflow-y-auto text-[12px]">
          {auditLog.slice(0, 20).map((a, i) => (
            <li key={i} className="flex gap-2 border-b border-border/50 pb-1.5">
              <span className="shrink-0 font-semibold">{new Date(a.ts).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              <span>
                <span className="font-semibold">{a.action}</span> — {a.detail}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <ClearDataSection />

      <section className="rounded-xl border border-destructive/30 bg-card p-4 shadow-card">
        <h2 className="mb-1 text-sm font-bold text-destructive">Prototype data</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Records are stored locally in this browser, so refreshing keeps your changes. Resetting restores the original sample data.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="border-destructive/40 text-destructive hover:bg-destructive/10">
              <RotateCcw className="mr-1.5 size-3.5" /> Reset demo data
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset all prototype data?</AlertDialogTitle>
              <AlertDialogDescription>
                Orders, payments, stock, expenses, and cash entries return to the original sample state. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  resetDemo();
                  toast.success("Prototype data reset to the original sample data");
                }}
              >
                Reset everything
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </div>
  );
}

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-[13px] font-semibold">{label}</div>
        <div className="text-[11px] text-muted-foreground">{hint}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

const CLEAR_ITEMS = [
  { key: "orders", label: "Orders", title: "Delete all orders?", description: "Every order and its payments are removed, and reserved cases are released. Product stock levels and cash flow records are not changed." },
  { key: "purchases", label: "Purchases", title: "Delete all purchase orders?", description: "Every purchase order record is removed. Product stock levels and supplier payments in cash flow are not changed." },
  { key: "customers", label: "Customers", title: "Delete all customer accounts?", description: "Every customer and their credit terms are removed. The current order switches back to Walk-in Customer." },
  { key: "expenses", label: "Expenses", title: "Delete all expenses?", description: "Every expense record is removed, along with the cash flow entries they created." },
  { key: "cashflow", label: "Cash flow", title: "Delete all cash flow records?", description: "Every cash entry is removed and each account returns to its opening balance. Orders, expenses, and purchases are not changed." },
] as const;

function ClearDataSection() {
  const clearOrders = useStore((s) => s.clearOrders);
  const clearPurchases = useStore((s) => s.clearPurchases);
  const clearCustomers = useStore((s) => s.clearCustomers);
  const clearExpenses = useStore((s) => s.clearExpenses);
  const clearCashFlow = useStore((s) => s.clearCashFlow);
  const clearAllData = useStore((s) => s.clearAllData);
  const orders = useStore((s) => s.orders.length);
  const purchases = useStore((s) => s.purchases.length);
  const customers = useStore((s) => s.customers.length);
  const expenses = useStore((s) => s.expenses.length);
  const cashEntries = useStore((s) => s.cashEntries.length);
  const counts: Record<(typeof CLEAR_ITEMS)[number]["key"], number | null> = {
    orders,
    purchases,
    customers,
    expenses,
    cashflow: cashEntries,
  };
  const actions: Record<(typeof CLEAR_ITEMS)[number]["key"], () => void> = {
    orders: clearOrders,
    purchases: clearPurchases,
    customers: clearCustomers,
    expenses: clearExpenses,
    cashflow: clearCashFlow,
  };
  const total = orders + purchases + customers + expenses + cashEntries;

  return (
    <section className="rounded-xl border bg-card p-4 shadow-card">
      <h2 className="mb-1 text-sm font-bold">Clear data</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Delete records one area at a time. Products, suppliers, and store settings are always kept.
      </p>
      <div className="flex flex-wrap gap-2">
        {CLEAR_ITEMS.map((item) => (
          <ClearButton
            key={item.key}
            label={`Clear ${item.label.toLowerCase()}`}
            count={counts[item.key]}
            title={item.title}
            description={item.description}
            onConfirm={() => {
              actions[item.key]();
              toast.success(`All ${item.label.toLowerCase()} deleted`);
            }}
          />
        ))}
      </div>
      <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
        <div className="text-[13px] font-semibold text-destructive">Clear everything</div>
        <div className="mb-2.5 text-[11px] text-muted-foreground">
          Deletes all orders, purchases, customers, expenses, and cash flow records ({total} record{total === 1 ? "" : "s"} right now), and empties the audit trail. Products, suppliers, and settings are kept.
        </div>
        <ClearButton
          label="Clear everything"
          destructive
          title="Clear all business data?"
          description="All orders, purchases, customers, expenses, and cash flow records are deleted, and the audit trail is emptied. This cannot be undone. Products, suppliers, and store settings are kept."
          onConfirm={() => {
            clearAllData();
            toast.success("All business data cleared — products, suppliers, and settings kept");
          }}
        />
      </div>
    </section>
  );
}

function ClearButton({ label, count, title, description, onConfirm, destructive }: {
  label: string;
  count?: number | null;
  title: string;
  description: string;
  onConfirm: () => void;
  destructive?: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={destructive ? "border-destructive/40 text-destructive hover:bg-destructive/10" : undefined}
        >
          <Trash2 className="mr-1.5 size-3.5" />
          {label}
          {typeof count === "number" ? <span className="ml-1 text-muted-foreground">({count})</span> : null}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description} This cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
            onClick={onConfirm}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
