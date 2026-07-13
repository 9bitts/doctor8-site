import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { AuditAction } from "@prisma/client";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import {
  auditAngelEvent,
  claimAngelPatient,
  enforceAngelRateLimit,
  MAX_PATIENTS_PER_ANGEL,
  resolveAngelAccess,
} from "@/lib/humanitarian/angel";
import { hasCompletedTrackTraining } from "@/lib/humanitarian/angel-training";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ patientUserId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ errorCode: "UNAUTHORIZED", error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ANGEL") {
    return NextResponse.json({ errorCode: "FORBIDDEN", error: "Forbidden" }, { status: 403 });
  }

  const rateLimited = await enforceAngelRateLimit(req, session.user.id, "claim");
  if (rateLimited) return rateLimited;

  const { patientUserId } = await params;
  const campaignSlug = new URL(req.url).searchParams.get("campaignSlug") || VENEZUELA_CAMPAIGN_SLUG;

  const access = await resolveAngelAccess(session.user.id, campaignSlug);
  if (!access.ok) {
    return NextResponse.json({ errorCode: access.reason, error: access.reason }, { status: 403 });
  }

  const training = await hasCompletedTrackTraining({ userId: session.user.id, track: "ESCUTA" });
  if (!training.ok) {
    return NextResponse.json(
      {
        errorCode: "TRAINING_REQUIRED",
        error: "TRAINING_REQUIRED",
        requiredCourseIds: training.requiredCourseIds,
      },
      { status: 403 },
    );
  }

  const result = await claimAngelPatient(access.campaignId, session.user.id, patientUserId);

  if (!result.ok) {
    const status =
      result.code === "LIMIT_REACHED" || result.code === "ALREADY_ASSIGNED" ? 409 : 403;
    return NextResponse.json(
      {
        errorCode: result.code,
        error: result.code,
        maxPatients: MAX_PATIENTS_PER_ANGEL,
      },
      { status },
    );
  }

  await auditAngelEvent({
    userId: session.user.id,
    action: AuditAction.CREATE_RECORD,
    patientUserId,
    campaignId: access.campaignId,
    details: { event: "angel_claim", assignmentId: result.assignmentId },
  });

  return NextResponse.json({ success: true, assignmentId: result.assignmentId });
}
