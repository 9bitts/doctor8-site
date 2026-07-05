// ADMIN ONLY ? mark consultation as problem with note.
import { NextRequest, NextResponse } from "next/server";
import { getPatientAdminSession } from "@/lib/admin";
import { createAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { AuditAction } from "@prisma/client";
import { z } from "zod";

export const runtime = "nodejs";

const schema = z.object({
  kind: z.enum(["humanitarian", "appointment"]),
  consultId: z.string().min(1),
  note: z.string().min(3).max(2000),
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

  const now = new Date();
  const adminId = session.user.id;

  if (parsed.data.kind === "humanitarian") {
    const entry = await db.humanitarianQueueEntry.findUnique({
      where: { id: parsed.data.consultId },
      select: { patientUserId: true },
    });
    if (!entry || entry.patientUserId !== profile.userId) {
      return NextResponse.json({ error: "Consultation not found" }, { status: 404 });
    }

    await db.humanitarianQueueEntry.update({
      where: { id: parsed.data.consultId },
      data: {
        adminProblemAt: now,
        adminProblemNote: parsed.data.note,
        adminProblemById: adminId,
      },
    });

    await createAuditLog({
      userId: adminId,
      action: AuditAction.UPDATE_RECORD,
      resource: "HumanitarianQueueEntry",
      resourceId: parsed.data.consultId,
      details: {
        adminAction: "mark_problem",
        patientProfileId: profile.id,
        note: parsed.data.note,
      },
    });
  } else {
    const appt = await db.appointment.findUnique({
      where: { id: parsed.data.consultId },
      select: { patientId: true },
    });
    if (!appt || appt.patientId !== profile.id) {
      return NextResponse.json({ error: "Consultation not found" }, { status: 404 });
    }

    await db.appointment.update({
      where: { id: parsed.data.consultId },
      data: {
        adminProblemAt: now,
        adminProblemNote: parsed.data.note,
        adminProblemById: adminId,
      },
    });

    await createAuditLog({
      userId: adminId,
      action: AuditAction.UPDATE_RECORD,
      resource: "Appointment",
      resourceId: parsed.data.consultId,
      details: {
        adminAction: "mark_problem",
        patientProfileId: profile.id,
        note: parsed.data.note,
      },
    });
  }

  return NextResponse.json({ success: true });
}
