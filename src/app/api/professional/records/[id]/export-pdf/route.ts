import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { resolveChartAccess } from "@/lib/chart-access";
import { loadChartMedicalDocuments, syncChartDocuments } from "@/lib/patient-chart-documents";
import { safeDecrypt } from "@/lib/psychology-api";
import { buildClinicalChartPdf } from "@/lib/psychology-chart-pdf";
import { resolveRequestLang } from "@/lib/sign-helpers";
import { isPsychologistSpecialty } from "@/lib/psychologist-portal";
import { formatLicense, getProfessionInfo } from "@/lib/profession-label";
import {
  buildChartExportSections,
  buildPatientInfoLines,
  formatDiagnosesForExport,
  parseMedicationsForExport,
  type ChartDocForExport,
} from "@/lib/chart-pdf-export";

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

  const docs = await loadChartMedicalDocuments(record.id, access.ownerProfessionalId, "asc");

  let profileAllergies: string | null = null;
  if (record.linkedUserId) {
    const patientProfile = await db.patientProfile.findUnique({
      where: { userId: record.linkedUserId },
      select: { allergies: true },
    });
    profileAllergies = patientProfile?.allergies ? safeDecrypt(patientProfile.allergies) : null;
  }

  const diagnoses = await db.patientDiagnosis.findMany({
    where: { patientRecordId: record.id },
    orderBy: { notedAt: "asc" },
    select: {
      cidCode: true,
      cidLabel: true,
      status: true,
      notedAt: true,
    },
  });

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

  const exportDocs: ChartDocForExport[] = docs.map((d) => {
    const rx = d.prescriptions[0];
    const medications = rx?.medications
      ? parseMedicationsForExport(rx.medications)
      : null;
    return {
      type: d.type,
      recordKind: d.recordKind,
      title: safeDecrypt(d.title),
      content: d.content ? safeDecrypt(d.content) : null,
      createdAt: d.createdAt,
      hasFile: !!d.fileUrl,
      categoryName: d.category?.name ?? null,
      categoryGroup: d.category?.groupName ?? null,
      sourceDocumentId: d.sourceDocumentId ?? null,
      medications,
    };
  });

  const sections = buildChartExportSections(lang, exportDocs);
  const patientInfo = buildPatientInfoLines(lang, {
    dateOfBirth: record.dateOfBirth ? safeDecrypt(record.dateOfBirth) : null,
    cpf: record.cpf ? safeDecrypt(record.cpf) : null,
    sex: record.sex || null,
    phone: record.phone ? safeDecrypt(record.phone) : null,
    email: record.email,
    addressLine1: record.addressLine1 ? safeDecrypt(record.addressLine1) : null,
    city: record.city || null,
    state: record.state || null,
    country: record.country || null,
    zipCode: record.zipCode ? safeDecrypt(record.zipCode) : null,
    notes: record.notes ? safeDecrypt(record.notes) : null,
    profileAllergies,
  });
  const diagnosisLines = formatDiagnosesForExport(lang, diagnoses);

  const pdf = await buildClinicalChartPdf({
    lang,
    patientName,
    professionalName: `${owner.firstName} ${owner.lastName}`.trim(),
    licenseLine,
    variant: isPsych ? "psychology" : "medical",
    sections,
    exportedAt,
    patientInfo,
    diagnoses: diagnosisLines.length ? diagnosisLines : undefined,
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
