import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileText, Pencil, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { ToneBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { calcOrder, paymentStatus } from "@/lib/calc";
import { creditAging, customerStats } from "@/lib/derive";
import { fmtDate, fmtPeso, parsePeso, todayISO } from "@/lib/money";
import { printHtml } from "@/lib/print";
import type { Customer } from "@/lib/types";
import { METHOD_LABEL, useStore } from "@/store/useStore";

export const Route = createFileRoute("/_authenticated/customers")({
  head: () => ({
    meta: [
      { title: "Customers & Credit — Golden Nest Egg Depot" },
      {
        name: "description",
        content: "Customer credit ledger: limits, outstanding and overdue balances, purchase history, and printable statements.",
      },
      { property: "og:title", content: "Customers & Credit — Golden Nest Egg Depot" },
      { property: "og:description", content: "Track utang: credit limits, receivables, aging, and payment history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CustomersPage,
});

function CustomersPage() {
  const customers = useStore((s) => s.customers);
  const orders = useStore((s) => s.orders);
  const addCustomer = useStore((s) => s.addCustomer);
  const updateCustomer = useStore((s) => s.updateCustomer);

  const [addOpen, setAddOpen] = useState(false);
  const [editFor, setEditFor] = useState<Customer | null>(null);
  const [viewFor, setViewFor] = useState<Customer | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [limit, setLimit] = useState("");
  const [dueDays, setDueDays] = useState("14");

  const aging = creditAging(orders, customers);
  const totalReceivable = aging.buckets.current + aging.buckets.d1_30 + aging.buckets.d31_60 + aging.buckets.d60plus;

  const submitAdd = () => {
    const lim = parsePeso(limit);
    const days = parseInt(dueDays, 10);
    if (!name.trim() || lim === null || !Number.isFinite(days) || days <= 0) {
      toast.error("Fill in name, credit limit, and due days.");
      return;
    }
    addCustomer({ name: name.trim(), phone: phone || undefined, creditLimit: lim, dueDays: days });
    toast.success(`${name.trim()} added`);
    setAddOpen(false);
    setName("");
    setPhone("");
    setLimit("");
  };

  const submitEdit = () => {
    if (!editFor) return;
    const lim = parsePeso(limit);
    const days = parseInt(dueDays, 10);
    if (lim === null || !Number.isFinite(days) || days <= 0) {
      toast.error("Enter a valid credit limit and terms.");
      return;
    }
    updateCustomer(editFor.id, { creditLimit: lim, dueDays: days, phone: phone || undefined });
    toast.success(`${editFor.name} updated`);
    setEditFor(null);
  };

  const openEdit = (c: Customer) => {
    setEditFor(c);
    setName(c.name);
    setPhone(c.phone ?? "");
    setLimit((c.creditLimit / 100).toFixed(2));
    setDueDays(String(c.dueDays));
  };

  const printStatement = (c: Customer) => {
    const stats = customerStats(c, orders);
    const mine = orders
      .filter((o) => o.customerId === c.id && o.status !== "cancelled" && o.status !== "draft")
      .sort((a, b) => (a.date < b.date ? 1 : -1));
    const orderRows = mine
      .map((o) => {
        const t = calcOrder(o);
        const pay = paymentStatus(o);
        return `<tr><td>${o.id}<br><span class="muted">${fmtDate(o.date)} · ${t.cases} cases · ${pay.overdue ? "OVERDUE" : pay.status.replace("_", " ")}</span></td><td class="num">${fmtPeso(t.total)}</td><td class="num">${fmtPeso(t.paid)}</td><td class="num">${fmtPeso(t.balance)}</td></tr>`;
      })
      .join("");
    const paymentRows = mine
      .flatMap((o) => o.payments.map((p) => ({ o, p })))
      .map(
        ({ o, p }) =>
          `<tr><td>${o.id}<br><span class="muted">${fmtDate(p.paidAt)} · ${METHOD_LABEL[p.method]}${p.reference ? ` · ${p.reference}` : ""}</span></td><td class="num">${fmtPeso(p.amount)}</td></tr>`,
      )
      .join("");
    printHtml(`Statement — ${c.name}`, `
      <h1>Statement of account</h1>
      <div class="muted">${c.name}${c.phone ? ` · ${c.phone}` : ""} · Generated ${fmtDate(todayISO())}</div>
      <div class="section"><b>Summary</b>
        Credit limit ${fmtPeso(c.creditLimit)} · Outstanding ${fmtPeso(stats.outstanding)} · Overdue ${fmtPeso(stats.overdue)} · Lifetime purchases ${fmtPeso(stats.lifetime)}
      </div>
      <table><thead><tr><th>Order</th><th class="num">Total</th><th class="num">Paid</th><th class="num">Balance</th></tr></thead><tbody>${orderRows}</tbody></table>
      <table><thead><tr><th>Payments</th><th class="num">Amount</th></tr></thead><tbody>${paymentRows}</tbody></table>
    `);
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Customers & Credit</h1>
          <p className="text-xs text-muted-foreground">
            Receivables come from unpaid order balances — payments reduce them without recording a second sale.
          </p>
        </div>
        <Button size="sm" onClick={() => { setAddOpen(true); setName(""); setPhone(""); setLimit(""); setDueDays("14"); }}>
          <UserPlus className="mr-1.5 size-3.5" /> Add customer
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <AgingCard label="Total receivable" value={fmtPeso(totalReceivable)} />
        <AgingCard label="Current" value={fmtPeso(aging.buckets.current)} />
        <AgingCard label="1–30 days late" value={fmtPeso(aging.buckets.d1_30)} tone={aging.buckets.d1_30 > 0} />
        <AgingCard label="31–60 days late" value={fmtPeso(aging.buckets.d31_60)} tone={aging.buckets.d31_60 > 0} />
        <AgingCard label="60+ days late" value={fmtPeso(aging.buckets.d60plus)} tone={aging.buckets.d60plus > 0} />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Customer</TableHead>
              <TableHead className="text-right">Credit limit</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead className="text-right">Overdue</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead className="text-right">Lifetime sales</TableHead>
              <TableHead>Last order</TableHead>
              <TableHead className="pr-3 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((c) => {
              const stats = customerStats(c, orders);
              return (
                <TableRow key={c.id}>
                  <TableCell className="pl-4">
                    <button className="text-left" onClick={() => setViewFor(c)}>
                      <div className="font-semibold hover:text-primary">{c.name}</div>
                      <div className="text-[11px] text-muted-foreground">{c.phone ?? "—"} · {c.dueDays}-day terms</div>
                    </button>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{fmtPeso(c.creditLimit)}</TableCell>
                  <TableCell className="text-right font-bold tabular-nums">{fmtPeso(stats.outstanding)}</TableCell>
                  <TableCell className={`text-right tabular-nums ${stats.overdue > 0 ? "font-semibold text-destructive" : ""}`}>
                    {fmtPeso(stats.overdue)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{stats.ordersCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtPeso(stats.lifetime)}</TableCell>
                  <TableCell className="whitespace-nowrap text-[12px]">{stats.lastOrderDate ? fmtDate(stats.lastOrderDate) : "—"}</TableCell>
                  <TableCell className="pr-3">
                    <div className="flex justify-end gap-1">
                      {stats.overLimit ? <ToneBadge tone="destructive">Over limit</ToneBadge> : null}
                      <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={() => printStatement(c)}>
                        <FileText className="mr-1 size-3" /> Statement
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={() => openEdit(c)}>
                        <Pencil className="mr-1 size-3" /> Edit
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Add customer */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add customer</DialogTitle>
            <DialogDescription>Set their credit limit and payment terms.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Name</Label><Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label className="text-xs">Phone</Label><Input className="mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Credit limit (₱)</Label><Input inputMode="decimal" className="mt-1 text-right tabular-nums" value={limit} onChange={(e) => setLimit(e.target.value)} /></div>
              <div><Label className="text-xs">Terms (days)</Label><Input inputMode="numeric" className="mt-1" value={dueDays} onChange={(e) => setDueDays(e.target.value)} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={submitAdd}>Add customer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit customer */}
      <Dialog open={!!editFor} onOpenChange={(v) => !v && setEditFor(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit {editFor?.name}</DialogTitle>
            <DialogDescription>Credit approval rules apply at checkout.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Phone</Label><Input className="mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Credit limit (₱)</Label><Input inputMode="decimal" className="mt-1 text-right tabular-nums" value={limit} onChange={(e) => setLimit(e.target.value)} /></div>
              <div><Label className="text-xs">Terms (days)</Label><Input inputMode="numeric" className="mt-1" value={dueDays} onChange={(e) => setDueDays(e.target.value)} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditFor(null)}>Cancel</Button>
            <Button onClick={submitEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View customer */}
      <Dialog open={!!viewFor} onOpenChange={(v) => !v && setViewFor(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewFor?.name}</DialogTitle>
            <DialogDescription>
              Limit {viewFor ? fmtPeso(viewFor.creditLimit) : ""} · Outstanding {viewFor ? fmtPeso(customerStats(viewFor, orders).outstanding) : ""}
            </DialogDescription>
          </DialogHeader>
          {viewFor ? (
            <div className="space-y-2 text-[13px]">
              {orders
                .filter((o) => o.customerId === viewFor.id)
                .slice(0, 8)
                .map((o) => {
                  const t = calcOrder(o);
                  return (
                    <div key={o.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                      <div>
                        <span className="font-semibold">{o.id}</span>
                        <span className="ml-2 text-[11px] text-muted-foreground">{fmtDate(o.date)} · {t.cases} cases</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold tabular-nums">{fmtPeso(t.total)}</span>
                        {t.balance > 0 ? <span className="block text-[11px] text-warning-foreground">Balance {fmtPeso(t.balance)}</span> : null}
                      </div>
                    </div>
                  );
                })}
              {!orders.some((o) => o.customerId === viewFor.id) ? (
                <p className="text-xs text-muted-foreground">No orders yet for this customer.</p>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AgingCard({ label, value, tone }: { label: string; value: string; tone?: boolean }) {
  return (
    <div className="rounded-xl border bg-card p-3 shadow-card">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-lg font-extrabold tabular-nums ${tone ? "text-destructive" : ""}`}>{value}</div>
    </div>
  );
}
