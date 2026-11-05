import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRightLeft, DoorClosed, DoorOpen, Printer } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { calcOrder } from "@/lib/calc";
import { fmtPeso, parsePeso, todayISO } from "@/lib/money";
import { printHtml } from "@/lib/print";
import { DRAWER_ACCOUNT, overShort, shiftSummary } from "@/lib/shift";
import type { Shift } from "@/lib/types";
import { cn } from "@/lib/utils";
import { openShiftId, useStore } from "@/store/useStore";

export const Route = createFileRoute("/_authenticated/shifts")({
  head: () => ({
    meta: [
      { title: "Shifts & Cash Drawer — Golden Nest Egg Depot" },
      { name: "description", content: "Open and close cashier shifts, count the drawer, and track cash over or short for every shift." },
      { property: "og:title", content: "Shifts & Cash Drawer — Golden Nest Egg Depot" },
      { property: "og:description", content: "End-of-day drawer count with expected vs. actual cash." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ShiftsPage,
});

const fmtTime = (iso: string) => new Date(iso).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

function ShiftsPage() {
  const shifts = useStore((s) => s.shifts);
  const cashEntries = useStore((s) => s.cashEntries);
  const orders = useStore((s) => s.orders);
  const openShift = useStore((s) => s.openShift);
  const closeShift = useStore((s) => s.closeShift);
  const addCashEntry = useStore((s) => s.addCashEntry);
  const storeName = useStore((s) => s.settings.storeName);
  const currentId = useStore((s) => openShiftId(s));
  const current = shifts.find((x) => x.id === currentId);

  const [float, setFloat] = useState("2000");
  const [counted, setCounted] = useState("");
  const [notes, setNotes] = useState("");
  const [drop, setDrop] = useState("");

  const summary = useMemo(() => (current ? shiftSummary(current, cashEntries) : null), [current, cashEntries]);
  const shiftOrders = (id: string) => orders.filter((o) => o.shiftId === id && o.status !== "cancelled");

  const onOpen = () => {
    const v = parsePeso(float);
    if (v === null) return void toast.error("Enter the opening cash amount.");
    try {
      openShift(v);
      toast.success("Shift opened");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open shift.");
    }
  };

  const onClose = () => {
    const v = parsePeso(counted);
    if (v === null) return void toast.error("Count the drawer and enter the total cash.");
    try {
      const closed = closeShift(v, notes);
      if (closed) {
        const d = overShort(closed.countedCash ?? 0, closed.expectedCash ?? 0);
        toast.success("Shift closed", { description: d === 0 ? "Drawer balanced." : d > 0 ? `Over by ${fmtPeso(d)}` : `Short by ${fmtPeso(-d)}` });
        printZRead(closed);
      }
      setCounted("");
      setNotes("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not close shift.");
    }
  };

  const onDrop = () => {
    const v = parsePeso(drop);
    if (!v || v <= 0) return void toast.error("Enter the amount taken out of the drawer.");
    addCashEntry({ date: todayISO(), accountId: DRAWER_ACCOUNT, toAccountId: "acc-bank", direction: "out", amount: v, kind: "transfer", description: "Cash drop from drawer to bank/safe" });
    setDrop("");
    toast.success(`Cash drop of ${fmtPeso(v)} recorded`);
  };

  const printZRead = (sh: Shift) => {
    const sm = shiftSummary(sh, useStore.getState().cashEntries);
    const os = shiftOrders(sh.id);
    const sales = os.reduce((s, o) => s + calcOrder(o).total, 0);
    const d = overShort(sh.countedCash ?? 0, sh.expectedCash ?? sm.expectedCash);
    const row = (l: string, v: string) => `<tr><td>${l}</td><td class="num">${v}</td></tr>`;
    printHtml(
      `Z-Read ${sh.id}`,
      `<h1>${storeName} — Shift Z-Read</h1>
      <div class="muted">${sh.staffName} · ${fmtTime(sh.openedAt)} → ${sh.closedAt ? fmtTime(sh.closedAt) : "open"}</div>
      <table>
        ${row("Orders", String(os.length))}
        ${row("Total sales (all methods)", fmtPeso(sales))}
        ${row("Opening float", fmtPeso(sm.openingFloat))}
        ${row("Cash sales", fmtPeso(sm.cashSales))}
        ${row("Cash collected on balances", fmtPeso(sm.cashCollections))}
        ${row("Other cash in", fmtPeso(sm.cashIn))}
        ${row("Cash out (expenses, drops)", `−${fmtPeso(sm.cashOut)}`)}
        ${row("Expected in drawer", fmtPeso(sh.expectedCash ?? sm.expectedCash))}
        ${row("Counted", fmtPeso(sh.countedCash ?? 0))}
        <tr class="total"><td>${d === 0 ? "Balanced" : d > 0 ? "Over" : "Short"}</td><td class="num">${fmtPeso(Math.abs(d))}</td></tr>
      </table>
      ${sh.notes ? `<div class="section"><b>Notes</b>${sh.notes}</div>` : ""}
      <div class="section"><b>Closed by</b>${sh.closedBy ?? ""}</div>`,
    );
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <div>
        <h1 className="text-lg font-bold tracking-tight">Shifts & cash drawer</h1>
        <p className="text-xs text-muted-foreground">Open a shift with the starting cash, then count the drawer at closing to catch shortages.</p>
      </div>

      {!current ? (
        <section className="rounded-xl border bg-card p-4 shadow-card">
          <h2 className="mb-1 flex items-center gap-2 text-sm font-bold"><DoorOpen className="size-4 text-primary" /> Open a shift</h2>
          <p className="mb-3 text-xs text-muted-foreground">Count the change you are putting in the drawer before the first sale.</p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-44"><Label className="text-xs">Opening cash (₱)</Label><Input inputMode="decimal" className="mt-1 text-right tabular-nums" value={float} onChange={(e) => setFloat(e.target.value)} /></div>
            <Button onClick={onOpen}>Open shift</Button>
          </div>
        </section>
      ) : summary ? (
        <section className="rounded-xl border bg-card p-4 shadow-card">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-bold"><DoorOpen className="size-4 text-primary" /> Current shift — {current.staffName}</h2>
            <span className="text-xs text-muted-foreground">Opened {fmtTime(current.openedAt)} · {shiftOrders(current.id).length} orders</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Stat label="Opening cash" value={summary.openingFloat} />
            <Stat label="Cash sales" value={summary.cashSales} />
            <Stat label="Cash collected on balances" value={summary.cashCollections} />
            <Stat label="Other cash in" value={summary.cashIn} />
            <Stat label="Cash out (expenses, drops)" value={-summary.cashOut} />
            <Stat label="Expected in drawer" value={summary.expectedCash} strong />
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-2 border-t pt-4">
            <div className="w-44"><Label className="text-xs">Cash drop to bank/safe (₱)</Label><Input inputMode="decimal" className="mt-1 text-right tabular-nums" value={drop} onChange={(e) => setDrop(e.target.value)} /></div>
            <Button variant="outline" onClick={onDrop}><ArrowRightLeft className="mr-1.5 size-4" />Record cash drop</Button>
          </div>

          <div className="mt-4 space-y-2 border-t pt-4">
            <h3 className="flex items-center gap-2 text-sm font-bold"><DoorClosed className="size-4" /> Close shift</h3>
            <div className="flex flex-wrap items-end gap-2">
              <div className="w-44"><Label className="text-xs">Counted cash in drawer (₱)</Label><Input inputMode="decimal" className="mt-1 text-right tabular-nums" value={counted} onChange={(e) => setCounted(e.target.value)} /></div>
              {parsePeso(counted) !== null && counted !== "" ? (
                <DiffBadge diff={overShort(parsePeso(counted) ?? 0, summary.expectedCash)} />
              ) : null}
            </div>
            <Textarea placeholder="Notes (e.g. reason for shortage)" value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-16" />
            <Button onClick={onClose}>Close shift & print Z-read</Button>
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-xl border bg-card shadow-card">
        <h2 className="border-b px-4 py-3 text-sm font-bold">Shift history</h2>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Cashier</TableHead>
              <TableHead>Opened</TableHead>
              <TableHead>Closed</TableHead>
              <TableHead className="text-right">Expected</TableHead>
              <TableHead className="text-right">Counted</TableHead>
              <TableHead className="text-right">Over / short</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {shifts.filter((x) => x.closedAt).length === 0 ? (
              <TableRow><TableCell colSpan={7} className="py-6 text-center text-xs text-muted-foreground">No closed shifts yet.</TableCell></TableRow>
            ) : (
              shifts.filter((x) => x.closedAt).map((sh) => (
                <TableRow key={sh.id}>
                  <TableCell className="pl-4 font-semibold">{sh.staffName}</TableCell>
                  <TableCell className="text-xs">{fmtTime(sh.openedAt)}</TableCell>
                  <TableCell className="text-xs">{sh.closedAt ? fmtTime(sh.closedAt) : ""}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtPeso(sh.expectedCash ?? 0)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtPeso(sh.countedCash ?? 0)}</TableCell>
                  <TableCell className="text-right"><DiffBadge diff={overShort(sh.countedCash ?? 0, sh.expectedCash ?? 0)} /></TableCell>
                  <TableCell className="pr-3 text-right">
                    <Button variant="ghost" size="icon" className="size-7" aria-label="Print Z-read" onClick={() => printZRead(sh)}><Printer className="size-3.5" /></Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}

function Stat({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={cn("rounded-lg border px-3 py-2", strong && "border-primary/40 bg-primary/5")}>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={cn("font-bold tabular-nums", strong && "text-lg text-primary")}>{fmtPeso(value)}</div>
    </div>
  );
}

function DiffBadge({ diff }: { diff: number }) {
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[12px] font-semibold tabular-nums", diff === 0 ? "bg-primary/10 text-primary" : diff > 0 ? "bg-warning/15 text-warning-foreground" : "bg-destructive/10 text-destructive")}>
      {diff === 0 ? "Balanced" : diff > 0 ? `Over ${fmtPeso(diff)}` : `Short ${fmtPeso(-diff)}`}
    </span>
  );
}
