// ADMIN ONLY ? remove patient from humanitarian queue with reason.
import { NextRequest, NextResponse } from "next/server";
import { getPatientAdminSession } from "@/lib/admin";
import { createAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { adminRemoveFromQueue } from "@/lib/humanitarian/admin-queue";
import { AuditAction } from "@prisma/client";
import { z } from "zod";

export const runtime = "nodejs";

const schema = z.object({
  entryId: z.string().min(1),
  reason: z.string().min(3).max(2000),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getPatientAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const profile = await db.patientProfile.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true },
  });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const entry = await db.humanitarianQueueEntry.findUnique({
    where: { id: parsed.data.entryId },
    select: { patientUserId: true },
  });
  if (!entry || entry.patientUserId !== profile.userId) {
    return NextResponse.json({ error: "Entry not found for patient" }, { status: 404 });
  }

  const result = await adminRemoveFromQueue(
    parsed.data.entryId,
    session.user.id,
    parsed.data.reason,
  );
  if (!result) {
    return NextResponse.json({ error: "Cannot remove ? entry not in queue" }, { status: 409 });
  }

  await createAuditLog({
    userId: session.user.id,
    action: AuditAction.DELETE_RECORD,
    resource: "HumanitarianQueueEntry",
    resourceId: parsed.data.entryId,
    details: {
      adminAction: "remove_from_queue",
      patientProfileId: profile.id,
      patientUserId: profile.userId,
      reason: parsed.data.reason,
    },
  });

  return NextResponse.json({ success: true });
}
