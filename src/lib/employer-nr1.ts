// NR-1 document assembly and compliance refresh for employer companies

import { db } from "@/lib/db";
import { NR1_PSYCHOSOCIAL_HAZARDS } from "@/lib/nr1-hazards";
import { computeNr1ComplianceScore } from "@/lib/nr1-risk-matrix";

export async function refreshEmployerNr1Compliance(employerCompanyId: string) {
  const [
    riskCount,
    aepCompleted,
    actionItems,
    activeSurvey,
    eap,
    company,
  ] = await Promise.all([
    db.employerRiskEntry.count({ where: { employerCompanyId } }),
    db.employerAepRecord.findFirst({
      where: { employerCompanyId, status: { in: ["COMPLETED", "APPROVED"] } },
    }),
    db.employerActionPlanItem.findMany({
      where: { plan: { employerCompanyId } },
      select: { status: true },
    }),
    db.employerSurveyCampaign.findFirst({
      where: { employerCompanyId, status: "ACTIVE" },
    }),
    db.employerEapBenefit.findUnique({ where: { employerCompanyId } }),
    db.employerCompany.findUnique({ where: { id: employerCompanyId } }),
  ]);

  const doneCount = actionItems.filter((i) => i.status === "DONE" || i.status === "VERIFIED").length;
  const score = computeNr1ComplianceScore({
    riskEntryCount: riskCount,
    aepCompleted: Boolean(aepCompleted),
    actionPlanItemCount: actionItems.length,
    actionPlanDoneCount: doneCount,
    activeSurvey: Boolean(activeSurvey),
    eapEnabled: Boolean(eap?.enabled),
    lastPgrReviewAt: company?.lastPgrReviewAt ?? null,
  });

  const previousScore = company?.nr1ComplianceScore ?? null;

  await db.employerCompany.update({
    where: { id: employerCompanyId },
    data: { nr1ComplianceScore: score, lastPgrReviewAt: new Date() },
  });

  if (previousScore !== score) {
    import("@/lib/employer-webhooks").then(({ dispatchEmployerWebhooks }) =>
      dispatchEmployerWebhooks(employerCompanyId, "compliance.updated", {
        previousScore,
        score,
        updatedAt: new Date().toISOString(),
      }).catch(() => {}),
    );
  }

  return score;
}

export async function buildPgrInventoryExport(employerCompanyId: string) {
  const company = await db.employerCompany.findUnique({
    where: { id: employerCompanyId },
    include: {
      riskEntries: { orderBy: { hazardCode: "asc" } },
      aepRecords: { orderBy: { version: "desc" }, take: 1 },
      actionPlans: {
        orderBy: { version: "desc" },
        take: 1,
        include: { items: true },
      },
      surveyCampaigns: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { _count: { select: { responses: true } } },
      },
      eapBenefit: true,
      pcmsoConfig: true,
      workforce: { where: { status: "ACTIVE" }, select: { id: true, sessionsUsed: true } },
    },
  });

  if (!company) return null;

  const openReports = await db.employerWhistleblowerReport.count({
    where: { employerCompanyId, status: { in: ["OPEN", "IN_REVIEW"] } },
  });

  const payload = {
    generatedAt: new Date().toISOString(),
    normReference: "NR-1 (Portaria MTE nº 1.419/2024) + NR-17",
    company: {
      cnpj: company.cnpj,
      razaoSocial: company.razaoSocial,
      nomeFantasia: company.nomeFantasia,
      grauRisco: company.grauRisco,
      employeeCount: company.employeeCount,
      planTier: company.planTier,
    },
    hazardCatalog: NR1_PSYCHOSOCIAL_HAZARDS,
    inventory: company.riskEntries.map((r) => ({
      hazardCode: r.hazardCode,
      hazardLabel: r.hazardLabel,
      processDescription: r.processDescription,
      exposedGroups: r.exposedGroups,
      possibleHarm: r.possibleHarm,
      exposureCharacterization: r.exposureCharacterization,
      existingControls: r.existingControls,
      severity: r.severity,
      probability: r.probability,
      riskLevel: r.riskLevel,
    })),
    aep: company.aepRecords[0] ?? null,
    actionPlan: company.actionPlans[0] ?? null,
    surveys: company.surveyCampaigns.map((s) => ({
      id: s.id,
      title: s.title,
      instrument: s.instrument,
      status: s.status,
      responseCount: s._count.responses,
    })),
    eap: company.eapBenefit
      ? {
          enabled: company.eapBenefit.enabled,
          sessionsPerEmployee: company.eapBenefit.sessionsPerEmployee,
          activeMembers: company.workforce.length,
          totalSessionsUsed: company.workforce.reduce((sum, w) => sum + w.sessionsUsed, 0),
        }
      : null,
    pcmso: company.pcmsoConfig
      ? {
          coordinatorName: company.pcmsoConfig.coordinatorName,
          coordinatorCrm: company.pcmsoConfig.coordinatorCrm,
          checklistJson: company.pcmsoConfig.checklistJson,
        }
      : null,
    whistleblowerOpenCount: openReports,
    complianceScore: company.nr1ComplianceScore,
  };

  const version =
    (await db.employerNr1Document.count({
      where: { employerCompanyId, docType: "PGR_INVENTORY" },
    })) + 1;

  await db.employerNr1Document.create({
    data: {
      employerCompanyId,
      docType: "PGR_INVENTORY",
      version,
      title: `Inventário de Riscos Psicossociais — v${version}`,
      contentJson: payload,
    },
  });

  return payload;
}

export function generateWhistleblowerProtocol(): string {
  const year = new Date().getFullYear();
  const seq = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `D8-NR1-${year}-${seq}`;
}
