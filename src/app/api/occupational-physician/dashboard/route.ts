import { NextResponse } from "next/server";
import { requireOccupationalPhysicianApi } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { parsePcmsoChecklist, pcmsoCompletionPercent } from "@/lib/employer-pcmso-checklist";

export async function GET() {
  const ctx = await requireOccupationalPhysicianApi();
  if ("error" in ctx) return ctx.error;

  const companyIds = ctx.links.map((l) => l.employerCompanyId);
  if (companyIds.length === 0) {
    return NextResponse.json({ companies: [] });
  }

  const [riskCounts, pcmsoConfigs] = await Promise.all([
    db.employerRiskEntry.groupBy({
      by: ["employerCompanyId"],
      where: {
        employerCompanyId: { in: companyIds },
        riskLevel: { in: ["HIGH", "CRITICAL"] },
      },
      _count: { id: true },
    }),
    db.employerPcmsoConfig.findMany({
      where: { employerCompanyId: { in: companyIds } },
    }),
  ]);

  const riskByCompany = new Map(riskCounts.map((r) => [r.employerCompanyId, r._count.id]));
  const pcmsoByCompany = new Map(pcmsoConfigs.map((c) => [c.employerCompanyId, c]));

  const companies = ctx.links.map((link) => {
    const pcmso = pcmsoByCompany.get(link.employerCompanyId);
    const checklist = parsePcmsoChecklist(pcmso?.checklistJson);
    return {
      linkId: link.id,
      companyId: link.company.id,
      nomeFantasia: link.company.nomeFantasia,
      razaoSocial: link.company.razaoSocial,
      cnpj: link.company.cnpj,
      highRiskCount: riskByCompany.get(link.employerCompanyId) ?? 0,
      pcmsoCompletionPercent: pcmsoCompletionPercent(checklist),
      coordinatorName: pcmso?.coordinatorName ?? link.fullName,
      lastReviewAt: pcmso?.lastReviewAt?.toISOString() ?? null,
    };
  });

  const totalHighRisks = companies.reduce((sum, c) => sum + c.highRiskCount, 0);

  return NextResponse.json({
    companies,
    summary: {
      companyCount: companies.length,
      totalHighRisks,
    },
  });
}
