import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import {
  getVolunteerOnlineAlertStatus,
  setVolunteerOnlineAlert,
} from "@/lib/humanitarian/volunteer-online-alert";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const campaignSlug = req.nextUrl.searchParams.get("campaignSlug");
  if (!campaignSlug) {
    return NextResponse.json({ error: "campaignSlug required" }, { status: 400 });
  }

  const campaign = await db.humanitarianCampaign.findUnique({
    where: { slug: campaignSlug },
    select: { id: true },
  });
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const subscribed = await getVolunteerOnlineAlertStatus(session.user.id, campaign.id);
  return NextResponse.json({ subscribed });
}

const postSchema = z.object({
  campaignSlug: z.string().min(1),
  active: z.boolean(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const campaign = await db.humanitarianCampaign.findUnique({
    where: { slug: parsed.data.campaignSlug },
    select: { id: true, active: true },
  });
  if (!campaign?.active) {
    return NextResponse.json({ error: "Campaign unavailable" }, { status: 404 });
  }

  await setVolunteerOnlineAlert(session.user.id, campaign.id, parsed.data.active);
  return NextResponse.json({ subscribed: parsed.data.active });
}
