import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { AuditAction } from "@prisma/client";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import {
  auditAngelEvent,
  enforceAngelRateLimit,
  resolveAngelAccess,
} from "@/lib/humanitarian/angel";
import { listOpenMissionsForAngel } from "@/lib/humanitarian/angel-missions";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ errorCode: "UNAUTHORIZED" }, { status: 401 });
  }
  if (session.user.role !== "ANGEL") {
    return NextResponse.json({ errorCode: "FORBIDDEN" }, { status: 403 });
  }

  const campaignSlug = new URL(req.url).searchParams.get("campaignSlug") || VENEZUELA_CAMPAIGN_SLUG;
  const access = await resolveAngelAccess(session.user.id, campaignSlug);
  if (!access.ok) {
    return NextResponse.json({ errorCode: access.reason, missions: [] }, { status: 403 });
  }

  const missions = await listOpenMissionsForAngel(session.user.id, campaignSlug);

  await auditAngelEvent({
    userId: session.user.id,
    action: AuditAction.VIEW_RECORD,
    campaignId: access.campaignId,
    details: { event: "angel_missions_list", count: missions.length },
  });

  return NextResponse.json({ missions });
}
