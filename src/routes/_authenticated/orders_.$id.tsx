import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Ban, CheckCircle2, PackageCheck, Pencil, Printer, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";

import { PaymentBadge, StatusBadge } from "@/components/shared/status-badge";
import { receiptHtml } from "@/components/pos/receipt";
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
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FULFILLMENT_LABELS, calcOrder, calcProfit, fmtMargin, perCaseDiscountCents } from "@/lib/calc";
import { fmtDate, fmtPeso } from "@/lib/money";
import { printHtml } from "@/lib/print";
import type { FulfillmentStatus } from "@/lib/types";
import { METHOD_LABEL, useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/orders_/$id")({
  head: () => ({
    meta: [
      { title: "Order details — Golden Nest Egg Depot" },
      {
        name: "description",
        content: "Order details with preserved prices and discounts, payment history, fulfillment actions, and balance tracking.",
      },
      { property: "og:title", content: "Order details — Golden Nest Egg Depot" },
      { property: "og:description", content: "Track fulfillment, record payments, and review an order's full history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrderDetailPage,
});

function OrderDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const order = useStore((s) => s.orders.find((o) => o.id === id));
  const settings = useStore((s) => s.settings);
  const setOrderStatus = useStore((s) => s.setOrderStatus);
  const recordPayment = useStore((s) => s.recordPayment);
  const deleteDraftOrder = useStore((s) => s.deleteDraftOrder);
  const loadOrderToCart = useStore((s) => s.loadOrderToCart);

  const [payOpen, setPayOpen] = useState(false);
  const [payMethod, setPayMethod] = useState<"cash" | "gcash" | "maya" | "bank">("cash");
  const [payAmount, setPayAmount] = useState("");
  const [payRef, setPayRef] = useState("");
  const [payVerified, setPayVerified] = useState(true);

  if (!order) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-sm font-semibold">Order not found</p>
        <p className="text-xs text-muted-foreground">It may have been a draft that was deleted.</p>
        <Button asChild variant="outline" size="sm">
          <Link to="/orders">
            <ArrowLeft className="mr-1.5 size-3.5" /> Back to orders
          </Link>
        </Button>
      </div>
    );
  }

  const t = calcOrder(order);
  const pr = calcProfit(order);

  const submitPayment = () => {
    try {
      recordPayment(order.id, {
        method: payMethod,
        amount: payAmount === "" ? t.balance : parseAmount(payAmount),
        reference: payRef || undefined,
        verified: payVerified,
      });
      toast.success(`Payment recorded for ${order.id}`);
      setPayOpen(false);
      setPayAmount("");
      setPayRef("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not record payment.");
    }
  };

  const advance = (status: FulfillmentStatus, label: string) => {
    setOrderStatus(order.id, status);
    toast.success(`${order.id} → ${label}`);
  };

  const statusActions: { label: string; status: FulfillmentStatus; icon: typeof CheckCircle2 }[] = [];
  if (order.status === "confirmed") {
    statusActions.push({ label: "Start preparing", status: "preparing", icon: PackageCheck });
    statusActions.push({ label: "Mark fulfilled", status: "fulfilled", icon: CheckCircle2 });
  } else if (order.status === "preparing") {
    statusActions.push({ label: "Partially fulfilled", status: "partially_fulfilled", icon: PackageCheck });
    statusActions.push({ label: "Mark fulfilled", status: "fulfilled", icon: CheckCircle2 });
  } else if (order.status === "partially_fulfilled") {
    statusActions.push({ label: "Mark fulfilled", status: "fulfilled", icon: CheckCircle2 });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" aria-label="Back to orders">
            <Link to="/orders"><ArrowLeft className="size-4" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight">{order.id}</h1>
              <StatusBadge status={order.status} />
              <PaymentBadge order={order} />
            </div>
            <p className="text-xs text-muted-foreground">
              {fmtDate(order.date)} · {order.customerName} · {order.source}
              {order.sourceDetail ? ` (${order.sourceDetail})` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => printHtml(`Receipt ${order.id}`, receiptHtml(order, settings))}>
            <Printer className="mr-1.5 size-3.5" /> Print
          </Button>
          {t.balance > 0 && order.status !== "cancelled" ? (
            <Button size="sm" onClick={() => { setPayAmount((t.balance / 100).toFixed(2)); setPayOpen(true); }}>
              <Wallet className="mr-1.5 size-3.5" /> Record payment
            </Button>
          ) : null}
          {order.status === "draft" ? (
            <>
              <Button size="sm" onClick={() => { loadOrderToCart(order.id); navigate({ to: "/" }); }}>
                <Pencil className="mr-1.5 size-3.5" /> Edit in POS
              </Button>
              <Button size="sm" onClick={() => advance("confirmed", "Confirmed")}>
                <CheckCircle2 className="mr-1.5 size-3.5" /> Confirm
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="mr-1.5 size-3.5" /> Delete draft
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete draft {order.id}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Drafts have no financial effect yet, but this cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep draft</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => { deleteDraftOrder(order.id); navigate({ to: "/orders" }); }}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : null}
          {statusActions.map((a) => (
            <Button key={a.status} variant="outline" size="sm" onClick={() => advance(a.status, FULFILLMENT_LABELS[a.status])}>
              <a.icon className="mr-1.5 size-3.5" /> {a.label}
            </Button>
          ))}
          {order.status !== "cancelled" && order.status !== "fulfilled" ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                  <Ban className="mr-1.5 size-3.5" /> Cancel order
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel {order.id}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Reserved stock will be released, and any already-deducted stock is returned to inventory. Payments stay on record.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep order</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => advance("cancelled", "Cancelled")}
                  >
                    Cancel order
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border bg-card shadow-card">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Product</TableHead>
                  <TableHead className="text-right">Cases</TableHead>
                  <TableHead className="text-right">Price/case</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead className="text-right">Line total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.lines.map((l) => {
                  const perCase = perCaseDiscountCents(l);
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="pl-4 font-semibold">{l.productName}</TableCell>
                      <TableCell className="text-right tabular-nums">{l.qty}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtPeso(l.unitPrice)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {l.discount > 0 ? (l.discountType === "percent" ? `${l.discount}%` : `−${fmtPeso(l.discount)}`) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-bold tabular-nums">{fmtPeso(l.qty * (l.unitPrice - perCase))}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="rounded-xl border bg-card p-4 shadow-card">
            <h2 className="mb-2 text-sm font-bold">Payments</h2>
            {order.payments.length ? (
              <div className="space-y-1.5">
                {order.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border bg-secondary/40 px-3 py-2 text-[13px]">
                    <div>
                      <span className="font-semibold">{METHOD_LABEL[p.method]}</span>
                      <span className="ml-2 text-[11px] text-muted-foreground">
                        {fmtDate(p.paidAt)}
                        {p.reference ? ` · Ref ${p.reference}` : ""}
                        {p.reference ? (p.verified ? " · verified" : " · unverified") : ""}
                        {p.dueDate ? ` · due ${fmtDate(p.dueDate)}` : ""}
                      </span>
                    </div>
                    <span className="font-bold tabular-nums">{fmtPeso(p.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No payments recorded yet.</p>
            )}
            <Separator className="my-3" />
            <div className="grid gap-1 text-[13px]">
              <DetailRow label="Fulfillment" value={order.fulfillment === "delivery" ? "Delivery" : "Store pickup"} />
              {order.requestedDate ? <DetailRow label="Requested date" value={fmtDate(order.requestedDate)} /> : null}
              {order.notes ? <DetailRow label="Notes" value={order.notes} /> : null}
              {order.staffNotes ? <DetailRow label="Staff notes" value={order.staffNotes} /> : null}
            </div>
          </div>
        </div>

        <div className="h-fit space-y-2 rounded-xl border bg-card p-4 shadow-card lg:sticky lg:top-2">
          <h2 className="text-sm font-bold">Summary</h2>
          <div className="space-y-1 text-[13px]">
            <Row label="Cases" value={String(t.cases)} />
            <Row label="Gross" value={fmtPeso(t.gross)} />
            {t.lineDiscounts > 0 ? <Row label="Line discounts" value={`−${fmtPeso(t.lineDiscounts)}`} /> : null}
            {t.orderDiscount > 0 ? <Row label="Order discount" value={`−${fmtPeso(t.orderDiscount)}`} /> : null}
            {t.deliveryFee > 0 ? <Row label="Delivery fee" value={fmtPeso(t.deliveryFee)} /> : null}
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total</span>
            <span className="text-xl font-extrabold tabular-nums">{fmtPeso(t.total)}</span>
          </div>
          <div className="space-y-1 text-[13px]">
            <Row label="Paid" value={fmtPeso(t.paid)} />
            <Row label="Balance" value={fmtPeso(t.balance)} highlight={t.balance > 0} />
          </div>
          <Separator />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Profitability</h3>
          <div className="space-y-1 text-[13px]">
            <Row label="Net sales (excl. delivery)" value={fmtPeso(pr.netSales)} />
            <Row label="Cost of eggs" value={fmtPeso(pr.cogs)} />
            <Row label="Gross profit" value={fmtPeso(pr.profit)} highlight={pr.profit < 0} />
            <Row label="Margin" value={fmtMargin(pr.marginPct)} />
          </div>
        </div>
      </div>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Record payment — {order.id}</DialogTitle>
            <DialogDescription>Remaining balance: {fmtPeso(t.balance)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Method</Label>
              <Select value={payMethod} onValueChange={(v) => setPayMethod(v as typeof payMethod)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="gcash">GCash</SelectItem>
                  <SelectItem value="maya">Maya</SelectItem>
                  <SelectItem value="bank">Bank transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Amount</Label>
              <Input inputMode="decimal" className="mt-1 text-right tabular-nums" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Reference (optional)</Label>
              <Input className="mt-1" value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="e.g. GC-10453" />
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox checked={payVerified} onCheckedChange={(v) => setPayVerified(v === true)} /> Payment verified
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
            <Button onClick={submitPayment}>Record payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function parseAmount(s: string): number {
  const n = Number(s.replace(/[₱,\s]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-semibold tabular-nums", highlight && "text-warning-foreground")}>{value}</span>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}: </span>
      <span>{value}</span>
    </div>
  );
}
