import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { generateQrPngBuffer } from "@/lib/qr-png";

export async function embedPharmacyQrInPdfBytes(
  pdfBytes: Uint8Array,
  qrUrl: string,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const pages = pdf.getPages();
  if (pages.length === 0) return pdfBytes;

  const qrPng = await generateQrPngBuffer(qrUrl, 140);
  const qrImage = await pdf.embedPng(qrPng);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const qrSize = 68;

  for (const page of pages) {
    const { height } = page.getSize();
    page.drawImage(qrImage, {
      x: 36,
      y: height - qrSize - 36,
      width: qrSize,
      height: qrSize,
    });
    page.drawText("Validar na farmacia Doctor8", {
      x: 36,
      y: height - qrSize - 48,
      size: 6,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
  }

  return pdf.save();
}
