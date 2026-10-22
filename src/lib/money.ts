/** All money in this app is stored as integer centavos to avoid float drift. */

export function fmtPeso(centavos: number): string {
  const sign = centavos < 0 ? "−" : "";
  const abs = Math.abs(centavos) / 100;
  return `${sign}₱${abs.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function fmtPesoShort(centavos: number): string {
  const sign = centavos < 0 ? "−" : "";
  const v = Math.abs(centavos) / 100;
  if (v >= 1_000_000) return `${sign}₱${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 10_000) return `${sign}₱${Math.round(v / 1000)}k`;
  return `${sign}₱${v.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Parse a user-typed peso amount ("220", "220.50", "₱1,205") to centavos. */
export function parsePeso(input: string): number | null {
  const cleaned = input.replace(/[₱,\s]/g, "");
  if (cleaned === "" || !/^\d*\.?\d{0,2}$/.test(cleaned)) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

/** Parse a case quantity. Integers ≥ 0. */
export function parseQty(input: string): number | null {
  const cleaned = input.replace(/[,\s]/g, "");
  if (cleaned === "" || !/^\d+$/.test(cleaned)) return null;
  const n = parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : null;
}

/** Parse a percentage 0–100. */
export function parsePercent(input: string): number | null {
  const cleaned = input.replace(/[%,\s]/g, "");
  if (cleaned === "" || !/^\d*\.?\d{0,2}$/.test(cleaned)) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return n;
}

export function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fmtDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
