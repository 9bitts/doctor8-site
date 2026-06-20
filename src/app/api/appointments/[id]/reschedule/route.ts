// src/app/api/appointments/[id]/reschedule/route.ts
// Patient reschedules to a new slot with the same professional.
// Only allowed if appointment is CONFIRMED and more than 24h away.
// No extra charge — slot swap only.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { scheduleAppointmentReminders } from "@/lib/qstash";
import { z } from "zod";

const schema = z.object({
  newScheduledAt: z.string().datetime(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PATIENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const { newScheduledAt } = parsed.data;

  const appointment = await db.appointment.findUnique({
    where: { id: params.id },
    include: {
      patient:      { select: { userId: true } },
      professional: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  if (!appointment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (appointment.patient.userId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!["CONFIRMED", "PENDING"].includes(appointment.status)) {
    return NextResponse.json({ error: "Cannot reschedule a cancelled or completed appointment" }, { status: 400 });
  }

  const hoursUntil = (new Date(appointment.scheduledAt).getTime() - Date.now()) / 3600000;
  if (hoursUntil < 24) {
    return NextResponse.json({
      error: "Cannot reschedule with less than 24h notice. Please cancel instead.",
    }, { status: 400 });
  }

  // Check new slot is available
  const conflict = await db.appointment.findFirst({
    where: {
      professionalId: appointment.professionalId,
      scheduledAt:    new Date(newScheduledAt),
      status:         { in: ["CONFIRMED", "PENDING"] },
      id:             { not: params.id }, // exclude self
    },
  });
  if (conflict) return NextResponse.json({ error: "This slot is no longer available." }, { status: 409 });

  await db.appointment.update({
    where: { id: params.id },
    data:  { scheduledAt: new Date(newScheduledAt) },
  });

  await audit.updateRecord(session.user.id, "Appointment", params.id);

  // Reschedule QStash reminders for new time
  scheduleAppointmentReminders(params.id, new Date(newScheduledAt)).catch(() => {});

  // Send confirmation email
  try {
    const patientUser = await db.user.findUnique({
      where:  { id: session.user.id },
      select: { email: true },
    });
    const patientProfile = await db.patientProfile.findUnique({
      where:  { userId: session.user.id },
      select: { firstName: true, lastName: true },
    });
    if (patientUser && patientProfile) {
      const { sendAppointmentConfirmation } = await import("@/lib/email");
      await sendAppointmentConfirmation({
        patientEmail:  patientUser.email,
        patientName:   `${patientProfile.firstName} ${patientProfile.lastName}`,
        doctorName:    `${appointment.professional.firstName} ${appointment.professional.lastName}`,
        specialty:     "",
        scheduledAt:   new Date(newScheduledAt),
        type:          appointment.type,
        appointmentId: params.id,
      });
    }
  } catch (e) {
    console.error("[RESCHEDULE EMAIL ERROR]", e);
  }

  return NextResponse.json({
    success:      true,
    appointmentId: params.id,
    newScheduledAt,
  });
}
