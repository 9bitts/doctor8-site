import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AuditAction } from "@prisma/client";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import { auditAngelEvent, revokeAngelContactConsent } from "@/lib/humanitarian/angel";
import { z } from "zod";

const postSchema = z.object({
  campaignSlug: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ errorCode: "UNAUTHORIZED", error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "PATIENT") {
    return NextResponse.json({ errorCode: "FORBIDDEN", error: "Forbidden" }, { status: 403 });
  }

  const campaignSlug =
    new URL(req.url).searchParams.get("campaignSlug") || VENEZUELA_CAMPAIGN_SLUG;

  const campaign = await db.humanitarianCampaign.findUnique({
    where: { slug: campaignSlug },
    select: { id: true },
  });
  if (!campaign) {
    return NextResponse.json({ hasConsent: false, campaignSlug });
  }

  const intake = await db.humanitarianIntake.findUnique({
    where: {
      campaignId_patientUserId: {
        campaignId: campaign.id,
        patientUserId: session.user.id,
      },
    },
    select: { angelContactConsentAt: true },
  });

  return NextResponse.json({
    hasConsent: Boolean(intake?.angelContactConsentAt),
    campaignSlug,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ errorCode: "UNAUTHORIZED", error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "PATIENT") {
    return NextResponse.json({ errorCode: "FORBIDDEN", error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { errorCode: "VALIDATION_ERROR", error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const campaignSlug = parsed.data.campaignSlug || VENEZUELA_CAMPAIGN_SLUG;
  const result = await revokeAngelContactConsent(session.user.id, campaignSlug);

  if (!result.ok) {
    return NextResponse.json(
      { errorCode: "NOT_FOUND", error: "No angel consent on file" },
      { status: 404 },
    );
  }

  await auditAngelEvent({
    userId: session.user.id,
    action: AuditAction.UPDATE_RECORD,
    patientUserId: session.user.id,
    campaignId: result.campaignId,
    details: { event: "patient_angel_optout" },
  });

  return NextResponse.json({ success: true });
}
