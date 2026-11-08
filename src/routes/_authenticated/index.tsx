import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";

import { OrderDetails } from "@/components/pos/order-details";
import { OrderLines } from "@/components/pos/order-lines";
import { PaymentPanel } from "@/components/pos/payment-panel";
import { ProductGrid } from "@/components/pos/product-grid";
import { ReceiptDialog } from "@/components/pos/receipt";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useStore } from "@/store/useStore";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "POS · New Order — Golden Nest Egg Depot" },
      {
        name: "description",
        content:
          "Click-first wholesale egg order taking: add cases, edit prices and discounts inline, and check out with cash, e-wallet, bank, credit, or split payments.",
      },
      { property: "og:title", content: "POS · New Order — Golden Nest Egg Depot" },
      {
        property: "og:description",
        content: "Build a combined bulk egg order in a few clicks — inline prices, live totals, fast checkout.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PosPage,
});

function PosPage() {
  const lineCount = useStore((s) => s.cart.lines.length);
  const hasLines = lineCount > 0;
  const clearCart = useStore((s) => s.clearCart);
  const separate = useStore((s) => s.settings.separateLinesOnRepeat);
  const updateSettings = useStore((s) => s.updateSettings);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const receiptOrder = useStore((s) => (receiptId ? s.orders.find((o) => o.id === receiptId) ?? null : null));

  return (
    <div className="flex min-h-0 flex-col lg:h-full">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b bg-background/90 px-3 py-2 sm:px-4">
        <div>
          <h1 className="text-base font-bold tracking-tight">New Order</h1>
          <p className="text-[11px] text-muted-foreground">
            {hasLines ? `${lineCount} product line${lineCount === 1 ? "" : "s"} in this order` : "Click a product card to add cases"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Label className="flex items-center gap-2 text-[11px] font-normal text-muted-foreground">
            <Switch checked={separate} onCheckedChange={(v) => updateSettings({ separateLinesOnRepeat: v === true })} />
            Separate lines on repeat clicks
          </Label>
          <Button variant="ghost" size="sm" disabled={!hasLines} onClick={clearCart}>
            <Trash2 className="mr-1 size-3.5" /> Clear order
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:min-h-0 lg:flex-1 lg:grid-cols-[20rem_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)_fit-content(55%)] 2xl:grid-cols-[21rem_minmax(0,1fr)_22rem] 2xl:grid-rows-1">
        <div className="border-b lg:row-span-2 lg:min-h-0 lg:overflow-y-auto lg:border-b-0 lg:border-r 2xl:row-span-1">
          <ProductGrid />
        </div>
        <div className="flex flex-col max-lg:order-3 max-lg:border-t lg:col-start-2 lg:row-start-1 lg:min-h-0 lg:overflow-y-auto 2xl:border-r">
          <div className="min-h-fit flex-1">
            <OrderLines />
          </div>
          <OrderDetails />
        </div>
        <div className="max-lg:order-2 lg:col-start-2 lg:row-start-2 lg:min-h-0 lg:border-t 2xl:col-start-3 2xl:row-start-1 2xl:border-l 2xl:border-t-0">
          <PaymentPanel onCompleted={setReceiptId} />
        </div>
      </div>

      <ReceiptDialog order={receiptOrder} open={!!receiptOrder} onOpenChange={(v) => !v && setReceiptId(null)} />
    </div>
  );
}
