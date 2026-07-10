import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { resolveChartAccess } from "@/lib/chart-access";
import { loadChartMedicalDocuments, syncChartDocuments } from "@/lib/patient-chart-documents";
import { parsePsychologyContent, safeDecrypt } from "@/lib/psychology-api";
import { buildClinicalChartPdf } from "@/lib/psychology-chart-pdf";
import { resolveRequestLang } from "@/lib/sign-helpers";
import { isPsychologistSpecialty } from "@/lib/psychologist-portal";
import { formatLicense, getProfessionInfo } from "@/lib/profession-label";
import { formatRecordContentForDisplay } from "@/lib/record-content";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const access = await resolveChartAccess(ctx.professional.id, params.id);
  if (!access) return new NextResponse("Not found", { status: 404 });

  const record = await db.patientRecord.findUnique({
    where: { id: params.id },
  });
  if (!record) return new NextResponse("Not found", { status: 404 });

  await syncChartDocuments({
    chartId: record.id,
    professionalId: access.ownerProfessionalId,
    linkedUserId: record.linkedUserId,
    chartEmail: record.email,
  });

  const owner = await db.professionalProfile.findUnique({
    where: { id: access.ownerProfessionalId },
    select: {
      firstName: true,
      lastName: true,
      licenseNumber: true,
      licenseState: true,
      specialty: true,
    },
  });
  if (!owner) return new NextResponse("Not found", { status: 404 });

  const docs = await loadChartMedicalDocuments(record.id, access.ownerProfessionalId);

  const lang = resolveRequestLang(req);
  const patientName = `${safeDecrypt(record.firstName)} ${safeDecrypt(record.lastName)}`.trim();
  const exportedAt = new Date().toLocaleString(lang === "pt" ? "pt-BR" : lang === "es" ? "es" : "en");
  const isPsych = isPsychologistSpecialty(owner.specialty);
  const council = getProfessionInfo(owner.specialty || "");
  const licenseLine = formatLicense(
    owner.licenseNumber || "",
    owner.licenseState,
    council.councilKey,
  ) || "—";

  const prescriptionFallback = {
    pt: "Prescrição / Receita",
    en: "Prescription",
    es: "Prescripción / Receta",
  }[lang];

  const sections = docs.map((d) => {
    const title = safeDecrypt(d.title);
    const raw = d.content ? safeDecrypt(d.content) : "";
    const parsed = parsePsychologyContent(raw);
    const renderedBody =
      parsed && typeof parsed.renderedBody === "string" ? parsed.renderedBody : null;
    const body = renderedBody
      ? renderedBody
      : raw
        ? formatRecordContentForDisplay(raw)
        : d.type === "PRESCRIPTION"
          ? prescriptionFallback
          : "—";
    return {
      title,
      body,
      date: d.createdAt.toLocaleString(lang === "pt" ? "pt-BR" : lang === "es" ? "es" : "en"),
    };
  });

  const pdf = await buildClinicalChartPdf({
    lang,
    patientName,
    professionalName: `${owner.firstName} ${owner.lastName}`.trim(),
    licenseLine,
    variant: isPsych ? "psychology" : "medical",
    sections,
    exportedAt,
  });

  const { createAuditLog } = await import("@/lib/audit");
  const { AuditAction } = await import("@prisma/client");
  await createAuditLog({
    userId: ctx.userId,
    action: AuditAction.EXPORT_DATA,
    resource: "PatientRecord",
    resourceId: record.id,
    details: { exportType: "clinical_chart_pdf", accessLevel: access.level },
  });

  const safeName = patientName.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-") || "paciente";

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="prontuario-${safeName}.pdf"`,
    },
  });
}
