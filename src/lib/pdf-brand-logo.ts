import fs from "fs";
import path from "path";
import type { PDFDocument, PDFPage } from "pdf-lib";

let cachedPngBytes: Uint8Array | null = null;

export function loadBrandLogoPngBytes(): Uint8Array {
  if (!cachedPngBytes) {
    const logoPath = path.join(process.cwd(), "public", "branding", "doctor8-logo.png");
    cachedPngBytes = new Uint8Array(fs.readFileSync(logoPath));
  }
  return cachedPngBytes;
}

/** Draws the official Doctor8 wordmark centered horizontally; returns rendered height (0 on failure). */
export async function drawBrandLogoCentered(
  pdf: PDFDocument,
  page: PDFPage,
  opts: { topY: number; maxWidth?: number; maxHeight?: number },
): Promise<number> {
  const maxWidth = opts.maxWidth ?? 140;
  const maxHeight = opts.maxHeight ?? 32;
  try {
    const img = await pdf.embedPng(loadBrandLogoPngBytes());
    const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const { width: pageW } = page.getSize();
    const x = (pageW - w) / 2;
    const y = opts.topY - h;
    page.drawImage(img, { x, y, width: w, height: h });
    return h;
  } catch {
    return 0;
  }
}
