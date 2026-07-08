import { NextResponse } from "next/server";
import { z } from "zod";
import { requireEmployerApi } from "@/lib/api-auth";
import { aggregateSurveyResponses } from "@/lib/nr1-survey-report";
import { getNr1HazardByCode } from "@/lib/nr1-hazards";
import { classifyEmployerRisk } from "@/lib/nr1-risk-matrix";
import { refreshEmployerNr1Compliance } from "@/lib/employer-nr1";
import { db } from "@/lib/db";

const bodySchema = z.object({
  hazardCodes: z.array(z.string()).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST"]);
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const campaign = await db.employerSurveyCampaign.findFirst({
    where: { id, employerCompanyId: ctx.employerCompanyId },
    include: { responses: { select: { department: true, answersJson: true } } },
  });
  if (!campaign) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const report = aggregateSurveyResponses(campaign.responses, campaign.anonymousMinGroup);
  if (!report.meetsAnonymityThreshold) {
    return NextResponse.json({ error: "ANONYMITY_THRESHOLD" }, { status: 400 });
  }

  const codes = parsed.data.hazardCodes?.length
    ? parsed.data.hazardCodes
    : report.suggestedHazardsOverall;

  const existing = await db.employerRiskEntry.findMany({
    where: { employerCompanyId: ctx.employerCompanyId },
    select: { hazardCode: true },
  });
  const existingSet = new Set(existing.map((e) => e.hazardCode));

  const created: string[] = [];
  const skipped: string[] = [];

  for (const code of codes) {
    if (existingSet.has(code)) {
      skipped.push(code);
      continue;
    }
    const hazard = getNr1HazardByCode(code);
    if (!hazard) continue;

    const severity = 3;
    const probability = 3;
    await db.employerRiskEntry.create({
      data: {
        employerCompanyId: ctx.employerCompanyId,
        hazardCode: hazard.code,
        hazardLabel: hazard.labelPt,
        possibleHarm: hazard.possibleHarm,
        processDescription: `Sugerido pela pesquisa "${campaign.title}" (COPSOQ-lite).`,
        severity,
        probability,
        riskLevel: classifyEmployerRisk(severity, probability),
      },
    });
    existingSet.add(code);
    created.push(code);
  }

  if (created.length > 0) {
    await refreshEmployerNr1Compliance(ctx.employerCompanyId);
  }

  return NextResponse.json({ created, skipped, total: codes.length });
}
