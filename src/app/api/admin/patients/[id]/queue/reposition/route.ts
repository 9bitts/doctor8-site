// ADMIN ONLY ? reposition patient in humanitarian queue.
import { NextRequest, NextResponse } from "next/server";
import { getPatientAdminSession } from "@/lib/admin";
import { createAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { adminRepositionInQueue } from "@/lib/humanitarian/admin-queue";
import { AuditAction } from "@prisma/client";
import { z } from "zod";

export const runtime = "nodejs";

const schema = z.object({
  entryId: z.string().min(1),
  position: z.number().int().min(1).max(9999),
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
    select: { patientUserId: true, status: true },
  });
  if (!entry || entry.patientUserId !== profile.userId) {
    return NextResponse.json({ error: "Entry not found for patient" }, { status: 404 });
  }

  const ok = await adminRepositionInQueue(parsed.data.entryId, parsed.data.position);
  if (!ok) {
    return NextResponse.json({ error: "Cannot reposition ? entry must be WAITING" }, { status: 409 });
  }

  await createAuditLog({
    userId: session.user.id,
    action: AuditAction.UPDATE_RECORD,
    resource: "HumanitarianQueueEntry",
    resourceId: parsed.data.entryId,
    details: {
      adminAction: "reposition_queue",
      patientProfileId: profile.id,
      patientUserId: profile.userId,
      newPosition: parsed.data.position,
    },
  });

  return NextResponse.json({ success: true });
}
