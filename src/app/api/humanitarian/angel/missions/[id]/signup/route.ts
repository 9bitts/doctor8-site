import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { AuditAction } from "@prisma/client";
import { z } from "zod";
import { auditAngelEvent, enforceAngelRateLimit } from "@/lib/humanitarian/angel";
import { cancelMissionSignup, signupForMission } from "@/lib/humanitarian/angel-missions";

const postSchema = z.object({
  note: z.string().max(500).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ errorCode: "UNAUTHORIZED" }, { status: 401 });
  }
  if (session.user.role !== "ANGEL") {
    return NextResponse.json({ errorCode: "FORBIDDEN" }, { status: 403 });
  }

  const rateLimited = await enforceAngelRateLimit(req, session.user.id, "mission-signup");
  if (rateLimited) return rateLimited;

  const { id: missionId } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await signupForMission({
    userId: session.user.id,
    missionId,
    note: parsed.data.note,
  });

  if (!result.ok) {
    const status = result.code === "ALREADY_SIGNED_UP" ? 409 : 403;
    return NextResponse.json(
      {
        errorCode: result.code,
        requiredCourseIds: result.requiredCourseIds,
      },
      { status },
    );
  }

  await auditAngelEvent({
    userId: session.user.id,
    action: AuditAction.CREATE_RECORD,
    details: { event: "angel_mission_signup", missionId, signupId: result.signupId },
  });

  return NextResponse.json({ success: true, signupId: result.signupId, status: result.status });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ errorCode: "UNAUTHORIZED" }, { status: 401 });
  }
  if (session.user.role !== "ANGEL") {
    return NextResponse.json({ errorCode: "FORBIDDEN" }, { status: 403 });
  }

  const rateLimited = await enforceAngelRateLimit(req, session.user.id, "mission-cancel");
  if (rateLimited) return rateLimited;

  const { id: missionId } = await params;
  const ok = await cancelMissionSignup(session.user.id, missionId);
  if (!ok) {
    return NextResponse.json({ errorCode: "NOT_FOUND" }, { status: 404 });
  }

  await auditAngelEvent({
    userId: session.user.id,
    action: AuditAction.UPDATE_RECORD,
    details: { event: "angel_mission_cancel", missionId },
  });

  return NextResponse.json({ success: true });
}
