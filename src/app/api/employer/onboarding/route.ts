import { NextResponse } from "next/server";
import { requireEmployerApi } from "@/lib/api-auth";
import { buildEmployerOnboardingSteps, mergeOnboardingJson, onboardingCompletionPercent, parseOnboardingDismissed, resolveEmployerPlanLimits } from "@/lib/employer-onboarding";
import { pcmsoCompletionPercent, parsePcmsoChecklist } from "@/lib/employer-pcmso-checklist";
import { db } from "@/lib/db";

export async function GET() {
  const ctx = await requireEmployerApi();
  if ("error" in ctx) return ctx.error;

  const company = await db.employerCompany.findUnique({
    where: { id: ctx.employerCompanyId },
    select: { onboardingJson: true, planTier: true, cnae: true },
  });

  const [
    riskCount,
    aepLatest,
    surveyActive,
    workforceCount,
    eap,
    actionItemCount,
    pcmso,
    docCount,
    highRisks,
    psychNetworkCount,
    sectorCount,
    functionCount,
    gheCount,
    examCount,
  ] = await Promise.all([
    db.employerRiskEntry.count({ where: { employerCompanyId: ctx.employerCompanyId } }),
    db.employerAepRecord.findFirst({
      where: { employerCompanyId: ctx.employerCompanyId },
      orderBy: { version: "desc" },
    }),
    db.employerSurveyCampaign.findFirst({
      where: { employerCompanyId: ctx.employerCompanyId, status: "ACTIVE" },
    }),
    db.employerWorkforceMember.count({
      where: { employerCompanyId: ctx.employerCompanyId, status: "ACTIVE" },
    }),
    db.employerEapBenefit.findUnique({ where: { employerCompanyId: ctx.employerCompanyId } }),
    db.employerActionPlanItem.count({ where: { plan: { employerCompanyId: ctx.employerCompanyId } } }),
    db.employerPcmsoConfig.findUnique({ where: { employerCompanyId: ctx.employerCompanyId } }),
    db.employerNr1Document.count({ where: { employerCompanyId: ctx.employerCompanyId } }),
    db.employerRiskEntry.count({
      where: { employerCompanyId: ctx.employerCompanyId, riskLevel: { in: ["HIGH", "CRITICAL"] } },
    }),
    db.employerLinkedPsychologist.count({
      where: { employerCompanyId: ctx.employerCompanyId, status: "ACTIVE" },
    }),
    db.employerSector.count({ where: { employerCompanyId: ctx.employerCompanyId } }),
    db.employerJobFunction.count({ where: { employerCompanyId: ctx.employerCompanyId } }),
    db.employerGheGroup.count({ where: { employerCompanyId: ctx.employerCompanyId } }),
    db.employerOccupationalExam.count({ where: { employerCompanyId: ctx.employerCompanyId } }),
  ]);

  const pcmsoPercent = pcmsoCompletionPercent(parsePcmsoChecklist(pcmso?.checklistJson));

  const steps = buildEmployerOnboardingSteps({
    hasCnae: Boolean(company?.cnae?.trim()),
    sectorCount,
    functionCount,
    gheCount,
    riskCount,
    aepCompleted: aepLatest?.status === "COMPLETED" || aepLatest?.status === "APPROVED",
    surveyActive: Boolean(surveyActive),
    workforceCount,
    eapEnabled: Boolean(eap?.enabled),
    actionItemCount,
    pcmsoPercent,
    examCount,
    exportedDoc: docCount > 0,
    psychNetworkCount,
  });

  const limits = resolveEmployerPlanLimits(company ?? { planTier: "PILOT" });
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const [workforceTotal, surveysThisYear] = await Promise.all([
    db.employerWorkforceMember.count({
      where: { employerCompanyId: ctx.employerCompanyId, status: { in: ["ACTIVE", "INVITED"] } },
    }),
    db.employerSurveyCampaign.count({
      where: { employerCompanyId: ctx.employerCompanyId, createdAt: { gte: yearStart } },
    }),
  ]);

  return NextResponse.json({
    steps,
    completionPercent: onboardingCompletionPercent(steps),
    dismissed: parseOnboardingDismissed(company?.onboardingJson),
    planTier: company?.planTier ?? "PILOT",
    planUsage: {
      tier: limits.tier,
      workforce: { current: workforceTotal, max: limits.maxWorkforce },
      surveysYear: { current: surveysThisYear, max: limits.maxSurveysPerYear },
    },
    alerts: {
      highRiskCount: highRisks,
      openWhistleblower: await db.employerWhistleblowerReport.count({
        where: { employerCompanyId: ctx.employerCompanyId, status: { in: ["OPEN", "IN_REVIEW"] } },
      }),
      pcmsoIncomplete: pcmsoPercent < 50,
    },
  });
}

export async function PATCH(req: Request) {
  const ctx = await requireEmployerApi();
  if ("error" in ctx) return ctx.error;

  const body = await req.json().catch(() => ({}));
  const dismissed = Boolean(body.dismissed);

  const company = await db.employerCompany.findUnique({
    where: { id: ctx.employerCompanyId },
    select: { onboardingJson: true },
  });

  await db.employerCompany.update({
    where: { id: ctx.employerCompanyId },
    data: {
      onboardingJson: mergeOnboardingJson(company?.onboardingJson, { dismissed }),
    },
  });

  return NextResponse.json({ success: true });
}
