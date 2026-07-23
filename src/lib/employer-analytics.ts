import { db } from "@/lib/db";
import { parsePcmsoChecklist, pcmsoCompletionPercent } from "@/lib/employer-pcmso-checklist";
import { buildEmployerOnboardingSteps, onboardingCompletionPercent } from "@/lib/employer-onboarding";
import { buildBenchmarkComparison, resolveSectorBenchmark } from "@/lib/nr1-sector-benchmarks";

export async function buildEmployerAnalytics(employerCompanyId: string) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    company,
    riskCount,
    highRiskCount,
    workforce,
    eap,
    linkedPsychologists,
    surveyResponses30d,
    eapAppointments30d,
    completedEapSessions,
    pcmsoConfig,
    aepCompleted,
    surveyActive,
    actionItems,
    exportedDocs,
    openReports,
    wellnessPulses30d,
    contentViews30d,
    sectorCount,
    functionCount,
    gheCount,
    examCount,
  ] = await Promise.all([
    db.employerCompany.findUnique({
      where: { id: employerCompanyId },
      select: {
        nr1ComplianceScore: true,
        employeeCount: true,
        planTier: true,
        lastPgrReviewAt: true,
        companySize: true,
        grauRisco: true,
        cnae: true,
      },
    }),
    db.employerRiskEntry.count({ where: { employerCompanyId } }),
    db.employerRiskEntry.count({
      where: { employerCompanyId, riskLevel: { in: ["HIGH", "CRITICAL"] } },
    }),
    db.employerWorkforceMember.findMany({
      where: { employerCompanyId },
      select: { status: true, sessionsUsed: true, sessionsQuota: true },
    }),
    db.employerEapBenefit.findUnique({ where: { employerCompanyId } }),
    db.employerLinkedPsychologist.count({
      where: { employerCompanyId, status: "ACTIVE" },
    }),
    db.employerSurveyResponse.count({
      where: {
        campaign: { employerCompanyId },
        submittedAt: { gte: thirtyDaysAgo },
      },
    }),
    db.appointment.count({
      where: {
        employerWorkforceMember: { employerCompanyId },
        bookingSource: "eap_corporate",
        scheduledAt: { gte: thirtyDaysAgo },
      },
    }),
    db.appointment.count({
      where: {
        employerWorkforceMember: { employerCompanyId },
        bookingSource: "eap_corporate",
        status: "COMPLETED",
      },
    }),
    db.employerPcmsoConfig.findUnique({ where: { employerCompanyId } }),
    db.employerAepRecord.findFirst({
      where: { employerCompanyId, status: { in: ["COMPLETED", "APPROVED"] } },
    }),
    db.employerSurveyCampaign.findFirst({
      where: { employerCompanyId, status: "ACTIVE" },
    }),
    db.employerActionPlanItem.findMany({
      where: { plan: { employerCompanyId } },
      select: { status: true },
    }),
    db.employerNr1Document.count({ where: { employerCompanyId } }),
    db.employerWhistleblowerReport.count({
      where: { employerCompanyId, status: { in: ["OPEN", "IN_REVIEW"] } },
    }),
    db.employerWellnessPulse.count({
      where: { employerCompanyId, submittedAt: { gte: thirtyDaysAgo } },
    }),
    db.employerContentProgress.count({
      where: { employerCompanyId, completedAt: { gte: thirtyDaysAgo } },
    }),
    db.employerSector.count({ where: { employerCompanyId } }),
    db.employerJobFunction.count({ where: { employerCompanyId } }),
    db.employerGheGroup.count({ where: { employerCompanyId } }),
    db.employerOccupationalExam.count({ where: { employerCompanyId } }),
  ]);

  const activeWorkforce = workforce.filter((w) => w.status === "ACTIVE");
  const invitedWorkforce = workforce.filter((w) => w.status === "INVITED");
  const totalSessionsUsed = activeWorkforce.reduce((s, w) => s + w.sessionsUsed, 0);
  const totalSessionsQuota = activeWorkforce.reduce(
    (s, w) => s + (w.sessionsQuota ?? eap?.sessionsPerEmployee ?? 0),
    0,
  );

  const pcmsoPercent = pcmsoCompletionPercent(parsePcmsoChecklist(pcmsoConfig?.checklistJson));

  const onboardingSteps = buildEmployerOnboardingSteps({
    hasCnae: Boolean(company?.cnae?.trim()),
    sectorCount,
    functionCount,
    gheCount,
    riskCount,
    aepCompleted: Boolean(aepCompleted),
    surveyActive: Boolean(surveyActive),
    workforceCount: activeWorkforce.length,
    eapEnabled: Boolean(eap?.enabled),
    actionItemCount: actionItems.length,
    pcmsoPercent,
    examCount,
    exportedDoc: exportedDocs > 0,
    psychNetworkCount: linkedPsychologists,
  });

  const employeeBase = company?.employeeCount ?? activeWorkforce.length;
  const eapAdoptionPercent =
    employeeBase > 0 ? Math.round((activeWorkforce.length / employeeBase) * 100) : 0;

  const eapUtilizationPercent =
    totalSessionsQuota > 0 ? Math.round((totalSessionsUsed / totalSessionsQuota) * 100) : 0;

  const doneActions = actionItems.filter((i) => i.status === "DONE" || i.status === "VERIFIED").length;

  const actionPlanCompletion = actionItems.length > 0 ? Math.round((doneActions / actionItems.length) * 100) : 0;

  const sectorBenchmark = resolveSectorBenchmark(company?.companySize ?? null, company?.grauRisco ?? null);
  const benchmark = buildBenchmarkComparison(sectorBenchmark, {
    complianceScore: company?.nr1ComplianceScore ?? 0,
    eapAdoptionPercent,
    actionPlanCompletion,
  });

  return {
    nr1: {
      complianceScore: company?.nr1ComplianceScore ?? 0,
      riskCount,
      highRiskCount,
      openWhistleblowerReports: openReports,
      onboardingPercent: onboardingCompletionPercent(onboardingSteps),
      onboardingSteps,
      lastPgrReviewAt: company?.lastPgrReviewAt?.toISOString() ?? null,
    },
    eap: {
      enabled: Boolean(eap?.enabled),
      activeMembers: activeWorkforce.length,
      invitedMembers: invitedWorkforce.length,
      adoptionPercent: eapAdoptionPercent,
      sessionsUsed: totalSessionsUsed,
      sessionsQuota: totalSessionsQuota,
      utilizationPercent: eapUtilizationPercent,
      linkedPsychologists,
      appointmentsLast30Days: eapAppointments30d,
      completedSessions: completedEapSessions,
      jitEnabled: Boolean(eap?.jitEnabled),
    },
    surveys: {
      responsesLast30Days: surveyResponses30d,
      activeCampaign: Boolean(surveyActive),
    },
    wellness: {
      pulsesLast30Days: wellnessPulses30d,
      contentViewsLast30Days: contentViews30d,
    },
    actionPlan: {
      total: actionItems.length,
      done: doneActions,
      completionPercent: actionPlanCompletion,
    },
    benchmark,
    pcmso: {
      completionPercent: pcmsoPercent,
    },
    planTier: company?.planTier ?? "PILOT",
  };
}
