import { buildPgrInventoryExport } from "@/lib/employer-nr1";
import { buildPgrInventoryPdf } from "@/lib/employer-pgr-pdf";
import { buildAsoPdf, type AsoDocumentPayload } from "@/lib/employer-aso-pdf";
import { db } from "@/lib/db";
import { buildGroCriteriaDocument } from "@/lib/nr1-gro-criteria";
import { EXAM_TYPE_LABELS, ASO_RESULT_LABELS } from "@/lib/employer-occupational-exams";

export type EmployerSignDocType = "PGR_INVENTORY" | "PCMSO" | "ASO" | "GRO_CRITERIA";

export async function buildEmployerDocumentPdf(
  employerCompanyId: string,
  docType: EmployerSignDocType,
  docRefId?: string,
): Promise<{ pdfBytes: Uint8Array; fileName: string } | null> {
  if (docType === "PGR_INVENTORY") {
    const payload = await buildPgrInventoryExport(employerCompanyId);
    if (!payload) return null;
    const pdfBytes = await buildPgrInventoryPdf(payload);
    return {
      pdfBytes,
      fileName: `pgr-inventario-nr1-${new Date().toISOString().slice(0, 10)}.pdf`,
    };
  }

  if (docType === "GRO_CRITERIA") {
    const company = await db.employerCompany.findUnique({
      where: { id: employerCompanyId },
      select: { razaoSocial: true, nomeFantasia: true, cnpj: true, grauRisco: true },
    });
    if (!company) return null;
    const payload = buildGroCriteriaDocument(company);
    const { PDFDocument, StandardFonts } = await import("pdf-lib");
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const page = doc.addPage();
    page.drawText("Critérios GRO — NR-1", { x: 50, y: 750, size: 14, font });
    page.drawText(JSON.stringify(payload, null, 2).slice(0, 3000), { x: 50, y: 720, size: 8, font });
    return {
      pdfBytes: await doc.save(),
      fileName: `gro-criterios-nr1-${new Date().toISOString().slice(0, 10)}.pdf`,
    };
  }

  if (docType === "PCMSO") {
    const [company, pcmso] = await Promise.all([
      db.employerCompany.findUnique({ where: { id: employerCompanyId } }),
      db.employerPcmsoConfig.findUnique({ where: { employerCompanyId } }),
    ]);
    if (!company) return null;
    const { PDFDocument, StandardFonts } = await import("pdf-lib");
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const page = doc.addPage();
    let y = 750;
    const line = (t: string, bold = false) => {
      page.drawText(t, { x: 50, y, size: bold ? 12 : 10, font: bold ? fontBold : font });
      y -= 16;
    };
    line("PCMSO — Integração NR-7", true);
    line(`Empresa: ${company.nomeFantasia}`);
    line(`Coordenador: ${pcmso?.coordinatorName ?? "—"}`);
    line(`CRM: ${pcmso?.coordinatorCrm ?? "—"}`);
    line(`Última revisão: ${pcmso?.lastReviewAt?.toLocaleDateString("pt-BR") ?? "—"}`);
    if (pcmso?.notes) line(`Notas: ${pcmso.notes.slice(0, 500)}`);
    return {
      pdfBytes: await doc.save(),
      fileName: `pcmso-${new Date().toISOString().slice(0, 10)}.pdf`,
    };
  }

  if (docType === "ASO" && docRefId) {
    const exam = await db.employerOccupationalExam.findFirst({
      where: { id: docRefId, employerCompanyId },
      include: {
        workforceMember: true,
        employerCompany: true,
        clinicPartner: true,
      },
    });
    if (!exam) return null;

    const examTypeLabel = EXAM_TYPE_LABELS[exam.examType];
    const asoResultLabel = exam.asoResult ? ASO_RESULT_LABELS[exam.asoResult] : null;

    const payload: AsoDocumentPayload = {
      generatedAt: new Date().toISOString(),
      company: {
        razaoSocial: exam.employerCompany.razaoSocial,
        nomeFantasia: exam.employerCompany.nomeFantasia,
        cnpj: exam.employerCompany.cnpj,
        grauRisco: exam.employerCompany.grauRisco,
      },
      employee: {
        firstName: exam.workforceMember.firstName,
        lastName: exam.workforceMember.lastName,
        email: exam.workforceMember.email,
        department: exam.workforceMember.department,
        jobTitle: exam.workforceMember.jobTitle,
      },
      exam: {
        id: exam.id,
        examType: exam.examType,
        examTypeLabel,
        completedAt: exam.completedAt?.toISOString() ?? null,
        asoResult: exam.asoResult,
        asoResultLabel,
        asoRestrictions: exam.asoRestrictions,
        physicianName: exam.physicianName,
        physicianCrm: exam.physicianCrm,
        clinicName: exam.clinicPartner?.name ?? exam.clinicName,
      },
    };

    return {
      pdfBytes: await buildAsoPdf(payload),
      fileName: `aso-${exam.id.slice(0, 8)}.pdf`,
    };
  }

  return null;
}
