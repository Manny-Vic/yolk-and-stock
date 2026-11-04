import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Search } from "lucide-react";

import { Button } from "@/components/ui/button";

import { PaymentBadge, StatusBadge } from "@/components/shared/status-badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { calcOrder, calcProfit, fmtMargin, paymentStatus } from "@/lib/calc";
import { fmtDate, fmtPeso } from "@/lib/money";
import { ORDER_SOURCES, type FulfillmentStatus } from "@/lib/types";
import { useStore } from "@/store/useStore";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({
    meta: [
      { title: "Orders — Golden Nest Egg Depot" },
      {
        name: "description",
        content: "Search and filter wholesale egg orders, track fulfillment and payment status, and drill into order details.",
      },
      { property: "og:title", content: "Orders — Golden Nest Egg Depot" },
      { property: "og:description", content: "Track every wholesale order: cases, payments, balances, and fulfillment." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const orders = useStore((s) => s.orders);
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [source, setSource] = useState("all");
  const [payStatus, setPayStatus] = useState("all");
  const [fulStatus, setFulStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showProfit, setShowProfit] = useState(true);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return orders
      .map((o) => ({ order: o, totals: calcOrder(o), profit: calcProfit(o), pay: paymentStatus(o) }))
      .filter(({ order, pay }) => {
        if (needle && !(`${order.id} ${order.customerName}`.toLowerCase().includes(needle))) return false;
        if (source !== "all" && order.source !== source) return false;
        if (fulStatus !== "all" && order.status !== fulStatus) return false;
        if (payStatus === "overdue" && !pay.overdue) return false;
        if (payStatus !== "all" && payStatus !== "overdue" && pay.status !== payStatus) return false;
        if (from && order.date < from) return false;
        if (to && order.date > to) return false;
        return true;
      })
      .sort((a, b) => (a.order.date < b.order.date ? 1 : a.order.date > b.order.date ? -1 : b.order.id.localeCompare(a.order.id)));
  }, [orders, q, source, payStatus, fulStatus, from, to]);

  const totalValue = rows.reduce((s, r) => s + r.totals.total, 0);
  const outstanding = rows.reduce((s, r) => s + r.totals.balance, 0);
  const totalProfit = rows.filter((r) => r.order.status !== "cancelled").reduce((s, r) => s + r.profit.profit, 0);

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-lg font-bold tracking-tight">Orders</h1>
        <p className="text-xs text-muted-foreground">
          {rows.length} order{rows.length === 1 ? "" : "s"} shown · {fmtPeso(totalValue)} total · {fmtPeso(outstanding)} outstanding
          {showProfit ? <> · <span className="font-semibold text-foreground">{fmtPeso(totalProfit)} profit</span></> : null}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search order or customer…" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 w-56 pl-8" />
        </div>
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            {ORDER_SOURCES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={payStatus} onValueChange={setPayStatus}>
          <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All payment states</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
            <SelectItem value="partially_paid">Partially paid</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
        <Select value={fulStatus} onValueChange={setFulStatus}>
          <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All fulfillment</SelectItem>
            {(["draft", "confirmed", "preparing", "partially_fulfilled", "fulfilled", "cancelled"] as FulfillmentStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          From <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-36" />
          To <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-36" />
        </div>
        <Button variant="outline" size="sm" className="ml-auto h-9" onClick={() => setShowProfit((v) => !v)}>
          {showProfit ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          {showProfit ? "Hide profit" : "Show profit"}
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Order</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Cases</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              {showProfit ? <TableHead className="text-right">Profit</TableHead> : null}
              <TableHead>Source</TableHead>
              <TableHead>Fulfillment</TableHead>
              <TableHead>Payment</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ order, totals, profit, pay }) => (
              <TableRow
                key={order.id}
                className="cursor-pointer"
                onClick={() => navigate({ to: "/orders/$id", params: { id: order.id } })}
              >
                <TableCell>
                  <Link
                    to="/orders/$id"
                    params={{ id: order.id }}
                    onClick={(e) => e.stopPropagation()}
                    className="font-bold text-primary hover:underline"
                  >
                    {order.id}
                  </Link>
                </TableCell>
                <TableCell className="whitespace-nowrap">{fmtDate(order.date)}</TableCell>
                <TableCell>{order.customerName}</TableCell>
                <TableCell className="text-right tabular-nums">{totals.cases}</TableCell>
                <TableCell className="text-right font-bold tabular-nums">{fmtPeso(totals.total)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtPeso(totals.paid)}</TableCell>
                <TableCell className={`text-right tabular-nums ${totals.balance > 0 ? "font-semibold text-warning-foreground" : ""}`}>
                  {fmtPeso(totals.balance)}
                </TableCell>
                {showProfit ? (
                  <TableCell className={`whitespace-nowrap text-right tabular-nums ${profit.profit < 0 ? "text-destructive" : ""}`}>
                    <span className="font-semibold">{fmtPeso(profit.profit)}</span>{" "}
                    <span className="text-[11px] text-muted-foreground">{fmtMargin(profit.marginPct)}</span>
                  </TableCell>
                ) : null}
                <TableCell className="max-w-32 truncate text-[12px] text-muted-foreground">{order.source}</TableCell>
                <TableCell><StatusBadge status={order.status} /></TableCell>
                <TableCell><PaymentBadge order={order} /></TableCell>
              </TableRow>
            ))}
            {!rows.length ? (
              <TableRow>
                <TableCell colSpan={showProfit ? 11 : 10} className="py-10 text-center text-sm text-muted-foreground">
                  No orders match these filters.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
