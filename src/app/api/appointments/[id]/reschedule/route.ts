// src/app/api/appointments/[id]/reschedule/route.ts
// Patient reschedules to a new slot with the same professional.
// Only allowed if appointment is CONFIRMED and more than 24h away.
// No extra charge — slot swap only.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { scheduleAppointmentReminders, schedulePostConsultNotesReminder, scheduleReviewRequest } from "@/lib/qstash";
import { notifySlotAlerts } from "@/lib/slot-alerts";
import { decryptPatientName, safeDecrypt } from "@/lib/psychoanalyst-api";
import {
  AppointmentSlotTakenError,
  isActiveSlotUniqueViolation,
} from "@/lib/fulfill-consultation";
import {
  assertScheduledVolunteerSlotBooking,
  VolunteerSlotBookingError,
} from "@/lib/volunteer-slot-booking";
import { resolveVolunteerScheduledProvider } from "@/lib/scheduled-volunteer";
import { Prisma } from "@prisma/client";
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
      psychoanalyst: { select: { id: true, firstName: true, lastName: true } },
      integrativeTherapist: { select: { id: true, firstName: true, lastName: true } },
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

  const volunteerProvider = resolveVolunteerScheduledProvider(appointment);

  if (volunteerProvider) {
    try {
      await assertScheduledVolunteerSlotBooking(
        volunteerProvider.id,
        volunteerProvider.type,
        newScheduledAt,
      );
    } catch (e) {
      if (e instanceof VolunteerSlotBookingError) {
        const status = e.code === "volunteer_scheduled_not_approved" ? 403 : 409;
        return NextResponse.json(
          { error: { code: e.code, general: [e.code] } },
          { status },
        );
      }
      throw e;
    }
  }

  const previousScheduledAt = appointment.scheduledAt;
  const newScheduledDate = new Date(newScheduledAt);

  try {
    await db.$transaction(
      async (tx) => {
        if (volunteerProvider) {
          await assertScheduledVolunteerSlotBooking(
            volunteerProvider.id,
            volunteerProvider.type,
            newScheduledAt,
            tx,
          );
        }

        const conflict = await tx.appointment.findFirst({
          where: {
            ...(appointment.professionalId ? { professionalId: appointment.professionalId } : {}),
            ...(appointment.psychoanalystId ? { psychoanalystId: appointment.psychoanalystId } : {}),
            ...(appointment.integrativeTherapistId
              ? { integrativeTherapistId: appointment.integrativeTherapistId }
              : {}),
            scheduledAt: newScheduledDate,
            status: { in: ["CONFIRMED", "PENDING"] },
            id: { not: params.id },
          },
        });
        if (conflict) throw new AppointmentSlotTakenError();

        await tx.appointment.update({
          where: { id: params.id },
          data: {
            scheduledAt: newScheduledDate,
            remindersEpoch: { increment: 1 },
            reminder24hSent: false,
            reminder1hSent: false,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (e) {
    if (e instanceof AppointmentSlotTakenError) {
      return NextResponse.json(
        { error: { code: "slot_unavailable", general: ["slot_unavailable"] } },
        { status: 409 },
      );
    }
    if (e instanceof VolunteerSlotBookingError) {
      const status = e.code === "volunteer_scheduled_not_approved" ? 403 : 409;
      return NextResponse.json(
        { error: { code: e.code, general: [e.code] } },
        { status },
      );
    }
    if (isActiveSlotUniqueViolation(e)) {
      return NextResponse.json(
        { error: { code: "slot_unavailable", general: ["slot_unavailable"] } },
        { status: 409 },
      );
    }
    throw e;
  }

  await audit.updateRecord(session.user.id, "Appointment", params.id);

  // Reschedule QStash reminders for new time
  scheduleAppointmentReminders(params.id, new Date(newScheduledAt)).catch(() => {});
  scheduleReviewRequest(params.id, new Date(newScheduledAt), appointment.durationMins).catch(() => {});
  schedulePostConsultNotesReminder(
    params.id,
    new Date(newScheduledAt),
    appointment.durationMins,
  ).catch(() => {});

  import("@/lib/google-calendar-sync")
    .then((m) => m.syncAppointmentToGoogleCalendar(params.id))
    .catch(() => {});

  notifySlotAlerts({
    professionalId: appointment.professionalId,
    psychoanalystId: appointment.psychoanalystId,
    integrativeTherapistId: appointment.integrativeTherapistId,
    freedAt: previousScheduledAt,
  }).catch((err) => console.error("[RESCHEDULE] Slot alert notify failed:", err));

  // Send confirmation email
  try {
    const patientUser = await db.user.findUnique({
      where:  { id: session.user.id },
      select: { email: true, language: true, timezone: true } as never,
    }) as { email: string; language: string | null; timezone?: string } | null;
    const patientProfile = await db.patientProfile.findUnique({
      where:  { userId: session.user.id },
      select: { firstName: true, lastName: true },
    });
    if (patientUser && patientProfile) {
      const doctorName = appointment.professional
        ? `${appointment.professional.firstName} ${appointment.professional.lastName}`
        : appointment.psychoanalyst
          ? `${safeDecrypt(appointment.psychoanalyst.firstName)} ${safeDecrypt(appointment.psychoanalyst.lastName)}`
          : appointment.integrativeTherapist
            ? `${appointment.integrativeTherapist.firstName} ${appointment.integrativeTherapist.lastName}`
            : "Profissional";
      const { sendAppointmentConfirmation } = await import("@/lib/email");
      await sendAppointmentConfirmation({
        patientEmail:  patientUser.email,
        patientName:   decryptPatientName(patientProfile.firstName, patientProfile.lastName),
        doctorName,
        specialty:     "",
        scheduledAt:   new Date(newScheduledAt),
        type:          appointment.type,
        appointmentId: params.id,
        language:      patientUser.language ?? undefined,
        patientTimezone: patientUser.timezone,
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
