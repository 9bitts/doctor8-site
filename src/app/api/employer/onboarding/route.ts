import { NextResponse } from "next/server";
import { requireEmployerApi } from "@/lib/api-auth";
import { buildEmployerOnboardingSteps, mergeOnboardingJson, onboardingCompletionPercent, parseOnboardingDismissed } from "@/lib/employer-onboarding";
import { pcmsoCompletionPercent, parsePcmsoChecklist } from "@/lib/employer-pcmso-checklist";
import { db } from "@/lib/db";

export async function GET() {
  const ctx = await requireEmployerApi();
  if ("error" in ctx) return ctx.error;

  const company = await db.employerCompany.findUnique({
    where: { id: ctx.employerCompanyId },
    select: { onboardingJson: true, planTier: true },
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
  ]);

  const pcmsoPercent = pcmsoCompletionPercent(parsePcmsoChecklist(pcmso?.checklistJson));

  const steps = buildEmployerOnboardingSteps({
    riskCount,
    aepCompleted: aepLatest?.status === "COMPLETED" || aepLatest?.status === "APPROVED",
    surveyActive: Boolean(surveyActive),
    workforceCount,
    eapEnabled: Boolean(eap?.enabled),
    actionItemCount,
    pcmsoPercent,
    exportedDoc: docCount > 0,
  });

  return NextResponse.json({
    steps,
    completionPercent: onboardingCompletionPercent(steps),
    dismissed: parseOnboardingDismissed(company?.onboardingJson),
    planTier: company?.planTier ?? "PILOT",
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
