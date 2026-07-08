import { NextResponse } from "next/server";
import { requireEmployerApi } from "@/lib/api-auth";
import { aggregateSurveyResponses } from "@/lib/nr1-survey-report";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST", "HR", "VIEWER"]);
  if ("error" in ctx) return ctx.error;

  const { id } = await params;

  const campaign = await db.employerSurveyCampaign.findFirst({
    where: { id, employerCompanyId: ctx.employerCompanyId },
    include: {
      responses: {
        select: { department: true, answersJson: true },
      },
    },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const report = aggregateSurveyResponses(
    campaign.responses,
    campaign.anonymousMinGroup,
    campaign.instrument,
  );

  return NextResponse.json({
    campaign: {
      id: campaign.id,
      title: campaign.title,
      status: campaign.status,
      instrument: campaign.instrument,
    },
    report,
  });
}
