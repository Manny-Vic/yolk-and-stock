import { useState } from "react";
import { FileDown, ImageDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { receiptFile, shareOrDownload, type ReceiptFileKind } from "@/lib/receipt-image";
import type { Order, Settings } from "@/lib/types";
import { receiptHtml } from "./receipt";

/**
 * Two buttons that make the receipt as ONE long page for a roll printer app (e.g. Eleph-label):
 * a PDF (Doc printing) and a picture (Photo printing, or to send to the customer).
 */
export function ReceiptShareButtons({ order, settings, size = "sm" }: { order: Order; settings: Settings; size?: "sm" | "default" }) {
  const [busy, setBusy] = useState<ReceiptFileKind | null>(null);
  const mm = settings.receiptPaper === "80mm" ? 80 : 58;

  const run = async (kind: ReceiptFileKind) => {
    setBusy(kind);
    try {
      const file = await receiptFile(receiptHtml(order, settings), mm, kind, `Receipt ${order.date}`);
      const result = await shareOrDownload(file);
      if (result === "downloaded") toast.success(`Saved ${file.name}`, { description: "Open it in your printer app." });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not make the receipt file.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <Button variant="outline" size={size} disabled={!!busy} onClick={() => void run("pdf")}>
        {busy === "pdf" ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <FileDown className="mr-1.5 size-4" />}
        Receipt PDF (one page)
      </Button>
      <Button variant="outline" size={size} disabled={!!busy} onClick={() => void run("png")}>
        {busy === "png" ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <ImageDown className="mr-1.5 size-4" />}
        Receipt image
      </Button>
    </>
  );
}
