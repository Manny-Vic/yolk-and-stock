import { CheckCircle2, Printer, Send } from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { FULFILLMENT_LABELS, calcOrder, perCaseDiscountCents } from "@/lib/calc";
import { fmtDate, fmtPeso } from "@/lib/money";
import { printHtml } from "@/lib/print";
import type { Order, Settings } from "@/lib/types";
import { METHOD_LABEL, useStore } from "@/store/useStore";

export function receiptHtml(order: Order, settings: Settings): string {
  const t = calcOrder(order);
  const lineRows = order.lines
    .map((l) => {
      const perCase = perCaseDiscountCents(l);
      const disc = l.discount > 0 ? (l.discountType === "percent" ? `−${l.discount}%` : `−${fmtPeso(l.discount)}`) : "—";
      return `<tr><td>${l.productName}<br><span class="muted">${l.qty} × ${fmtPeso(l.unitPrice)} ${disc === "—" ? "" : `· ${disc}`}</span></td><td class="num">${fmtPeso(l.qty * (l.unitPrice - perCase))}</td></tr>`;
    })
    .join("");
  const payRows = order.payments
    .map(
      (p) =>
        `<tr><td>${METHOD_LABEL[p.method]}${p.reference ? `<br><span class="muted">Ref ${p.reference}${p.verified ? " · verified" : " · unverified"}</span>` : ""}${p.dueDate ? `<br><span class="muted">Due ${fmtDate(p.dueDate)}</span>` : ""}</td><td class="num">${fmtPeso(p.amount)}</td></tr>`,
    )
    .join("");
  return `
  <h1>${settings.storeName}</h1>
  <div class="muted">${settings.address} · ${settings.phone}</div>
  <div class="section"><b>Order</b>${order.id} · ${fmtDate(order.date)} · ${FULFILLMENT_LABELS[order.status]}</div>
  <div class="section"><b>Customer</b>${order.customerName}${order.customerId ? "" : " (walk-in)"} · Source: ${order.source}${order.sourceDetail ? ` (${order.sourceDetail})` : ""}${order.staffName ? ` · Cashier: ${order.staffName}` : ""}</div>
  <table><thead><tr><th>Product</th><th class="num">Amount</th></tr></thead><tbody>
    ${lineRows}
    ${order.orderDiscount > 0 ? `<tr><td>Order discount (${order.orderDiscountType === "percent" ? `${order.orderDiscount}%` : ""})</td><td class="num">−${fmtPeso(t.orderDiscount)}</td></tr>` : ""}
    ${order.deliveryFee > 0 ? `<tr><td>Delivery fee</td><td class="num">${fmtPeso(order.deliveryFee)}</td></tr>` : ""}
    <tr class="total"><td>Amount due</td><td class="num">${fmtPeso(t.total)}</td></tr>
  </tbody></table>
  ${payRows ? `<table><thead><tr><th>Payments</th><th class="num">Amount</th></tr></thead><tbody>${payRows}<tr class="total"><td>Balance</td><td class="num">${fmtPeso(t.balance)}</td></tr></tbody></table>` : ""}
  ${order.notes ? `<div class="section"><b>Notes</b>${order.notes}</div>` : ""}
  ${order.staffNotes ? `<div class="section"><b>Staff notes</b>${order.staffNotes}</div>` : ""}
  <div class="section muted">Fulfillment: ${order.fulfillment === "delivery" ? "Delivery" : "Store pickup"}${order.requestedDate ? ` · Requested ${fmtDate(order.requestedDate)}` : ""}</div>`;
}

export function ReceiptDialog({ order, open, onOpenChange }: { order: Order | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const settings = useStore((s) => s.settings);
  if (!order) return null;
  const t = calcOrder(order);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-primary" />
            Order {order.id} confirmed
          </DialogTitle>
          <DialogDescription>
            {order.customerName} · {fmtDate(order.date)} · <StatusBadge status={order.status} />
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="rounded-lg border bg-secondary/40 p-3">
            <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{settings.storeName}</div>
            <div className="text-[11px] text-muted-foreground">{settings.address} · {settings.phone}</div>
          </div>

          <table className="w-full text-[13px]">
            <tbody>
              {order.lines.map((l) => {
                const perCase = perCaseDiscountCents(l);
                const disc = l.discount > 0 ? (l.discountType === "percent" ? `−${l.discount}%/case` : `−${fmtPeso(l.discount)}/case`) : null;
                return (
                  <tr key={l.id} className="border-b border-border/60">
                    <td className="py-1.5">
                      <div className="font-semibold">{l.productName}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {l.qty} cases × {fmtPeso(l.unitPrice)}
                        {disc ? ` ${disc}` : ""} = {fmtPeso(l.unitPrice - perCase)}/case
                      </div>
                    </td>
                    <td className="py-1.5 text-right font-semibold tabular-nums">{fmtPeso(l.qty * (l.unitPrice - perCase))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="space-y-1 text-[13px]">
            <SumRow label="Gross" value={fmtPeso(t.gross)} />
            {t.lineDiscounts > 0 ? <SumRow label="Line discounts" value={`−${fmtPeso(t.lineDiscounts)}`} /> : null}
            {t.orderDiscount > 0 ? <SumRow label={`Order discount${order.orderDiscountType === "percent" ? ` (${order.orderDiscount}%)` : ""}`} value={`−${fmtPeso(t.orderDiscount)}`} /> : null}
            {t.deliveryFee > 0 ? <SumRow label="Delivery fee" value={fmtPeso(t.deliveryFee)} /> : null}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Amount due</span>
            <span className="text-xl font-extrabold tabular-nums text-primary">{fmtPeso(t.total)}</span>
          </div>

          <Separator />

          <div>
            <div className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Payments received</div>
            {order.payments.length ? (
              <div className="space-y-1">
                {order.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-[13px]">
                    <span>
                      {METHOD_LABEL[p.method]}
                      {p.reference ? <span className="ml-1 text-[11px] text-muted-foreground">Ref {p.reference}{p.verified ? " · verified" : " · unverified"}</span> : null}
                      {p.dueDate ? <span className="ml-1 text-[11px] text-muted-foreground">Due {fmtDate(p.dueDate)}</span> : null}
                    </span>
                    <span className="font-semibold tabular-nums">{fmtPeso(p.amount)}</span>
                  </div>
                ))}
                {t.balance > 0 ? (
                  <div className="mt-1 flex items-center justify-between rounded-md bg-warning/15 px-2 py-1.5 text-[12px] font-bold text-warning-foreground">
                    <span>Remaining balance</span>
                    <span className="tabular-nums">{fmtPeso(t.balance)}</span>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-[12px] text-muted-foreground">No payments recorded.</p>
            )}
          </div>

          <div className="grid gap-1 text-[12px] text-muted-foreground">
            <div>Source: <span className="font-semibold text-foreground">{order.source}{order.sourceDetail ? ` — ${order.sourceDetail}` : ""}</span></div>
            {order.staffName ? <div>Cashier: <span className="font-semibold text-foreground">{order.staffName}</span></div> : null}
            <div>Fulfillment: <span className="font-semibold text-foreground">{order.fulfillment === "delivery" ? "Delivery" : "Store pickup"}{order.requestedDate ? ` · ${fmtDate(order.requestedDate)}` : ""}</span></div>
            {order.notes ? <div>Notes: {order.notes}</div> : null}
            {order.staffNotes ? <div>Staff notes: {order.staffNotes}</div> : null}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => printHtml(`Receipt ${order.id}`, receiptHtml(order, settings))}>
              <Printer className="mr-1.5 size-4" /> Print receipt
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success("Digital receipt sent", { description: `A copy of ${order.id} was sent to ${order.customerName}.` })}
            >
              <Send className="mr-1.5 size-4" /> Send digital receipt
            </Button>
            <Button size="sm" onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


function SumRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}
