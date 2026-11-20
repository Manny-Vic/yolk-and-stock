/** Open a small print window with the given receipt/statement HTML. */
import type { ReceiptPaper } from "./types";

/*
 * Thermal rolls: solid black, bold text sized in vw (a share of the page width), so the
 * receipt fills the roll even when the phone's print step lays it out on a bigger page
 * (e.g. A4) and then shrinks the whole page down to the roll width.
 * Sizes are designed in CSS px for the roll width (58 mm ≈ 219 px, 80 mm ≈ 302 px) and converted.
 */
export function thermalCss(mm: 58 | 80, unit: "vw" | "px" = "vw"): string {
  const W = mm === 58 ? 219 : 302;
  const v = (px: number) => (unit === "px" ? `${px}px` : `${((px / W) * 100).toFixed(2)}vw`);
  const big = mm === 58 ? { h1: 18, small: 12, body: 15, label: 12, total: 18, pad: 9 } : { h1: 22, small: 14, body: 17, label: 13, total: 21, pad: 14 };
  return `@page { margin: 0; }
  tr, .section { break-inside: avoid; }
  * { color: #000 !important; }
  html, body { width: auto; max-width: none; }
  body { margin: 0; padding: ${v(6)} ${v(big.pad)}; font-family: Arial, Helvetica, sans-serif; font-weight: 600; }
  h1 { text-align: center; font-weight: 800; font-size: ${v(big.h1)}; }
  .muted { text-align: center; display: block; font-size: ${v(big.small)}; }
  table { margin-top: ${v(10)}; }
  th { border-bottom: ${v(1.2)} solid #000; font-size: ${v(big.label)}; padding-bottom: ${v(3)}; }
  td { border-bottom: ${v(1.2)} dashed #000; padding: ${v(4)} 0; font-size: ${v(big.body)}; }
  td .muted { text-align: left; display: inline; font-size: ${v(big.small)}; }
  .total td { font-weight: 900; border-bottom: none; font-size: ${v(big.total)}; padding-top: ${v(6)}; }
  .section { margin-top: ${v(10)}; font-size: ${v(big.body)}; }
  .section b { margin-bottom: ${v(1)}; font-size: ${v(big.label)}; }`;
}

export const BASE_CSS = `  * { box-sizing: border-box; }
  body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; padding: 24px; color: #1a2b22; }
  h1 { font-size: 16px; margin: 0; }
  .muted { color: #6b7f75; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: #6b7f75; padding-bottom: 4px; border-bottom: 1px solid #dce5e0; }
  td { font-size: 12px; padding: 5px 0; border-bottom: 1px solid #eef2f0; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .total td { font-weight: 800; font-size: 14px; border-bottom: none; padding-top: 8px; }
  .section { margin-top: 14px; font-size: 12px; }
  .section b { display: block; font-size: 10px; text-transform: uppercase; color: #6b7f75; margin-bottom: 3px; }`;

const PAPER_CSS: Record<ReceiptPaper, string> = {
  standard: "",
  "80mm": thermalCss(80),
  "58mm": thermalCss(58),
};

/** Full HTML document used for printing (exported for tests and previews). */
export function printDocHtml(title: string, bodyHtml: string, paper: ReceiptPaper = "standard"): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
${BASE_CSS}
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
