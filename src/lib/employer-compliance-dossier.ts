/** Compliance dossier for MTE audit — survey alone is not enough (NR-1 FAQ 2026). */

import { db } from "@/lib/db";
import { buildPgrInventoryExport } from "@/lib/employer-nr1";
import { buildGroCriteriaDocument } from "@/lib/nr1-gro-criteria";
import { parsePcmsoChecklist, pcmsoCompletionPercent } from "@/lib/employer-pcmso-checklist";
import { aggregateScreeningBands, parsePcmsoScreening } from "@/lib/employer-pcmso-screening";
import { parseErgonomicScreening } from "@/lib/nr1-ergonomic-screening";

export async function buildComplianceDossier(employerCompanyId: string) {
  const company = await db.employerCompany.findUnique({
    where: { id: employerCompanyId },
    include: {
      pcmsoConfig: true,
      aepRecords: { orderBy: { version: "desc" }, take: 3 },
      actionPlans: {
        orderBy: { version: "desc" },
        take: 1,
        include: { items: true },
      },
      surveyCampaigns: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { _count: { select: { responses: true } } },
      },
      gheGroups: { orderBy: { name: "asc" } },
      riskEntries: { select: { id: true, hazardCode: true, riskLevel: true } },
      occupationalExams: {
        where: { status: "COMPLETED" },
        select: { screeningJson: true },
        take: 200,
        orderBy: { completedAt: "desc" },
      },
    },
  });

  if (!company) return null;

  const pgr = await buildPgrInventoryExport(employerCompanyId);
  const gro = buildGroCriteriaDocument({
    razaoSocial: company.razaoSocial,
    cnpj: company.cnpj,
    nomeFantasia: company.nomeFantasia,
    grauRisco: company.grauRisco,
  });

  const checklist = parsePcmsoChecklist(company.pcmsoConfig?.checklistJson);
  const screenings = company.occupationalExams.map((e) => parsePcmsoScreening(e.screeningJson));
  const screeningAggregate = aggregateScreeningBands(screenings);

  const surveysWithAnalysis = company.surveyCampaigns.map((s) => ({
    id: s.id,
    title: s.title,
    instrument: s.instrument,
    status: s.status,
    responseCount: s._count.responses,
    analyzedAt: s.analyzedAt?.toISOString() ?? null,
    analyzedByName: s.analyzedByName,
    hasTechnicalAnalysis: Boolean(s.analyzedAt && s.analysisJson),
  }));

  const aepSummaries = company.aepRecords.map((a) => {
    const ergo = parseErgonomicScreening(a.ergonomicScreeningJson);
    const photoCount = Array.isArray(a.photoKeys) ? a.photoKeys.length : 0;
    return {
      id: a.id,
      title: a.title,
      version: a.version,
      status: a.status,
      workerParticipation: a.workerParticipation,
      workstationDescription: a.workstationDescription,
      recommendAet: a.recommendAet || Boolean(ergo?.recommendAet),
      ergonomicSummary: ergo?.summary ?? null,
      approvedByName: a.approvedByName,
      completedAt: a.completedAt?.toISOString() ?? null,
      fieldVisit: {
        aetStatus: a.aetStatus,
        photoCount,
        evaluatorName: a.evaluatorName,
        evaluatorSignedAt: a.evaluatorSignedAt?.toISOString() ?? null,
        aetFindings: a.aetFindings,
        aetRecommendations: a.aetRecommendations,
        aetCompletedAt: a.aetCompletedAt?.toISOString() ?? null,
      },
    };
  });

  const actionPlan = company.actionPlans[0];
  const openItems =
    actionPlan?.items.filter((i) => i.status !== "DONE" && i.status !== "VERIFIED" && i.status !== "CANCELLED")
      .length ?? 0;

  const evidenceGaps: string[] = [];
  if (company.riskEntries.length === 0) {
    evidenceGaps.push("Inventário de riscos psicossociais vazio.");
  }
  if (!company.aepRecords.some((a) => a.status === "COMPLETED" || a.status === "APPROVED")) {
    evidenceGaps.push("Sem AEP concluída/aprovada (NR-17).");
  }
  if (!actionPlan || actionPlan.items.length === 0) {
    evidenceGaps.push("Plano de ação sem medidas registradas.");
  }
  if (surveysWithAnalysis.some((s) => s.responseCount > 0 && !s.hasTechnicalAnalysis)) {
    evidenceGaps.push(
      "Há pesquisa com respostas sem análise técnica documentada (questionário isolado não basta — FAQ MTE).",
    );
  }
  if (!company.pcmsoConfig?.coordinatorName) {
    evidenceGaps.push("Médico coordenador PCMSO não informado.");
  }

  const dossier = {
    generatedAt: new Date().toISOString(),
    docType: "COMPLIANCE_DOSSIER" as const,
    normReferences: [
      "NR-1 GRO/PGR — Portaria MTE nº 1.419/2024",
      "FAQ MTE Cap. 1.5 (mai/2026) — questionário isolado insuficiente",
      "NR-17 AEP",
      "NR-7 PCMSO",
    ],
    company: {
      cnpj: company.cnpj,
      razaoSocial: company.razaoSocial,
      nomeFantasia: company.nomeFantasia,
      grauRisco: company.grauRisco,
      employeeCount: company.employeeCount,
      nr1ComplianceScore: company.nr1ComplianceScore,
      lastPgrReviewAt: company.lastPgrReviewAt?.toISOString() ?? null,
    },
    evidenceChecklist: {
      inventoryRiskCount: company.riskEntries.length,
      aepCompleted: company.aepRecords.some((a) => a.status === "COMPLETED" || a.status === "APPROVED"),
      actionPlanItemCount: actionPlan?.items.length ?? 0,
      actionPlanOpenCount: openItems,
      surveysAnalyzed: surveysWithAnalysis.filter((s) => s.hasTechnicalAnalysis).length,
      pcmsoCoordinator: Boolean(company.pcmsoConfig?.coordinatorName),
      pcmsoChecklistPercent: pcmsoCompletionPercent(checklist),
      gheCount: company.gheGroups.length,
      gaps: evidenceGaps,
      auditReady: evidenceGaps.length === 0,
    },
    groCriteria: gro,
    pgrInventory: pgr,
    surveys: surveysWithAnalysis,
    aep: aepSummaries,
    actionPlan: actionPlan
      ? {
          title: actionPlan.title,
          version: actionPlan.version,
          items: actionPlan.items.map((i) => ({
            measureDescription: i.measureDescription,
            hazardCode: i.hazardCode,
            responsibleName: i.responsibleName,
            dueDate: i.dueDate?.toISOString() ?? null,
            status: i.status,
          })),
        }
      : null,
    pcmso: {
      coordinatorName: company.pcmsoConfig?.coordinatorName ?? null,
      coordinatorCrm: company.pcmsoConfig?.coordinatorCrm ?? null,
      checklist,
      examMatrix: company.pcmsoConfig?.examMatrixJson ?? null,
      screeningAggregate,
      note: "Agregados de triagem PCMSO não incluem respostas individuais (sigilo médico).",
    },
    gheGroups: company.gheGroups.map((g) => ({
      name: g.name,
      sector: g.sector,
      functions: g.functions,
      workerCount: g.workerCount,
      hazardCodes: g.hazardCodes,
      notes: g.notes,
    })),
    mteReminder:
      "A documentação de questionários padronizados, isoladamente, não comprova gestão de riscos psicossociais. Resultados devem ser analisados tecnicamente e incorporados à AEP e/ou inventário, com plano de ação e revisão.",
  };

  const version =
    (await db.employerNr1Document.count({
      where: { employerCompanyId, docType: "COMPLIANCE_DOSSIER" },
    })) + 1;

  await db.employerNr1Document.create({
    data: {
      employerCompanyId,
      docType: "COMPLIANCE_DOSSIER",
      version,
      title: `Dossiê de conformidade NR-1/17/7 — v${version}`,
      contentJson: dossier,
    },
  });

  return dossier;
}
