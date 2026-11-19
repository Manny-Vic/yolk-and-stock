/** Open a small print window with the given receipt/statement HTML. */
import type { ReceiptPaper } from "./types";

const THERMAL = `@page { size: auto; margin: 0; } * { color: #000 !important; } body { font-family: Arial, Helvetica, sans-serif; font-weight: 600; } h1 { text-align: center; font-weight: 800; } .muted { text-align: center; display: block; } th { border-bottom: 1px solid #000; } td { border-bottom: 1px dashed #000; padding: 4px 0; } td .muted { text-align: left; display: inline; } .total td { font-weight: 900; border-bottom: none; } .section { margin-top: 10px; } .section b { margin-bottom: 1px; }`;

const PAPER_CSS: Record<ReceiptPaper, string> = {
  standard: "",
  // Thermal rolls: big, solid black text (grey prints faint on thermal paper).
  "80mm": `${THERMAL} body { width: 80mm; padding: 3mm 4mm; } h1 { font-size: 22px; } .muted { font-size: 14px; } td, .section { font-size: 17px; } th, .section b { font-size: 13px; } .total td { font-size: 21px; }`,
  "58mm": `${THERMAL} body { width: 58mm; padding: 2mm 2.5mm; } h1 { font-size: 18px; } .muted { font-size: 12px; } td, .section { font-size: 15px; } th, .section b { font-size: 12px; } .total td { font-size: 18px; }`,
};

/** Full HTML document used for printing (exported for tests and previews). */
export function printDocHtml(title: string, bodyHtml: string, paper: ReceiptPaper = "standard"): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
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
</style></head><body>${bodyHtml}</body></html>`;
}

export function printHtml(title: string, bodyHtml: string, paper: ReceiptPaper = "standard") {
  if (typeof window === "undefined") return;
  const win = window.open("", "_blank", "width=440,height=720");
  if (!win) return;
  win.document.write(printDocHtml(title, bodyHtml, paper));
  win.document.close();
  win.focus();
  win.print();
}
