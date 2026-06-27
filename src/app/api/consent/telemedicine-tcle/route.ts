import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import {
  getTelemedicineTcleStatus,
  recordTelemedicineTcle,
} from "@/lib/consent/telemedicine-tcle";

const postSchema = z.object({
  campaignSlug: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = await getTelemedicineTcleStatus(session.user.id);
  return NextResponse.json(status);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Only patients sign the TCLE" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let campaignId: string | null = null;
  if (parsed.data.campaignSlug) {
    const campaign = await db.humanitarianCampaign.findUnique({
      where: { slug: parsed.data.campaignSlug },
      select: { id: true, active: true },
    });
    if (!campaign?.active) {
      return NextResponse.json({ error: "Campaign not available" }, { status: 404 });
    }
    campaignId = campaign.id;
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;

  await recordTelemedicineTcle({
    userId: session.user.id,
    ipAddress: ip,
    userAgent: req.headers.get("user-agent"),
    campaignId,
  });

  const status = await getTelemedicineTcleStatus(session.user.id);
  return NextResponse.json({ ok: true, ...status });
}
