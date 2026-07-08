import { NextRequest, NextResponse } from "next/server";
import { requireOccupationalPhysicianApi } from "@/lib/api-auth";
import { userHasCompanyAccess } from "@/lib/occupational-physician-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parsePcmsoChecklist, pcmsoCompletionPercent } from "@/lib/employer-pcmso-checklist";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
) {
  const { companyId } = await params;
  const ctx = await requireOccupationalPhysicianApi();
  if ("error" in ctx) return ctx.error;

  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN") {
    const allowed = await userHasCompanyAccess(ctx.userId, companyId);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const company = await db.employerCompany.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      nomeFantasia: true,
      razaoSocial: true,
      cnpj: true,
      nr1ComplianceScore: true,
      lastPgrReviewAt: true,
    },
  });
  if (!company) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [highRisks, pcmsoConfig, actionPlanOpen, exams] = await Promise.all([
    db.employerRiskEntry.findMany({
      where: {
        employerCompanyId: companyId,
        riskLevel: { in: ["HIGH", "CRITICAL"] },
      },
      orderBy: [{ riskLevel: "desc" }, { hazardCode: "asc" }],
      take: 50,
      select: {
        id: true,
        hazardCode: true,
        hazardLabel: true,
        riskLevel: true,
        severity: true,
        probability: true,
        possibleHarm: true,
        existingControls: true,
      },
    }),
    db.employerPcmsoConfig.findUnique({
      where: { employerCompanyId: companyId },
    }),
    db.employerActionPlanItem.count({
      where: {
        plan: { employerCompanyId: companyId },
        status: { in: ["PLANNED", "IN_PROGRESS"] },
      },
    }),
    db.employerOccupationalExam.findMany({
      where: { employerCompanyId: companyId, status: { in: ["SCHEDULED", "IN_PROGRESS"] } },
      include: {
        workforceMember: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 20,
    }),
  ]);

  const checklist = parsePcmsoChecklist(pcmsoConfig?.checklistJson);

  return NextResponse.json({
    company,
    pcmso: pcmsoConfig
      ? {
          coordinatorName: pcmsoConfig.coordinatorName,
          coordinatorEmail: pcmsoConfig.coordinatorEmail,
          coordinatorCrm: pcmsoConfig.coordinatorCrm,
          lastReviewAt: pcmsoConfig.lastReviewAt?.toISOString() ?? null,
          notes: pcmsoConfig.notes,
          completionPercent: pcmsoCompletionPercent(checklist),
          checklist,
        }
      : null,
    highRisks,
    openActionItems: actionPlanOpen,
    pendingExams: exams.map((e) => ({
      id: e.id,
      examType: e.examType,
      dueDate: e.dueDate?.toISOString() ?? null,
      employee: e.workforceMember,
    })),
  });
}
