import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePsychologist, parsePsychologyContent, safeDecrypt } from "@/lib/psychology-api";
import { buildPsychologyChartPdf } from "@/lib/psychology-chart-pdf";
import { resolveRequestLang } from "@/lib/sign-helpers";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requirePsychologist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { professional } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const record = await db.patientRecord.findUnique({
    where: { id: params.id },
  });
  if (!record || record.professionalId !== professional.id)
    return new NextResponse("Not found", { status: 404 });

  const docs = await db.medicalDocument.findMany({
    where: { patientRecordId: record.id },
    orderBy: { createdAt: "asc" },
    take: 500,
  });

  const lang = resolveRequestLang(req);
  const patientName = `${safeDecrypt(record.firstName)} ${safeDecrypt(record.lastName)}`.trim();
  const exportedAt = new Date().toLocaleString(lang === "pt" ? "pt-BR" : lang === "es" ? "es" : "en");

  const sections = docs.map((d) => {
    const title = safeDecrypt(d.title);
    const raw = safeDecrypt(d.content);
    const parsed = parsePsychologyContent(raw);
    const body = parsed?.renderedBody
      ? String(parsed.renderedBody)
      : raw || "—";
    return {
      title,
      body,
      date: d.createdAt.toLocaleString(lang === "pt" ? "pt-BR" : "en"),
    };
  });

  const pdf = await buildPsychologyChartPdf({
    lang,
    patientName,
    psychologistName: `${professional.firstName} ${professional.lastName}`.trim(),
    crp: professional.licenseNumber,
    sections,
    exportedAt,
  });

  const safeName = patientName.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-") || "paciente";

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="prontuario-${safeName}.pdf"`,
    },
  });
}
