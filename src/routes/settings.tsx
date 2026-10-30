import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RotateCcw } from "lucide-react";
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
