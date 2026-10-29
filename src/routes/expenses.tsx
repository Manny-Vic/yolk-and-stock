import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Paperclip, Plus } from "lucide-react";
import { toast } from "sonner";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtDate, fmtPeso, parsePeso, todayISO } from "@/lib/money";
import { EXPENSE_CATEGORIES } from "@/lib/types";
import { METHOD_LABEL, useStore } from "@/store/useStore";

export const Route = createFileRoute("/expenses")({
  head: () => ({
    meta: [
      { title: "Expenses — Golden Nest Egg Depot" },
      {
        name: "description",
        content: "Categorized operating expenses with payment method, payee, and receipt notes — separate from capital and loans.",
      },
      { property: "og:title", content: "Expenses — Golden Nest Egg Depot" },
      { property: "og:description", content: "Log operating expenses by category and payment method." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ExpensesPage,
});

function ExpensesPage() {
  const expenses = useStore((s) => s.expenses);
  const addExpense = useStore((s) => s.addExpense);

  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "gcash" | "maya" | "bank">("cash");
  const [payee, setPayee] = useState("");
  const [description, setDescription] = useState("");
  const [receiptName, setReceiptName] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterMonth, setFilterMonth] = useState(todayISO().slice(0, 7));

  const filtered = useMemo(
    () =>
      expenses
        .filter((e) => (filterCat === "all" ? true : e.category === filterCat))
        .filter((e) => (filterMonth ? e.date.startsWith(filterMonth) : true))
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [expenses, filterCat, filterMonth],
  );

  const total = filtered.reduce((s, e) => s + e.amount, 0);
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of filtered) map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const submit = () => {
    const amt = parsePeso(amount);
    if (!payee.trim() || amt === null || amt <= 0) {
      toast.error("Fill in payee and an amount greater than zero.");
      return;
    }
    addExpense({
      date,
      category,
      amount: amt,
      method,
      payee: payee.trim(),
      description: description || undefined,
      receiptName: receiptName || undefined,
    });
    toast.success(`Expense recorded — ${category} ${fmtPeso(amt)}`);
    setOpen(false);
    setAmount("");
    setPayee("");
    setDescription("");
    setReceiptName("");
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Expenses</h1>
          <p className="text-xs text-muted-foreground">
            Operating expenses only. Capital contributions, owner withdrawals, and loans live in{" "}
            <Link to="/cashflow" className="font-semibold text-primary hover:underline">
              Cash Flow
            </Link>
            .
          </p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="mr-1.5 size-3.5" /> Add expense
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="h-9 w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {EXPENSE_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="h-9 w-40" />
        <span className="ml-auto text-[13px] font-semibold">
          {filtered.length} entries · {fmtPeso(total)}
        </span>
      </div>

      {byCategory.length ? (
        <div className="flex flex-wrap gap-1.5">
          {byCategory.map(([cat, amt]) => (
            <span key={cat} className="rounded-full border bg-card px-2.5 py-1 text-[11px]">
              <span className="font-semibold">{cat}</span>{" "}
              <span className="tabular-nums text-muted-foreground">{fmtPeso(amt)}</span>
            </span>
          ))}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Payee</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Receipt</TableHead>
              <TableHead className="pr-4 text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="whitespace-nowrap pl-4">{fmtDate(e.date)}</TableCell>
                <TableCell className="font-semibold">{e.category}</TableCell>
                <TableCell>{e.payee}</TableCell>
                <TableCell className="max-w-52 truncate text-[12px] text-muted-foreground">{e.description ?? "—"}</TableCell>
                <TableCell className="text-[12px]">{METHOD_LABEL[e.method]}</TableCell>
                <TableCell className="text-[12px] text-muted-foreground">
                  {e.receiptName ? (
                    <span className="inline-flex items-center gap-1"><Paperclip className="size-3" /> {e.receiptName}</span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="pr-4 text-right font-bold tabular-nums">{fmtPeso(e.amount)}</TableCell>
              </TableRow>
            ))}
            {!filtered.length ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  No expenses recorded for this filter yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add expense</DialogTitle>
            <DialogDescription>The amount leaves the chosen account immediately.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Date</Label>
                <Input type="date" className="mt-1" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Amount (₱)</Label>
                <Input inputMode="decimal" className="mt-1 text-right tabular-nums" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Payment method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="gcash">GCash</SelectItem>
                  <SelectItem value="maya">Maya</SelectItem>
                  <SelectItem value="bank">Bank transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Payee</Label><Input className="mt-1" value={payee} onChange={(e) => setPayee(e.target.value)} /></div>
            <div><Label className="text-xs">Description</Label><Input className="mt-1" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
            <div><Label className="text-xs">Receipt (name or reference)</Label><Input className="mt-1" value={receiptName} onChange={(e) => setReceiptName(e.target.value)} placeholder="e.g. INV-2201 photo" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit}>Record expense</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
