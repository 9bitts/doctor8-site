import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { buildCampaignLiveOps } from "@/lib/humanitarian/admin-live";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const slug =
    new URL(req.url).searchParams.get("slug") || VENEZUELA_CAMPAIGN_SLUG;

  const campaign = await db.humanitarianCampaign.findUnique({ where: { slug } });
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found", ops: null }, { status: 404 });
  }

  const ops = await buildCampaignLiveOps(campaign.id);
  return NextResponse.json({ ops });
}
