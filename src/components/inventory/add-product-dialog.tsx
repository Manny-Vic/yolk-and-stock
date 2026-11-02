import { useState } from "react";
import { toast } from "sonner";

import eggsMixed from "@/assets/eggs-mixed.jpg";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parsePeso, parseQty } from "@/lib/money";
import { useStore } from "@/store/useStore";

export function AddProductDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const suppliers = useStore((s) => s.suppliers);
  const products = useStore((s) => s.products);
  const addProduct = useStore((s) => s.addProduct);

  const [name, setName] = useState("");
  const [size, setSize] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [cases, setCases] = useState("0");
  const [threshold, setThreshold] = useState("10");
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const [image, setImage] = useState<string>("");

  const reset = () => {
    setName(""); setSize(""); setPrice(""); setCost(""); setCases("0"); setThreshold("10"); setImage("");
  };

  const onFile = (f: File | undefined) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setImage(String(r.result));
    r.readAsDataURL(f);
  };

  const submit = () => {
    const n = name.trim();
    const p = parsePeso(price);
    const c = parsePeso(cost);
    const qty = parseQty(cases);
    const th = parseQty(threshold);
    if (!n) return toast.error("Enter a product name.");
    if (products.some((x) => x.name.toLowerCase() === n.toLowerCase())) return toast.error("A product with that name already exists.");
    if (p === null || p <= 0) return toast.error("Enter a selling price greater than zero.");
    if (c === null || qty === null || th === null) return toast.error("Enter valid cost, stock, and reorder values.");
    addProduct({ name: n, size: size.trim() || n, image: image || eggsMixed, defaultPrice: p, cost: c, cases: qty, reorderThreshold: th, supplierId });
    toast.success(`${n} added — it's now on the POS screen`);
    reset();
    onOpenChange(false);
    return undefined;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add product</DialogTitle>
          <DialogDescription>New sizes or items appear on the POS and work just like existing eggs.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label className="text-xs">Product name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. XS Eggs" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Size / description</Label>
            <Input value={size} onChange={(e) => setSize(e.target.value)} placeholder="e.g. Extra small · 30 pcs/tray · 12 trays/case" />
          </div>
          <div>
            <Label className="text-xs">Sell price per case (₱)</Label>
            <Input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <Label className="text-xs">Cost per case (₱)</Label>
            <Input inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <Label className="text-xs">Opening stock (cases)</Label>
            <Input inputMode="numeric" value={cases} onChange={(e) => setCases(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Reorder at (cases)</Label>
            <Input inputMode="numeric" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Supplier</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger><SelectValue placeholder="Choose supplier" /></SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Photo (optional)</Label>
            <div className="flex items-center gap-2">
              <img src={image || eggsMixed} alt="" className="size-10 rounded-md object-cover" />
              <Input type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0])} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Add product</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
