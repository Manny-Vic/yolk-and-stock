/** Open a small print window with the given receipt/statement HTML. */
import type { ReceiptPaper } from "./types";

const PAPER_CSS: Record<ReceiptPaper, string> = {
  standard: "",
  "80mm": `@page { size: 80mm auto; margin: 0; } body { width: 80mm; padding: 4mm; font-family: ui-monospace, Menlo, Consolas, monospace; } h1 { font-size: 14px; text-align: center; } td, .section { font-size: 11px; } .total td { font-size: 13px; }`,
  "58mm": `@page { size: 58mm auto; margin: 0; } body { width: 58mm; padding: 2mm; font-family: ui-monospace, Menlo, Consolas, monospace; } h1 { font-size: 12px; text-align: center; } td, .section, th { font-size: 9px; } .muted { font-size: 8px; } .total td { font-size: 11px; }`,
};

export function printHtml(title: string, bodyHtml: string, paper: ReceiptPaper = "standard") {
  if (typeof window === "undefined") return;
  const win = window.open("", "_blank", "width=440,height=720");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; padding: 24px; color: #1a2b22; }
  h1 { font-size: 16px; margin: 0; }
  .muted { color: #6b7f75; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: #6b7f75; padding-bottom: 4px; border-bottom: 1px solid #dce5e0; }
  td { font-size: 12px; padding: 5px 0; border-bottom: 1px solid #eef2f0; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .total td { font-weight: 800; font-size: 14px; border-bottom: none; padding-top: 8px; }
  .section { margin-top: 14px; font-size: 12px; }
  .section b { display: block; font-size: 10px; text-transform: uppercase; color: #6b7f75; margin-bottom: 3px; }
${PAPER_CSS[paper]}
</style></head><body>${bodyHtml}</body></html>`);
  win.document.close();
  win.focus();
  win.print();
}
