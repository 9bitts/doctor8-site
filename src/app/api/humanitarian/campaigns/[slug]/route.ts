import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCampaignStats } from "@/lib/humanitarian/dispatcher";
import { poolLabel, VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import { seedVenezuelaCampaign } from "@/lib/humanitarian/seed-venezuela";

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } },
) {
  let campaign = await db.humanitarianCampaign.findUnique({
    where: { slug: params.slug },
  });

  if (!campaign && params.slug === VENEZUELA_CAMPAIGN_SLUG) {
    await seedVenezuelaCampaign();
    campaign = await db.humanitarianCampaign.findUnique({
      where: { slug: params.slug },
    });
  }

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const session = await auth();
  const lang = "es";

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
