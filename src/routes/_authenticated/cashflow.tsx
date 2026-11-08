import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownRight, ArrowUpRight, Banknote, Landmark, Smartphone, Plus } from "lucide-react";
import { toast } from "sonner";

import { EditableNumber } from "@/components/shared/editable-number";
import { EditableText } from "@/components/shared/editable-text";
import { ToneBadge } from "@/components/shared/status-badge";
import { requestOwnerApproval } from "@/components/staff/owner-approval";
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
import { accountBalances } from "@/lib/derive";
import { fmtDate, fmtPeso, parsePeso, todayISO } from "@/lib/money";
import type { CashEntryKind } from "@/lib/types";
import { useStore } from "@/store/useStore";

const ENTRY_KINDS: { value: CashEntryKind; label: string; hint: string }[] = [
  { value: "capital", label: "Capital contribution", hint: "Owner puts money in" },
  { value: "withdrawal", label: "Owner withdrawal", hint: "Owner takes money out" },
  { value: "loan_proceeds", label: "Loan proceeds", hint: "Money borrowed in" },
  { value: "loan_repayment", label: "Loan principal repayment", hint: "Pay loan principal out" },
  { value: "transfer", label: "Transfer between accounts", hint: "Move money internally" },
];

const KIND_LABEL: Record<string, string> = {
  sale: "Sale",
  customer_payment: "Customer payment",
  supplier_payment: "Supplier payment",
  expense: "Expense",
  capital: "Capital",
  withdrawal: "Owner withdrawal",
  loan_proceeds: "Loan proceeds",
  loan_repayment: "Loan repayment",
  transfer: "Transfer",
};

export const Route = createFileRoute("/_authenticated/cashflow")({
  head: () => ({
    meta: [
      { title: "Cash Flow — Golden Nest Egg Depot" },
      {
        name: "description",
        content: "Cash, e-wallet, and bank balances with receipts, payments, transfers, and owner capital kept separate from expenses.",
      },
      { property: "og:title", content: "Cash Flow — Golden Nest Egg Depot" },
      { property: "og:description", content: "Reconcile cash, GCash, Maya, and bank balances in one ledger." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CashFlowPage,
});

function CashFlowPage() {
  const accounts = useStore((s) => s.accounts);
  const entries = useStore((s) => s.cashEntries);
  const addCashEntry = useStore((s) => s.addCashEntry);
  const updateAccount = useStore((s) => s.updateAccount);

  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<CashEntryKind>("capital");
  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("acc-cash");
  const [toAccountId, setToAccountId] = useState("acc-bank");
  const [description, setDescription] = useState("");

  const balances = accountBalances(accounts, entries);
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const totalCash = Object.values(balances).reduce((s, b) => s + b.closing, 0);
  const isTransfer = kind === "transfer";
  const isOut = kind === "withdrawal" || kind === "loan_repayment";

  const submit = () => {
    const amt = parsePeso(amount);
    if (amt === null || amt <= 0) {
      toast.error("Enter an amount greater than zero.");
      return;
    }
    if (isTransfer && accountId === toAccountId) {
      toast.error("Pick two different accounts for a transfer.");
      return;
    }
    addCashEntry({
      date,
      accountId: isTransfer ? accountId : accountId,
      toAccountId: isTransfer ? toAccountId : undefined,
      direction: isTransfer ? "out" : isOut ? "out" : "in",
      amount: amt,
      kind,
      description: description.trim() || ENTRY_KINDS.find((k) => k.value === kind)?.label || "Cash entry",
    });
    toast.success("Cash entry recorded");
    setOpen(false);
    setAmount("");
    setDescription("");
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Cash Flow</h1>
          <p className="text-xs text-muted-foreground">
            Opening balances, receipts, payments, transfers, and closing reconciliation · total position {fmtPeso(totalCash)} · click an account name or its opening amount to edit
          </p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="mr-1.5 size-3.5" /> Capital / withdrawal / transfer
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {accounts.map((a) => {
          const b = balances[a.id] ?? { opening: 0, in: 0, out: 0, closing: 0 };
          const icon = a.kind === "cash" ? Banknote : a.kind === "ewallet" ? Smartphone : Landmark;
          const Icon = icon;
          return (
            <div key={a.id} className="rounded-xl border bg-card p-3 shadow-card">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1 text-[13px] font-bold">
                  <EditableText
                    value={a.name}
                    ariaLabel={`Name of ${a.name}`}
                    onCommit={(text) => {
                      if (text === a.name) return null;
                      if (accounts.some((x) => x.id !== a.id && x.name.toLowerCase() === text.toLowerCase())) {
                        return "Another account already has that name";
                      }
                      void requestOwnerApproval("Rename account", [`"${a.name}" → "${text}"`]).then((ok) => {
                        if (!ok) return;
                        updateAccount(a.id, { name: text });
                        toast.success("Account renamed");
                      });
                      return null;
                    }}
                  />
                </span>
              </div>
              <div className="mt-2 text-xl font-extrabold tabular-nums">{fmtPeso(b.closing)}</div>
              <div className="mt-1 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 text-[11px]">
                <span className="text-muted-foreground">Open</span>
                <span className="flex justify-end text-muted-foreground">
                  <EditableNumber
                    value={b.opening}
                    display={fmtPeso(b.opening)}
                    draft={(b.opening / 100).toFixed(2)}
                    parse={parsePeso}
                    ariaLabel={`Opening balance for ${a.name}`}
                    className="text-[11px] text-muted-foreground"
                    inputClassName="text-[11px]"
                    onCommit={(v) => {
                      if (v < 0) return "Cannot be negative";
                      if (v === b.opening) return null;
                      void requestOwnerApproval("Change opening balance", [
                        `${a.name}: ${fmtPeso(b.opening)} → ${fmtPeso(v)}`,
                      ]).then((ok) => {
                        if (!ok) return;
                        updateAccount(a.id, { opening: v });
                        toast.success(`${a.name} opening balance updated`);
                      });
                      return null;
                    }}
                  />
                </span>
                <span className="inline-flex items-center text-primary"><ArrowUpRight className="size-3" /> In</span>
                <span className="px-1.5 text-right tabular-nums">{fmtPeso(b.in)}</span>
                <span className="inline-flex items-center text-destructive"><ArrowDownRight className="size-3" /> Out</span>
                <span className="px-1.5 text-right tabular-nums">{fmtPeso(b.out)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead>Account</TableHead>
              <TableHead className="text-right">In</TableHead>
              <TableHead className="pr-4 text-right">Out</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((e) => {
              const account = accounts.find((a) => a.id === e.accountId);
              const toAccount = e.toAccountId ? accounts.find((a) => a.id === e.toAccountId) : undefined;
              const transfer = !!e.toAccountId;
              return (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap pl-4">{fmtDate(e.date)}</TableCell>
                  <TableCell className="max-w-72 truncate">{e.description}</TableCell>
                  <TableCell><ToneBadge tone={transfer ? "outline" : e.direction === "in" ? "success" : "secondary"}>{KIND_LABEL[e.kind] ?? e.kind}</ToneBadge></TableCell>
                  <TableCell className="text-[12px]">
                    {account?.name}
                    {transfer ? <span className="text-muted-foreground"> → {toAccount?.name}</span> : null}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-primary">
                    {!transfer && e.direction === "in" ? fmtPeso(e.amount) : transfer ? "" : ""}
                  </TableCell>
                  <TableCell className="pr-4 text-right tabular-nums text-destructive">
                    {e.direction === "out" ? fmtPeso(e.amount) : ""}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New cash entry</DialogTitle>
            <DialogDescription>
              Capital, withdrawals, and loans are kept separate from operating expenses.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as CashEntryKind)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ENTRY_KINDS.map((k) => (
                    <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{isTransfer ? "From account" : isOut ? "Pay from" : "Deposit to"}</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isTransfer ? (
                <div>
                  <Label className="text-xs">To account</Label>
                  <Select value={toAccountId} onValueChange={setToAccountId}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Input className="mt-1" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit}>Record entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
