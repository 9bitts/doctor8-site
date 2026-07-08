import { NextResponse } from "next/server";
import { requireEmployerApi } from "@/lib/api-auth";
import { buildAsoPdf, type AsoDocumentPayload } from "@/lib/employer-aso-pdf";
import { ASO_RESULT_LABELS, EXAM_TYPE_LABELS } from "@/lib/employer-occupational-exams";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireEmployerApi();
  if ("error" in ctx) return ctx.error;

  const { id } = await params;

  const exam = await db.employerOccupationalExam.findFirst({
    where: { id, employerCompanyId: ctx.employerCompanyId },
    include: {
      workforceMember: true,
      employerCompany: {
        select: { razaoSocial: true, nomeFantasia: true, cnpj: true, grauRisco: true },
      },
    },
  });

  if (!exam) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const signature = await db.employerDocumentSignature.findFirst({
    where: {
      employerCompanyId: ctx.employerCompanyId,
      docType: "ASO",
      docRefId: exam.id,
    },
    orderBy: { signedAt: "desc" },
  });

  const payload: AsoDocumentPayload = {
    generatedAt: new Date().toISOString(),
    company: exam.employerCompany,
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
      examTypeLabel: EXAM_TYPE_LABELS[exam.examType],
      completedAt: exam.completedAt?.toISOString() ?? null,
      asoResult: exam.asoResult,
      asoResultLabel: exam.asoResult ? ASO_RESULT_LABELS[exam.asoResult] : null,
      asoRestrictions: exam.asoRestrictions,
      physicianName: exam.physicianName,
      physicianCrm: exam.physicianCrm,
      clinicName: exam.clinicName,
    },
    signature: signature
      ? {
          signedByName: signature.signedByName,
          signedByRegistro: signature.signedByRegistro,
          signedAt: signature.signedAt.toISOString(),
        }
      : undefined,
  };

  const pdfBytes = await buildAsoPdf(payload);

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="aso-${exam.id.slice(0, 8)}.pdf"`,
    },
  });
}
