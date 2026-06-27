import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCampaignStats } from "@/lib/humanitarian/dispatcher";
import { poolLabel } from "@/lib/humanitarian/constants";
export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const campaign = await db.humanitarianCampaign.findUnique({
    where: { slug: params.slug },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const session = await auth();
  const langParam = new URL(_req.url).searchParams.get("lang") || "es";
  const lang = langParam.startsWith("pt") ? "pt" : langParam.startsWith("en") ? "en" : "es";

  const poolStats = await getCampaignStats(campaign.id);

  return NextResponse.json({
    campaign: {
      id: campaign.id,
      slug: campaign.slug,
      name: campaign.name,
      description: campaign.description,
      active: campaign.active,
      region: campaign.region,
      estimatedMinutesPerPatient: campaign.estimatedMinutesPerPatient,
    },
    pools: poolStats.map((p) => ({
      id: p.id,
      slug: p.slug,
      label: poolLabel(p, lang),
      maxWaiting: p.maxWaiting,
      waiting: p.waiting,
      volunteersOnline: p.volunteersOnline,
      volunteersBusy: p.volunteersBusy,
      isFull: p.isFull,
    })),
  });
}
