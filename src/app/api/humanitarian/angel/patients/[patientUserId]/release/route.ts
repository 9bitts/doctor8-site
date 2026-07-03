import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { AuditAction } from "@prisma/client";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import {
  auditAngelEvent,
  enforceAngelRateLimit,
  releaseAngelPatient,
  resolveAngelAccess,
} from "@/lib/humanitarian/angel";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ patientUserId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ errorCode: "UNAUTHORIZED", error: "Unauthorized" }, { status: 401 });
  }

  const { patientUserId } = await params;
  const campaignSlug = new URL(req.url).searchParams.get("campaignSlug") || VENEZUELA_CAMPAIGN_SLUG;

  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin && session.user.role !== "ANGEL") {
    return NextResponse.json({ errorCode: "FORBIDDEN", error: "Forbidden" }, { status: 403 });
  }

  const rateLimited = await enforceAngelRateLimit(req, session.user.id, "release");
  if (rateLimited) return rateLimited;

  let campaignId: string;
  let angelUserId = session.user.id;

  if (isAdmin) {
    const body = await req.json().catch(() => ({}));
    const targetAngelId = typeof body.angelUserId === "string" ? body.angelUserId : null;
    if (!targetAngelId) {
      return NextResponse.json(
        { errorCode: "VALIDATION_ERROR", error: "angelUserId required for admin release" },
        { status: 400 },
      );
    }
    angelUserId = targetAngelId;
    const campaign = await db.humanitarianCampaign.findUnique({
      where: { slug: campaignSlug },
      select: { id: true },
    });
    if (!campaign) {
      return NextResponse.json({ errorCode: "NOT_FOUND", error: "Campaign not found" }, { status: 404 });
    }
    campaignId = campaign.id;
  } else {
    const access = await resolveAngelAccess(session.user.id, campaignSlug);
    if (!access.ok) {
      return NextResponse.json({ errorCode: access.reason, error: access.reason }, { status: 403 });
    }
    campaignId = access.campaignId;
  }

  const released = await releaseAngelPatient(campaignId, angelUserId, patientUserId);
  if (!released) {
    return NextResponse.json(
      { errorCode: "NOT_FOUND", error: "No active assignment" },
      { status: 404 },
    );
  }

  await auditAngelEvent({
    userId: session.user.id,
    action: AuditAction.UPDATE_RECORD,
    patientUserId,
    campaignId,
    details: { event: "angel_release", angelUserId },
  });

  return NextResponse.json({ success: true });
}
