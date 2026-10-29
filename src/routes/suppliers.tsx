import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PackageCheck, Plus, Truck } from "lucide-react";
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
import { purchasePayable, purchaseTotal, supplierStats } from "@/lib/derive";
import { fmtDate, fmtPeso, parsePeso, parseQty, todayISO } from "@/lib/money";
import type { Supplier } from "@/lib/types";
import { METHOD_ACCOUNT, useStore } from "@/store/useStore";

export const Route = createFileRoute("/suppliers")({
  head: () => ({
    meta: [
      { title: "Purchases & Suppliers — Golden Nest Egg Depot" },
      {
        name: "description",
        content: "Supplier profiles, purchase orders, goods received with landed cost, and supplier payables.",
      },
      { property: "og:title", content: "Purchases & Suppliers — Golden Nest Egg Depot" },
      { property: "og:description", content: "Receive goods into inventory and track supplier payables and landed costs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SuppliersPage,
});

function SuppliersPage() {
  const suppliers = useStore((s) => s.suppliers);
  const products = useStore((s) => s.products);
  const purchases = useStore((s) => s.purchases);
  const accounts = useStore((s) => s.accounts);
  const addSupplier = useStore((s) => s.addSupplier);
  const addPurchase = useStore((s) => s.addPurchase);
  const receivePurchase = useStore((s) => s.receivePurchase);
  const payPurchase = useStore((s) => s.payPurchase);

  const [newSupplierOpen, setNewSupplierOpen] = useState(false);
  const [newPoOpen, setNewPoOpen] = useState(false);
  const [receiveFor, setReceiveFor] = useState<string | null>(null);
  const [payFor, setPayFor] = useState<string | null>(null);

  // new supplier
  const [sName, setSName] = useState("");
  const [sContact, setSContact] = useState("");
  const [sPhone, setSPhone] = useState("");

  // new PO
  const [poSupplier, setPoSupplier] = useState("");
  const [poItems, setPoItems] = useState<Record<string, { qty: string; cost: string }>>({});
  const [poDelivery, setPoDelivery] = useState("");
  const [poExpected, setPoExpected] = useState("");

  // receive
  const [accepted, setAccepted] = useState<Record<string, string>>({});

  // pay
  const [payAmount, setPayAmount] = useState("");
  const [payAccount, setPayAccount] = useState("acc-cash");

  const totalPayable = purchases.filter((p) => p.status !== "paid").reduce((s, p) => s + purchasePayable(p), 0);

  const submitSupplier = () => {
    if (!sName.trim()) {
      toast.error("Enter a supplier name.");
      return;
    }
    addSupplier({ name: sName.trim(), contact: sContact || undefined, phone: sPhone || undefined });
    toast.success(`${sName.trim()} added`);
    setNewSupplierOpen(false);
    setSName("");
    setSContact("");
    setSPhone("");
  };

  const openNewPo = () => {
    setNewPoOpen(true);
    setPoSupplier(suppliers[0]?.id ?? "");
    setPoItems({});
    setPoDelivery("");
    setPoExpected("");
  };

  const submitPo = () => {
    const items = products
      .map((p) => {
        const raw = poItems[p.id];
        if (!raw) return null;
        const qty = parseQty(raw.qty);
        const cost = parsePeso(raw.cost);
        if (!qty && !cost) return null;
        if (qty === null || qty <= 0 || cost === null || cost <= 0) return "invalid";
        return { productId: p.id, qty, cost };
      })
      .filter((x): x is { productId: string; qty: number; cost: number } => x !== null);
    if (!poSupplier) {
      toast.error("Pick a supplier.");
      return;
    }
    if (items.includes("invalid" as never) || !items.length) {
      toast.error("Fill in quantity and cost (both greater than zero) for at least one product.");
      return;
    }
    const deliveryCost = parsePeso(poDelivery) ?? 0;
    addPurchase({ supplierId: poSupplier, items, deliveryCost, expectedDate: poExpected || undefined });
    toast.success("Purchase order created");
    setNewPoOpen(false);
  };

  const openReceive = (poId: string) => {
    const po = purchases.find((p) => p.id === poId);
    if (!po) return;
    const initial: Record<string, string> = {};
    for (const it of po.items) initial[it.productId] = String(it.qty);
    setAccepted(initial);
    setReceiveFor(poId);
  };

  const submitReceive = () => {
    if (!receiveFor) return;
    const po = purchases.find((p) => p.id === receiveFor);
    if (!po) return;
    const map: Record<string, number> = {};
    for (const it of po.items) {
      const n = parseQty(accepted[it.productId] ?? "");
      if (n === null || n < 0) {
        toast.error("Enter valid accepted quantities.");
        return;
      }
      map[it.productId] = n;
    }
    if (Object.values(map).every((n) => n === 0)) {
      toast.error("Accept at least one case to receive goods.");
      return;
    }
    receivePurchase(receiveFor, map, todayISO());
    toast.success(`Goods received for ${receiveFor} — inventory updated with landed cost`);
    setReceiveFor(null);
  };

  const openPay = (poId: string) => {
    const po = purchases.find((p) => p.id === poId);
    if (!po) return;
    setPayAmount((purchasePayable(po) / 100).toFixed(2));
    setPayFor(poId);
  };

  const submitPay = () => {
    if (!payFor) return;
    const amount = parsePeso(payAmount);
    if (amount === null || amount <= 0) {
      toast.error("Enter a payment amount greater than zero.");
      return;
    }
    payPurchase(payFor, amount, payAccount);
    toast.success(`Payment recorded for ${payFor}`);
    setPayFor(null);
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Purchases & Suppliers</h1>
          <p className="text-xs text-muted-foreground">
            Inventory updates only when goods are actually received — total supplier payables: {fmtPeso(totalPayable)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setNewSupplierOpen(true)}>
            <Truck className="mr-1.5 size-3.5" /> Add supplier
          </Button>
          <Button size="sm" onClick={openNewPo}>
            <Plus className="mr-1.5 size-3.5" /> New purchase order
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {suppliers.map((s) => {
          const stats = supplierStats(s, purchases);
          return (
            <div key={s.id} className="rounded-xl border bg-card p-3 shadow-card">
              <div className="font-bold">{s.name}</div>
              <div className="text-[11px] text-muted-foreground">{s.contact ?? "—"} · {s.phone ?? "—"}</div>
              <div className="mt-2 flex items-center justify-between text-[12px]">
                <span className="text-muted-foreground">Payable</span>
                <span className={`font-bold tabular-nums ${stats.payable > 0 ? "text-warning-foreground" : ""}`}>{fmtPeso(stats.payable)}</span>
              </div>
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-muted-foreground">Lifetime purchases</span>
                <span className="font-semibold tabular-nums">{fmtPeso(stats.lifetime)}</span>
              </div>
              {s.notes ? <p className="mt-1.5 text-[11px] text-muted-foreground">{s.notes}</p> : null}
            </div>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">PO</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Payable</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-3 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchases.map((po) => {
              const supplier = suppliers.find((s) => s.id === po.supplierId);
              const payable = purchasePayable(po);
              return (
                <TableRow key={po.id}>
                  <TableCell className="pl-4 font-bold">{po.id}</TableCell>
                  <TableCell>{supplier?.name ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap text-[12px]">{fmtDate(po.date)}</TableCell>
                  <TableCell className="text-[12px]">
                    {po.items.map((it) => `${products.find((p) => p.id === it.productId)?.name ?? it.productId} ×${it.qty}`).join(", ")}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{fmtPeso(purchaseTotal(po))}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtPeso(po.paidAmount)}</TableCell>
                  <TableCell className={`text-right tabular-nums ${payable > 0 ? "font-semibold text-warning-foreground" : ""}`}>{fmtPeso(payable)}</TableCell>
                  <TableCell>
                    <ToneBadge tone={po.status === "paid" ? "success" : po.status === "received" ? "secondary" : "default"}>
                      {po.status === "received" ? `Received ${po.receivedDate ? fmtDate(po.receivedDate) : ""}` : po.status}
                    </ToneBadge>
                  </TableCell>
                  <TableCell className="pr-3">
                    <div className="flex justify-end gap-1">
                      {po.status === "ordered" ? (
                        <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={() => openReceive(po.id)}>
                          <PackageCheck className="mr-1 size-3" /> Receive
                        </Button>
                      ) : null}
                      {po.status !== "ordered" && payable > 0 ? (
                        <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={() => openPay(po.id)}>
                          Pay
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* New supplier */}
      <Dialog open={newSupplierOpen} onOpenChange={setNewSupplierOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add supplier</DialogTitle>
            <DialogDescription>Keep supplier credit separate from customer receivables.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Name</Label><Input className="mt-1" value={sName} onChange={(e) => setSName(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Contact person</Label><Input className="mt-1" value={sContact} onChange={(e) => setSContact(e.target.value)} /></div>
              <div><Label className="text-xs">Phone</Label><Input className="mt-1" value={sPhone} onChange={(e) => setSPhone(e.target.value)} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewSupplierOpen(false)}>Cancel</Button>
            <Button onClick={submitSupplier}>Add supplier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New PO */}
      <Dialog open={newPoOpen} onOpenChange={setNewPoOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New purchase order</DialogTitle>
            <DialogDescription>Stock changes only when you record goods received.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Supplier</Label>
              <Select value={poSupplier} onValueChange={setPoSupplier}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {products.map((p) => (
              <div key={p.id} className="grid grid-cols-[1fr_5rem_5rem] items-center gap-2">
                <span className="truncate text-[13px] font-semibold">{p.name}</span>
                <Input
                  inputMode="numeric"
                  placeholder="Cases"
                  className="h-8 text-right tabular-nums"
                  value={poItems[p.id]?.qty ?? ""}
                  onChange={(e) => setPoItems((m) => ({ ...m, [p.id]: { qty: e.target.value, cost: m[p.id]?.cost ?? (p.cost / 100).toFixed(2) } }))}
                />
                <Input
                  inputMode="decimal"
                  placeholder="₱/case"
                  className="h-8 text-right tabular-nums"
                  value={poItems[p.id]?.cost ?? ""}
                  onChange={(e) => setPoItems((m) => ({ ...m, [p.id]: { qty: m[p.id]?.qty ?? "", cost: e.target.value } }))}
                />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Delivery & handling (₱)</Label>
                <Input inputMode="decimal" className="mt-1 text-right tabular-nums" value={poDelivery} onChange={(e) => setPoDelivery(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <Label className="text-xs">Expected date</Label>
                <Input type="date" className="mt-1" value={poExpected} onChange={(e) => setPoExpected(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewPoOpen(false)}>Cancel</Button>
            <Button onClick={submitPo}>Create purchase order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receive goods */}
      <Dialog open={!!receiveFor} onOpenChange={(v) => !v && setReceiveFor(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Receive goods — {receiveFor}</DialogTitle>
            <DialogDescription>
              Enter the actual quantities accepted. Landed cost per case includes delivery & handling.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {purchases
              .find((p) => p.id === receiveFor)
              ?.items.map((it) => (
                <div key={it.productId} className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold">{products.find((p) => p.id === it.productId)?.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">ordered {it.qty}</span>
                    <Input
                      inputMode="numeric"
                      className="h-8 w-20 text-right tabular-nums"
                      value={accepted[it.productId] ?? ""}
                      onChange={(e) => setAccepted((m) => ({ ...m, [it.productId]: e.target.value }))}
                    />
                  </div>
                </div>
              ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiveFor(null)}>Cancel</Button>
            <Button onClick={submitReceive}>Receive into inventory</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay supplier */}
      <Dialog open={!!payFor} onOpenChange={(v) => !v && setPayFor(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Pay supplier — {payFor}</DialogTitle>
            <DialogDescription>Payment reduces the supplier payable and the chosen account balance.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Amount (₱)</Label>
              <Input inputMode="decimal" className="mt-1 text-right tabular-nums" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Pay from</Label>
              <Select value={payAccount} onValueChange={setPayAccount}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {accounts
                    .filter((a) => a.kind !== "credit")
                    .map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayFor(null)}>Cancel</Button>
            <Button onClick={submitPay}>Record payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
