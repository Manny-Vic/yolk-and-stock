/**
 * Turn a receipt into ONE long picture (PNG) or ONE long page (PDF) sized for a thermal roll.
 *
 * Why: phones print web pages through a print service that cuts them into A4/Letter pages,
 * so a long receipt comes out of the roll printer in pieces with blank gaps. A single image
 * or a single-page PDF prints as one continuous strip (e.g. in the Eleph-label app).
 */
import { BASE_CSS, thermalCss } from "./print";

/** Render scale: 58 mm ≈ 219 CSS px → ×3 ≈ 657 px, well above the printer's 384 dots. */
const SCALE = 3;
const MAX_CSS_HEIGHT = 6000;

/** Build the XHTML-safe SVG that draws the receipt. Exported for tests. */
export function receiptSvg(bodyHtml: string, mm: 58 | 80, cssHeight = MAX_CSS_HEIGHT): string {
  const width = mm === 58 ? 219 : 302;
  const css = `${BASE_CSS}\n${thermalCss(mm, "px")}`
    .replace(/@page\s*\{[^}]*\}/g, "")
    .replace(/html,\s*body\s*\{[^}]*\}/g, "")
    .replace(/\bbody\b/g, ".rcpt");
  const parsed = new DOMParser().parseFromString(`<div class="rcpt">${bodyHtml}</div>`, "text/html");
  const root = parsed.body.firstElementChild as Element;
  const xhtml = new XMLSerializer().serializeToString(root);
  const styleEl = parsed.createElement("style");
  styleEl.textContent = `${css}\n.rcpt { width: ${width}px; background: #fff; }`;
  const style = new XMLSerializer().serializeToString(styleEl);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${cssHeight}"><foreignObject x="0" y="0" width="${width}" height="${cssHeight}"><div xmlns="http://www.w3.org/1999/xhtml" style="background:#fff;width:${width}px;height:${cssHeight}px">${style}${xhtml}</div></foreignObject></svg>`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not draw the receipt."));
    img.src = src;
  });
}

/** Draw the receipt on a white canvas and trim the empty space below it. */
export async function receiptCanvas(bodyHtml: string, mm: 58 | 80): Promise<HTMLCanvasElement> {
  const svg = receiptSvg(bodyHtml, mm);
  const img = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
  const full = document.createElement("canvas");
  full.width = img.width * SCALE;
  full.height = img.height * SCALE;
  const ctx = full.getContext("2d");
  if (!ctx) throw new Error("Could not draw the receipt.");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, full.width, full.height);
  ctx.drawImage(img, 0, 0, full.width, full.height);

  // Find the last row that has any dark pixel, then keep a small white margin below it.
  const { data, width, height } = ctx.getImageData(0, 0, full.width, full.height);
  let last = 0;
  for (let y = height - 1; y >= 0 && !last; y--) {
    const row = y * width * 4;
    for (let x = 0; x < width; x++) {
      if (data[row + x * 4]! < 200) {
        last = y;
        break;
      }
    }
  }
  const outH = Math.min(height, last + 14 * SCALE);
  const out = document.createElement("canvas");
  out.width = full.width;
  out.height = Math.max(outH, 40 * SCALE);
  const octx = out.getContext("2d");
  if (!octx) throw new Error("Could not draw the receipt.");
  octx.fillStyle = "#fff";
  octx.fillRect(0, 0, out.width, out.height);
  octx.drawImage(full, 0, 0);
  return out;
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not save the receipt."))), type, quality),
  );
}

/**
 * A minimal one-page PDF that shows a single JPEG filling the page.
 * Page width is the roll width; page height follows the picture, so it never splits.
 */
export function jpegToPdf(jpeg: Uint8Array, imgW: number, imgH: number, pageWidthMm: number): Uint8Array<ArrayBuffer> {
  const pw = (pageWidthMm * 72) / 25.4;
  const ph = (pw * imgH) / imgW;
  const n = (x: number) => x.toFixed(2);
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let size = 0;
  const push = (p: Uint8Array | string) => {
    const b = typeof p === "string" ? enc.encode(p) : p;
    parts.push(b);
    size += b.length;
  };
  const obj = (num: number, body: string) => {
    offsets[num] = size;
    push(`${num} 0 obj\n${body}\nendobj\n`);
  };
  const content = `q ${n(pw)} 0 0 ${n(ph)} 0 0 cm /Im0 Do Q`;

  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(pw)} ${n(ph)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  offsets[4] = size;
  push(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
  push(jpeg);
  push("\nendstream\nendobj\n");
  obj(5, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);

  const xref = size;
  let table = "xref\n0 6\n0000000000 65535 f \n";
  for (let i = 1; i <= 5; i++) table += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  push(`${table}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

  const out = new Uint8Array(new ArrayBuffer(size));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

export type ReceiptFileKind = "pdf" | "png";

/** Make the receipt file (one long page) ready to share or download. */
export async function receiptFile(bodyHtml: string, mm: 58 | 80, kind: ReceiptFileKind, name: string): Promise<File> {
  const canvas = await receiptCanvas(bodyHtml, mm);
  if (kind === "png") {
    return new File([await canvasBlob(canvas, "image/png")], `${name}.png`, { type: "image/png" });
  }
  const jpeg = new Uint8Array(await (await canvasBlob(canvas, "image/jpeg", 0.95)).arrayBuffer());
  const pdf = jpegToPdf(jpeg, canvas.width, canvas.height, mm);
  return new File([pdf], `${name}.pdf`, { type: "application/pdf" });
}

/**
 * Open the phone's share menu with the file (pick Eleph-label, Messenger, etc.).
 * Where sharing files isn't supported (most computers), download it instead.
 * Returns "shared", "downloaded" or "cancelled".
 */
export async function shareOrDownload(file: File): Promise<"shared" | "downloaded" | "cancelled"> {
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: file.name });
      return "shared";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
      // fall through to download
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return "downloaded";
}
