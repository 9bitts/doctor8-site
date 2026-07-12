import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getEmployerMembership, resolveSelectedEmployerCompanyId } from "@/lib/employer-auth";
import { userHasCompanyAccess } from "@/lib/occupational-physician-auth";
import { resolveAsoPdfAccess } from "@/lib/aso-pdf-access";
import { buildAsoPdf, type AsoDocumentPayload } from "@/lib/employer-aso-pdf";
import { ASO_RESULT_LABELS, EXAM_TYPE_LABELS } from "@/lib/employer-occupational-exams";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const role = session.user.role;

  const exam = await db.employerOccupationalExam.findUnique({
    where: { id },
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

  let hasEmployerMembership = false;
  let employerCompanyId: string | null = null;

  if (role === "EMPLOYER" || role === "ADMIN") {
    const companyId = await resolveSelectedEmployerCompanyId();
    const membership = await getEmployerMembership(session.user.id, companyId);
    hasEmployerMembership = Boolean(membership);
    employerCompanyId = membership?.employerCompanyId ?? null;
  }

  let hasPhysicianLink = false;
  if (role === "OCCUPATIONAL_PHYSICIAN") {
    hasPhysicianLink = await userHasCompanyAccess(session.user.id, exam.employerCompanyId);
  }

  const access = resolveAsoPdfAccess({
    role,
    hasEmployerMembership,
    employerCompanyId,
    hasPhysicianLink,
    examCompanyId: exam.employerCompanyId,
  });

  if (!access.allowed) {
    return NextResponse.json(
      { error: access.status === 403 ? "Forbidden" : "Not found" },
      { status: access.status },
    );
  }

  const signature = await db.employerDocumentSignature.findFirst({
    where: {
      employerCompanyId: exam.employerCompanyId,
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
