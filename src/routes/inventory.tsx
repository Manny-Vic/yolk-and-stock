import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, PackageOpen, Pencil } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtPeso, parsePeso, parseQty, todayISO } from "@/lib/money";
import { inventoryValue } from "@/lib/derive";
import type { Product } from "@/lib/types";
import { useStore } from "@/store/useStore";

const ADJUST_REASONS = [
  "Physical count correction",
  "Broken / spoiled cases",
  "Supplier return",
  "Stock received (manual)",
  "Other adjustment",
] as const;

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory — Golden Nest Egg Depot" },
      {
        name: "description",
        content: "Case-based egg inventory: available and reserved cases, reorder thresholds, costs, stock value, and adjustments.",
      },
      { property: "og:title", content: "Inventory — Golden Nest Egg Depot" },
      { property: "og:description", content: "Track cases on hand, reservations, costs, and stock adjustments." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InventoryPage,
});

function InventoryPage() {
  const products = useStore((s) => s.products);
  const suppliers = useStore((s) => s.suppliers);
  const auditLog = useStore((s) => s.auditLog);
  const adjustStock = useStore((s) => s.adjustStock);
  const updateProduct = useStore((s) => s.updateProduct);
  const reserve = useStore((s) => s.settings.reserveOnConfirm);

  const [adjustFor, setAdjustFor] = useState<Product | null>(null);
  const [editFor, setEditFor] = useState<Product | null>(null);
  const [direction, setDirection] = useState<"in" | "out">("out");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState<string>("Physical count correction");
  const [note, setNote] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCost, setEditCost] = useState("");
  const [editThreshold, setEditThreshold] = useState("");
  const [editSupplier, setEditSupplier] = useState("");

  const totalValue = inventoryValue(products);
  const totalCases = products.reduce((s, p) => s + p.cases, 0);
  const totalReserved = products.reduce((s, p) => s + p.reserved, 0);
  const lowStock = products.filter((p) => p.cases - p.reserved <= p.reorderThreshold);
  const stockAudit = auditLog.filter((a) => a.action.startsWith("Stock adjustment")).slice(0, 8);

  const submitAdjust = () => {
    if (!adjustFor) return;
    const n = parseQty(qty);
    if (n === null || n <= 0) {
      toast.error("Enter a number of cases greater than zero.");
      return;
    }
    adjustStock(adjustFor.id, direction === "in" ? n : -n, reason, note || undefined);
    toast.success(`${adjustFor.name}: ${direction === "in" ? "+" : "−"}${n} case${n === 1 ? "" : "s"} (${reason})`);
    setAdjustFor(null);
    setQty("");
    setNote("");
  };

  const openEdit = (p: Product) => {
    setEditFor(p);
    setEditPrice((p.defaultPrice / 100).toFixed(2));
    setEditCost((p.cost / 100).toFixed(2));
    setEditThreshold(String(p.reorderThreshold));
    setEditSupplier(p.supplierId);
  };

  const submitEdit = () => {
    if (!editFor) return;
    const price = parsePeso(editPrice);
    const cost = parsePeso(editCost);
    const threshold = parseQty(editThreshold);
    if (price === null || cost === null || threshold === null) {
      toast.error("Enter valid price, cost, and threshold values.");
      return;
    }
    updateProduct(editFor.id, { defaultPrice: price, cost, reorderThreshold: threshold, supplierId: editSupplier });
    toast.success(`${editFor.name} updated`);
    setEditFor(null);
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-lg font-bold tracking-tight">Inventory</h1>
        <p className="text-xs text-muted-foreground">
          Case-based stock · sold by the case only · {reserve ? "confirmed orders reserve cases until fulfilled" : "stock deducts when an order is completed"}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Stock value (at cost)" value={fmtPeso(totalValue)} />
        <StatCard label="Cases on hand" value={String(totalCases)} />
        <StatCard label="Reserved for confirmed orders" value={String(totalReserved)} />
        <StatCard label="Low-stock products" value={String(lowStock.length)} tone={lowStock.length ? "warning" : "default"} />
      </div>

      {lowStock.length ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-[13px]">
          <AlertTriangle className="size-4 text-warning-foreground" />
          <span className="font-semibold text-warning-foreground">Low stock:</span>
          {lowStock.map((p) => (
            <ToneBadge key={p.id} tone="warning">
              {p.name} — {Math.max(0, p.cases - p.reserved)} left
            </ToneBadge>
          ))}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Product</TableHead>
              <TableHead className="text-right">On hand</TableHead>
              <TableHead className="text-right">Reserved</TableHead>
              <TableHead className="text-right">Available</TableHead>
              <TableHead className="text-right">Reorder at</TableHead>
              <TableHead className="text-right">Sell price/case</TableHead>
              <TableHead className="text-right">Cost/case</TableHead>
              <TableHead className="text-right">Stock value</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead className="pr-3 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => {
              const available = Math.max(0, p.cases - p.reserved);
              const supplier = suppliers.find((s) => s.id === p.supplierId);
              return (
                <TableRow key={p.id}>
                  <TableCell className="pl-4">
                    <div className="flex items-center gap-2.5">
                      <img src={p.image} alt="" loading="lazy" width={768} height={768} className="size-9 rounded-md object-cover" />
                      <div>
                        <div className="font-semibold">{p.name}</div>
                        <div className="text-[11px] text-muted-foreground">{p.size}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{p.cases}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{p.reserved}</TableCell>
                  <TableCell className={`text-right font-bold tabular-nums ${available <= p.reorderThreshold ? "text-warning-foreground" : ""}`}>
                    {available}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{p.reorderThreshold}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtPeso(p.defaultPrice)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtPeso(p.cost)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtPeso(p.cases * p.cost)}</TableCell>
                  <TableCell className="text-[12px]">{supplier?.name ?? "—"}</TableCell>
                  <TableCell className="pr-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={() => setAdjustFor(p)}>
                        <PackageOpen className="mr-1 size-3" /> Adjust
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={() => openEdit(p)}>
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

      <div className="rounded-xl border bg-card p-4 shadow-card">
        <h2 className="mb-2 text-sm font-bold">Recent stock movements</h2>
        {stockAudit.length ? (
          <ul className="space-y-1.5 text-[12px]">
            {stockAudit.map((a, i) => (
              <li key={i} className="flex gap-2">
                <span className="font-semibold">{new Date(a.ts).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}</span>
                <span className="text-muted-foreground">{a.detail}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">No stock adjustments recorded yet.</p>
        )}
      </div>

      {/* Adjust stock dialog */}
      <Dialog open={!!adjustFor} onOpenChange={(v) => !v && setAdjustFor(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Adjust stock — {adjustFor?.name}</DialogTitle>
            <DialogDescription>Every adjustment is recorded in the audit trail.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Direction</Label>
                <Select value={direction} onValueChange={(v) => setDirection(v as "in" | "out")}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in"><ArrowUpRight className="mr-1 inline size-3.5" /> Stock in</SelectItem>
                    <SelectItem value="out"><ArrowDownRight className="mr-1 inline size-3.5" /> Stock out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Cases</Label>
                <Input inputMode="numeric" className="mt-1" value={qty} onChange={(e) => setQty(e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ADJUST_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Note (optional)</Label>
              <Input className="mt-1" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. 2 trays cracked in transit" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustFor(null)}>Cancel</Button>
            <Button onClick={submitAdjust}>Apply adjustment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit product dialog */}
      <Dialog open={!!editFor} onOpenChange={(v) => !v && setEditFor(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit product — {editFor?.name}</DialogTitle>
            <DialogDescription>Changing the default price affects new orders only, never existing lines.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Default sell price (₱/case)</Label>
                <Input inputMode="decimal" className="mt-1 text-right tabular-nums" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Current cost (₱/case)</Label>
                <Input inputMode="decimal" className="mt-1 text-right tabular-nums" value={editCost} onChange={(e) => setEditCost(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Reorder threshold</Label>
                <Input inputMode="numeric" className="mt-1" value={editThreshold} onChange={(e) => setEditThreshold(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Supplier</Label>
                <Select value={editSupplier} onValueChange={setEditSupplier}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditFor(null)}>Cancel</Button>
            <Button onClick={submitEdit}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: "warning" }) {
  return (
    <div className="rounded-xl border bg-card p-3 shadow-card">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-xl font-extrabold tabular-nums ${tone === "warning" ? "text-warning-foreground" : ""}`}>{value}</div>
    </div>
  );
}
