import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { decrypt } from "@/lib/encryption";
import type { Lang } from "@/lib/i18n/translations";

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try {
    return decrypt(v);
  } catch {
    return v ?? "";
  }
}

const LABELS: Record<Lang, { title: string; description: string; link: string; date: string }> = {
  pt: { title: "Biblioteca", description: "Descrição", link: "Link", date: "Data" },
  en: { title: "Library", description: "Description", link: "Link", date: "Date" },
  es: { title: "Biblioteca", description: "Descripción", link: "Enlace", date: "Fecha" },
};

export async function buildResourcePdfBytes(
  resource: { title: string; content: string | null; url: string | null; createdAt: Date },
  lang: Lang,
): Promise<Uint8Array> {
  const L = LABELS[lang] ?? LABELS.pt;
  const title = safeDecrypt(resource.title);
  const content = safeDecrypt(resource.content);
  const url = resource.url ?? "";

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const margin = 50;
  let y = 800;

  page.drawText(L.title, { x: margin, y, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
  y -= 28;
  page.drawText(title, { x: margin, y, size: 18, font: bold, color: rgb(0.1, 0.1, 0.1) });
  y -= 24;
  page.drawText(
    `${L.date}: ${resource.createdAt.toLocaleDateString(lang === "en" ? "en-US" : lang === "es" ? "es-ES" : "pt-BR")}`,
    { x: margin, y, size: 10, font, color: rgb(0.5, 0.5, 0.5) },
  );
  y -= 30;

  if (content) {
    page.drawText(L.description, { x: margin, y, size: 11, font: bold });
    y -= 18;
    const lines = content.match(/.{1,90}(\s|$)/g) || [content];
    for (const line of lines.slice(0, 30)) {
      if (y < 80) break;
      page.drawText(line.trim(), { x: margin, y, size: 11, font });
      y -= 16;
    }
    y -= 10;
  }

  if (url) {
    page.drawText(L.link, { x: margin, y, size: 11, font: bold });
    y -= 18;
    page.drawText(url, { x: margin, y, size: 10, font, color: rgb(0.13, 0.42, 0.53) });
  }

  return pdf.save();
}

export function pdfResponse(bytes: Uint8Array, resourceId: string) {
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="recurso-${resourceId.slice(0, 8)}.pdf"`,
    },
  });
}
