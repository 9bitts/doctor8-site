import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AppointmentStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireIntegrativeTherapist } from "@/lib/integrative-therapist-api";
import { notifyPatientAppointmentConfirmed } from "@/lib/pro-appointment-notify";

const bodySchema = z.object({
  action: z.enum(["confirm", "complete", "no_show"]),
});

const TRANSITIONS: Record<string, { from: AppointmentStatus[]; to: AppointmentStatus }> = {
  confirm: { from: ["PENDING"], to: "CONFIRMED" },
  complete: { from: ["CONFIRMED"], to: "COMPLETED" },
  no_show: { from: ["CONFIRMED"], to: "NO_SHOW" },
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireIntegrativeTherapist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { session, therapist } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const transition = TRANSITIONS[parsed.data.action];
  if (!transition) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const appointment = await db.appointment.findFirst({
    where: {
      id: params.id,
      integrativeTherapistId: therapist.id,
    },
    include: {
      patient: {
        select: {
          firstName: true,
          lastName: true,
          userId: true,
          user: { select: { email: true, language: true, timezone: true } },
        },
      },
    },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!transition.from.includes(appointment.status)) {
    return NextResponse.json(
      { error: "INVALID_STATUS_TRANSITION", current: appointment.status },
      { status: 409 },
    );
  }

  const updated = await db.appointment.update({
    where: { id: appointment.id },
    data: { status: transition.to },
  });

  await audit.updateRecord(session.user.id, "Appointment", appointment.id);

  if (parsed.data.action === "confirm" && appointment.patient.userId && appointment.patient.user) {
    await notifyPatientAppointmentConfirmed({
      appointmentId: appointment.id,
      scheduledAt: appointment.scheduledAt,
      type: appointment.type,
      meetingUrl: appointment.meetingUrl,
      integrativeTherapistId: therapist.id,
      patientUserId: appointment.patient.userId,
      patientFirstName: appointment.patient.firstName,
      patientLastName: appointment.patient.lastName,
      patientEmail: appointment.patient.user.email,
      patientLanguage: appointment.patient.user.language,
      patientTimezone: appointment.patient.user.timezone,
    }).catch((e) => console.error("[IT-APPT-STATUS] Patient notify failed:", e));
  }

  return NextResponse.json({ appointment: { id: updated.id, status: updated.status } });
}
