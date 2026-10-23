import { RotateCcw, X } from "lucide-react";
import { toast } from "sonner";

import { EditableNumber } from "@/components/shared/editable-number";
import { perCaseDiscountCents } from "@/lib/calc";
import { fmtPeso, parsePercent, parsePeso, parseQty } from "@/lib/money";
import type { DiscountType } from "@/lib/types";
import { useStore } from "@/store/useStore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const pesoDraft = (c: number) => (c / 100).toFixed(2);

export function OrderLines() {
  const lines = useStore((s) => s.cart.lines);
  const products = useStore((s) => s.products);
  const setLineQty = useStore((s) => s.setLineQty);
  const setLinePrice = useStore((s) => s.setLinePrice);
  const setLineDiscount = useStore((s) => s.setLineDiscount);
  const resetLinePrice = useStore((s) => s.resetLinePrice);
  const removeLine = useStore((s) => s.removeLine);

  if (!lines.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="text-sm font-semibold text-muted-foreground">No products in the order yet</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          Click an egg card on the left to add cases. Click any number below to edit it inline — no modals.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-4">Product</TableHead>
          <TableHead className="text-right">Cases</TableHead>
          <TableHead className="text-right">Price/case</TableHead>
          <TableHead className="text-right">Disc/case</TableHead>
          <TableHead className="text-right">Net/case</TableHead>
          <TableHead className="text-right">Line total</TableHead>
          <TableHead className="w-14 pr-3" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {lines.map((l) => {
          const product = products.find((p) => p.id === l.productId);
          const perCase = perCaseDiscountCents(l);
          const net = l.unitPrice - perCase;
          const total = l.qty * net;
          const changed = !!product && l.unitPrice !== product.defaultPrice;
          const isPercent = l.discountType === "percent";
          const discDisplay = l.discount > 0 ? (isPercent ? `${l.discount}%` : fmtPeso(l.discount)) : "—";
          return (
            <TableRow key={l.id} className="group">
              <TableCell className="pl-4">
                <div className="font-semibold">{l.productName}</div>
                {product ? (
                  <div className="text-[11px] text-muted-foreground">Default {fmtPeso(product.defaultPrice)}/case</div>
                ) : null}
              </TableCell>
              <TableCell className="text-right">
                <EditableNumber
                  ariaLabel={`Quantity of ${l.productName} in cases`}
                  value={l.qty}
                  display={String(l.qty)}
                  draft={String(l.qty)}
                  parse={parseQty}
                  onCommit={(v) => setLineQty(l.id, v)}
                  className="font-semibold"
                  inputClassName="w-16"
                />
              </TableCell>
              <TableCell className="text-right">
                <span className={cn("inline-flex items-center gap-1", changed && "text-warning-foreground")}>
                  <EditableNumber
                    ariaLabel={`Unit price of ${l.productName} per case`}
                    value={l.unitPrice}
                    display={fmtPeso(l.unitPrice)}
                    draft={pesoDraft(l.unitPrice)}
                    parse={parsePeso}
                    onCommit={(v) => setLinePrice(l.id, v)}
                    className={cn("font-semibold", changed && "bg-warning/25")}
                  />
                  {changed ? (
                    <button
                      type="button"
                      title="Reset to default price"
                      aria-label={`Reset price of ${l.productName} to default`}
                      onClick={() => resetLinePrice(l.id)}
                      className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <RotateCcw className="size-3.5" />
                    </button>
                  ) : null}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <span className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    title={isPercent ? "Switch to peso discount" : "Switch to percent discount"}
                    aria-label={`Toggle discount type for ${l.productName}`}
                    onClick={() => {
                      const other: DiscountType = isPercent ? "fixed" : "percent";
                      const err = setLineDiscount(l.id, l.discount, other);
                      if (err) toast.error(err);
                    }}
                    className="rounded border px-1 py-0.5 text-[10px] font-bold text-muted-foreground hover:bg-accent"
                  >
                    {isPercent ? "%" : "₱"}
                  </button>
                  <EditableNumber
                    ariaLabel={`Discount for ${l.productName} per case`}
                    value={l.discount}
                    display={discDisplay}
                    draft={isPercent ? (l.discount > 0 ? String(l.discount) : "") : l.discount > 0 ? pesoDraft(l.discount) : ""}
                    parse={isPercent ? parsePercent : parsePeso}
                    suffix={isPercent && l.discount > 0 ? "%" : undefined}
                    onCommit={(v) => setLineDiscount(l.id, v, l.discountType)}
                    className={cn(l.discount > 0 && "text-primary")}
                  />
                </span>
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">{fmtPeso(net)}</TableCell>
              <TableCell className="text-right font-bold tabular-nums">{fmtPeso(total)}</TableCell>
              <TableCell className="pr-3 text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${l.productName} from order`}
                  onClick={() => removeLine(l.id)}
                  className="size-7 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <X className="size-4" />
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
