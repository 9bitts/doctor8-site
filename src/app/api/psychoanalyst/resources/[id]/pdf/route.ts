// GET ? printable PDF for a library resource

import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { decrypt } from "@/lib/encryption";
import { requirePsychoanalyst } from "@/lib/psychoanalyst-api";
import { db } from "@/lib/db";
import { normLang } from "@/lib/sign-helpers";

export const runtime = "nodejs";

function safeDecrypt(v: string | null): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v; }
}

const LABELS = {
  pt: { title: "Biblioteca", description: "Descri??o", link: "Link", date: "Data" },
  en: { title: "Library", description: "Description", link: "Link", date: "Date" },
  es: { title: "Biblioteca", description: "Descripci?n", link: "Enlace", date: "Fecha" },
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await requirePsychoanalyst();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { psychoanalyst, session } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const resource = await db.resource.findUnique({ where: { id: params.id } });
  if (!resource || resource.psychoanalystId !== psychoanalyst.id || !resource.active) {
    return new NextResponse("Not found", { status: 404 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { language: true },
  });
  const lang = normLang(user?.language);
  const L = LABELS[lang];

  const title = safeDecrypt(resource.title);
  const content = safeDecrypt(resource.content ?? null);
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
    `${L.date}: ${new Date(resource.createdAt).toLocaleDateString(lang === "en" ? "en-US" : lang === "es" ? "es-ES" : "pt-BR")}`,
    { x: margin, y, size: 10, font, color: rgb(0.5, 0.5, 0.5) }
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

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="recurso-${params.id.slice(0, 8)}.pdf"`,
    },
  });
}
