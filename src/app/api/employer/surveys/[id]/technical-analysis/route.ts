import { NextResponse } from "next/server";
import { z } from "zod";
import { requireEmployerApi } from "@/lib/api-auth";
import { aggregateSurveyResponses } from "@/lib/nr1-survey-report";
import { db } from "@/lib/db";

const bodySchema = z.object({
  analyzedByName: z.string().min(2).max(200),
  technicalNotes: z.string().min(20).max(8000),
  methodsUsed: z
    .array(z.enum(["SURVEY", "OBSERVATION", "INTERVIEWS", "WHISTLEBLOWER", "DOCUMENT_REVIEW"]))
    .min(1),
  confirmedHazardCodes: z.array(z.string()).optional(),
  remoteWorkIncluded: z.boolean().optional(),
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

  const report = aggregateSurveyResponses(
    campaign.responses,
    campaign.anonymousMinGroup,
    campaign.instrument,
  );
  if (!report.meetsAnonymityThreshold) {
    return NextResponse.json({ error: "ANONYMITY_THRESHOLD" }, { status: 400 });
  }

  const analysisJson = {
    version: 1 as const,
    technicalNotes: parsed.data.technicalNotes.trim(),
    methodsUsed: parsed.data.methodsUsed,
    confirmedHazardCodes:
      parsed.data.confirmedHazardCodes?.length
        ? parsed.data.confirmedHazardCodes
        : report.suggestedHazardsOverall,
    suggestedHazardCodes: report.suggestedHazardsOverall,
    remoteWorkIncluded: parsed.data.remoteWorkIncluded ?? false,
    reportSnapshot: {
      totalResponses: report.totalResponses,
      overallDimensions: report.overallDimensions,
      byDepartmentCount: report.byDepartment.length,
    },
    mteNote:
      "Resultados de questionário incorporados à análise técnica do GRO; questionário isolado não constitui evidência suficiente (FAQ MTE Cap. 1.5).",
  };

  const updated = await db.employerSurveyCampaign.update({
    where: { id: campaign.id },
    data: {
      analysisJson,
      analyzedAt: new Date(),
      analyzedByName: parsed.data.analyzedByName.trim(),
      status: campaign.status === "ACTIVE" ? "CLOSED" : campaign.status,
      endsAt: campaign.endsAt ?? new Date(),
    },
  });

  return NextResponse.json({
    campaign: {
      id: updated.id,
      analyzedAt: updated.analyzedAt,
      analyzedByName: updated.analyzedByName,
      analysisJson: updated.analysisJson,
      status: updated.status,
    },
  });
}
