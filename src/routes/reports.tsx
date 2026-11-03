import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { ToneBadge } from "@/components/shared/status-badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { calcOrder, calcProfit } from "@/lib/calc";
import { accountBalances, creditAging, inventoryValue, purchasePayable, supplierStats } from "@/lib/derive";
import { fmtPeso, todayISO } from "@/lib/money";
import { EXPENSE_CATEGORIES } from "@/lib/types";
import { useStore } from "@/store/useStore";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Dashboard — Golden Nest Egg Depot" },
      {
        name: "description",
        content: "Owner dashboard and reports: sales by product, customer, and source; gross profit using cost of goods sold; credit aging; payables; expenses; cash reconciliation.",
      },
      { property: "og:title", content: "Reports & Dashboard — Golden Nest Egg Depot" },
      { property: "og:description", content: "Profit from COGS — not just cash — plus credit aging, payables, and reconciliation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const orders = useStore((s) => s.orders);
  const expenses = useStore((s) => s.expenses);
  const products = useStore((s) => s.products);
  const suppliers = useStore((s) => s.suppliers);
  const purchases = useStore((s) => s.purchases);
  const accounts = useStore((s) => s.accounts);
  const cashEntries = useStore((s) => s.cashEntries);
  const customers = useStore((s) => s.customers);
  const auditLog = useStore((s) => s.auditLog);

  const monthStart = `${todayISO().slice(0, 7)}-01`;
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(todayISO());

  const inRange = useMemo(
    () => orders.filter((o) => o.status !== "cancelled" && o.status !== "draft" && o.date >= from && o.date <= to),
    [orders, from, to],
  );
  const expensesInRange = useMemo(() => expenses.filter((e) => e.date >= from && e.date <= to), [expenses, from, to]);
  const today = todayISO();

  const sales = inRange.reduce((s, o) => s + calcOrder(o).total, 0);
  const casesSold = inRange.reduce((s, o) => s + calcOrder(o).cases, 0);
  const cogs = inRange.reduce((s, o) => s + calcProfit(o).cogs, 0);
  const grossProfit = inRange.reduce((s, o) => s + calcProfit(o).profit, 0);
  const expensesTotal = expensesInRange.reduce((s, e) => s + e.amount, 0);
  const netEstimate = grossProfit - expensesTotal;
  const receivables = orders
    .filter((o) => o.status !== "cancelled" && o.status !== "draft")
    .reduce((s, o) => s + calcOrder(o).balance, 0);
  const payables = purchases.filter((p) => p.status !== "paid").reduce((s, p) => s + purchasePayable(p), 0);
  const balances = accountBalances(accounts, cashEntries);
  const cashTotal = Object.values(balances).reduce((s, b) => s + b.closing, 0);
  const todaySales = orders
    .filter((o) => o.date === today && o.status !== "cancelled" && o.status !== "draft")
    .reduce((s, o) => s + calcOrder(o).total, 0);
  const todayExpenses = expenses.filter((e) => e.date === today).reduce((s, e) => s + e.amount, 0);
  const breakageCount = auditLog.filter((a) => a.detail.toLowerCase().includes("broken")).length;

  const byProduct = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number; cogs: number }>();
    for (const o of inRange) {
      for (const l of o.lines) {
        const row = map.get(l.productId) ?? { name: l.productName, qty: 0, revenue: 0, cogs: 0 };
        row.qty += l.qty;
        row.revenue += l.qty * (l.unitPrice - (l.discountType === "percent" ? Math.round(l.unitPrice * (l.discount / 100)) : Math.min(l.discount, l.unitPrice)));
        row.cogs += l.qty * l.unitCost;
        map.set(l.productId, row);
      }
    }
    return [...map.values()].sort((a, b) => b.revenue - a.revenue);
  }, [inRange]);

  const byCustomer = useMemo(() => {
    const map = new Map<string, { name: string; orders: number; total: number; balance: number }>();
    for (const o of inRange) {
      const row = map.get(o.customerName) ?? { name: o.customerName, orders: 0, total: 0, balance: 0 };
      const t = calcOrder(o);
      row.orders += 1;
      row.total += t.total;
      row.balance += t.balance;
      map.set(o.customerName, row);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [inRange]);

  const bySource = useMemo(() => {
    const map = new Map<string, { orders: number; total: number }>();
    for (const o of inRange) {
      const row = map.get(o.source) ?? { orders: 0, total: 0 };
      row.orders += 1;
      row.total += calcOrder(o).total;
      map.set(o.source, row);
    }
    return [...map.entries()].sort((a, b) => b[1].total - a[1].total);
  }, [inRange]);

  const discounts = useMemo(() => {
    let line = 0;
    let orderLevel = 0;
    let ordersWithDiscounts = 0;
    for (const o of inRange) {
      const t = calcOrder(o);
      line += t.lineDiscounts;
      orderLevel += t.orderDiscount;
      if (t.lineDiscounts > 0 || t.orderDiscount > 0) ordersWithDiscounts += 1;
    }
    return { line, orderLevel, ordersWithDiscounts };
  }, [inRange]);

  const profitByOrder = useMemo(
    () =>
      inRange
        .map((o) => {
          const p = calcProfit(o);
          return { id: o.id, date: o.date, customer: o.customerName, total: p.netSales, cogs: p.cogs, gp: p.profit };
        })
        .sort((a, b) => b.gp - a.gp),
    [inRange],
  );

  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expensesInRange) map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [expensesInRange]);

  const movement = useMemo(
    () =>
      products.map((p) => {
        const received = purchases
          .filter((po) => po.receivedDate && po.receivedDate >= from && po.receivedDate <= to)
          .reduce((s, po) => s + (po.items.find((it) => it.productId === p.id)?.accepted ?? 0), 0);
        const sold = inRange.reduce((s, o) => s + (o.lines.find((l) => l.productId === p.id)?.qty ?? 0), 0);
        return { name: p.name, received, sold, onHand: p.cases, value: p.cases * p.cost };
      }),
    [products, purchases, inRange, from, to],
  );

  const aging = creditAging(orders, customers);

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Reports & Owner Dashboard</h1>
          <p className="text-xs text-muted-foreground">
            Profit uses cost of goods sold and classified expenses — figures before this period are estimates, not finalized accounting.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          From <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-36" />
          To <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-36" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Today's sales" value={fmtPeso(todaySales)} />
        <Card label="Today's expenses" value={fmtPeso(todayExpenses)} />
        <Card label={`Sales ${from === monthStart ? "this month" : "in range"}`} value={fmtPeso(sales)} sub={`${casesSold} cases`} />
        <Card label="Gross profit (COGS)" value={fmtPeso(grossProfit)} sub={`on ${fmtPeso(cogs)} cost`} />
        <Card label="Estimated net profit" value={fmtPeso(netEstimate)} sub={`after ${fmtPeso(expensesTotal)} operating expenses`} />
        <Card label="Customer receivables" value={fmtPeso(receivables)} tone={receivables > 0 ? "warning" : undefined} />
        <Card label="Supplier payables" value={fmtPeso(payables)} />
        <Card label="Cash & accounts" value={fmtPeso(cashTotal)} sub={`inventory ${fmtPeso(inventoryValue(products))}`} />
      </div>

      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="profit">Profitability</TabsTrigger>
          <TabsTrigger value="credit">Credit & payables</TabsTrigger>
          <TabsTrigger value="ops">Operations & cash</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="grid gap-4 lg:grid-cols-3">
          <ReportBlock title="Sales by product">
            {byProduct.map((r) => (
              <Row key={r.name} label={r.name} value={`${r.qty} cases · ${fmtPeso(r.revenue)}`} />
            ))}
            {!byProduct.length ? <Empty /> : null}
          </ReportBlock>
          <ReportBlock title="Orders by customer">
            {byCustomer.map((r) => (
              <Row key={r.name} label={r.name} value={`${r.orders} order${r.orders === 1 ? "" : "s"} · ${fmtPeso(r.total)}${r.balance ? ` · ${fmtPeso(r.balance)} due` : ""}`} />
            ))}
            {!byCustomer.length ? <Empty /> : null}
          </ReportBlock>
          <ReportBlock title="Orders by source">
            {bySource.map(([src, r]) => (
              <Row key={src} label={src} value={`${r.orders} · ${fmtPeso(r.total)}`} />
            ))}
            {!bySource.length ? <Empty /> : null}
          </ReportBlock>
        </TabsContent>

        <TabsContent value="profit" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <ToneBadge tone="secondary">Discounts given</ToneBadge>
            <span>
              Line discounts {fmtPeso(discounts.line)} + order-level {fmtPeso(discounts.orderLevel)} ={" "}
              <span className="font-bold">{fmtPeso(discounts.line + discounts.orderLevel)}</span> across {discounts.ordersWithDiscounts} order
              {discounts.ordersWithDiscounts === 1 ? "" : "s"}
            </span>
          </div>
          <div className="overflow-hidden rounded-xl border bg-card shadow-card">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                  <TableHead className="text-right">COGS</TableHead>
                  <TableHead className="text-right">Gross profit</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profitByOrder.slice(0, 12).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="pl-4 font-semibold">{r.id}</TableCell>
                    <TableCell className="text-[12px]">{r.customer}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtPeso(r.total)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{fmtPeso(r.cogs)}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{fmtPeso(r.gp)}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.total ? `${Math.round((r.gp / r.total) * 100)}%` : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="credit" className="grid gap-4 lg:grid-cols-2">
          <ReportBlock title="Customer credit aging">
            <Row label="Current" value={fmtPeso(aging.buckets.current)} />
            <Row label="1–30 days late" value={fmtPeso(aging.buckets.d1_30)} />
            <Row label="31–60 days late" value={fmtPeso(aging.buckets.d31_60)} />
            <Row label="60+ days late" value={fmtPeso(aging.buckets.d60plus)} />
            <div className="mt-2 space-y-1 border-t pt-2">
              {aging.rows.map((r) => (
                <Row key={r.customer.id} label={r.customer.name} value={fmtPeso(r.balance)} />
              ))}
            </div>
          </ReportBlock>
          <ReportBlock title="Supplier payables">
            {suppliers.map((s) => {
              const st = supplierStats(s, purchases);
              return <Row key={s.id} label={s.name} value={fmtPeso(st.payable)} />;
            })}
            <div className="mt-2 space-y-1 border-t pt-2 text-[12px] text-muted-foreground">
              {purchases.filter((p) => p.status !== "paid").map((p) => (
                <Row key={p.id} label={p.id} value={fmtPeso(purchasePayable(p))} />
              ))}
            </div>
          </ReportBlock>
        </TabsContent>

        <TabsContent value="ops" className="grid gap-4 lg:grid-cols-3">
          <ReportBlock title="Expense breakdown">
            {expenseByCategory.map(([cat, amt]) => (
              <Row key={cat} label={cat} value={fmtPeso(amt)} />
            ))}
            {!expenseByCategory.length ? <Empty /> : null}
          </ReportBlock>
          <ReportBlock title="Inventory movement (cases)">
            {movement.map((m) => (
              <Row key={m.name} label={m.name} value={`+${m.received} in / −${m.sold} out · ${m.onHand} on hand`} />
            ))}
          </ReportBlock>
          <ReportBlock title="Cash reconciliation">
            {accounts.map((a) => (
              <Row key={a.id} label={a.name} value={fmtPeso(balances[a.id]?.closing ?? 0)} />
            ))}
            <div className="mt-2 space-y-1 border-t pt-2 text-[12px] text-muted-foreground">
              <Row label="Breakage / spoilage records" value={String(breakageCount)} />
              <Row label="Inventory value at cost" value={fmtPeso(inventoryValue(products))} />
            </div>
          </ReportBlock>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Card({ label, value, sub, tone }: { label: string; value: string; sub?: string | undefined; tone?: "warning" | undefined }) {
  return (
    <div className="rounded-xl border bg-card p-3 shadow-card">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-xl font-extrabold tabular-nums ${tone === "warning" ? "text-warning-foreground" : ""}`}>{value}</div>
      {sub ? <div className="text-[11px] text-muted-foreground">{sub}</div> : null}
    </div>
  );
}

function ReportBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-card">
      <h2 className="mb-2 text-sm font-bold">{title}</h2>
      <div className="space-y-1 text-[13px]">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="truncate text-muted-foreground">{label}</span>
      <span className="shrink-0 font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function Empty() {
  return <p className="text-xs text-muted-foreground">No data in this period yet.</p>;
}

// keep EXPENSE_CATEGORIES referenced for future breakdown chips
void EXPENSE_CATEGORIES;
