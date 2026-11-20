import { describe, expect, it } from "vitest";

import { jpegToPdf } from "@/lib/receipt-image";

describe("one-page receipt PDF", () => {
  it("builds a valid single-page PDF sized to the roll and the picture", () => {
    const fakeJpeg = new Uint8Array([0xff, 0xd8, 1, 2, 3, 0xff, 0xd9]);
    const pdf = jpegToPdf(fakeJpeg, 657, 1881, 58);
    const text = new TextDecoder("latin1").decode(pdf);
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(text).toContain("/Count 1");
    // 58 mm = 164.41 pt wide; height keeps the picture's shape
    expect(text).toContain("/MediaBox [0 0 164.41 470.71]");
    // every xref offset points at its "N 0 obj"
    const xrefAt = Number(text.match(/startxref\n(\d+)/)![1]);
    const rows = text.slice(xrefAt).split("\n").slice(3, 8);
    rows.forEach((row, i) => {
      const off = Number(row.slice(0, 10));
      expect(text.slice(off, off + 7)).toBe(`${i + 1} 0 obj`);
    });
  });
});
