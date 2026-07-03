import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requirePatient, isApiError } from "@/lib/api-auth";
import {
  AppointmentSlotTakenError,
  fulfillScheduledVolunteerConsultation,
} from "@/lib/fulfill-consultation";
import {
  assertScheduledVolunteerSlotBooking,
  VolunteerSlotBookingError,
} from "@/lib/volunteer-slot-booking";
import {
  MAX_FUTURE_SCHEDULED_VOLUNTEER_APPOINTMENTS,
  SCHEDULED_VOLUNTEER_BOOKING_SOURCE,
} from "@/lib/scheduled-volunteer";
import { z } from "zod";

const schema = z.object({
  professionalId: z.string(),
  scheduledAt: z.string().datetime(),
  type: z.enum(["TELECONSULT", "IN_PERSON"]),
  acceptedCancellationPolicy: z.boolean(),
  visitReason: z.string().max(2000).optional(),
  healthPlanSlug: z.string().max(80).optional(),
  healthPlanLabel: z.string().max(120).optional(),
  serviceId: z.string().optional(),
  serviceName: z.string().max(120).optional(),
});

export async function POST(req: NextRequest) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (!parsed.data.acceptedCancellationPolicy) {
    return NextResponse.json(
      { error: { code: "policy_required", general: ["Cancellation policy must be accepted."] } },
      { status: 400 },
    );
  }

  const { professionalId, scheduledAt, type } = parsed.data;

  try {
    await assertScheduledVolunteerSlotBooking(professionalId, "health", scheduledAt);
  } catch (e) {
    if (e instanceof VolunteerSlotBookingError) {
      return NextResponse.json(
        { error: { code: e.code, general: [e.code] } },
        { status: 400 },
      );
    }
    throw e;
  }

  const verified = await db.professionalProfile.findUnique({
    where: { id: professionalId, verified: true },
  });
  if (!verified) {
    return NextResponse.json(
      { error: { code: "provider_not_found", general: ["provider_not_found"] } },
      { status: 404 },
    );
  }

  const futureCount = await db.appointment.count({
    where: {
      patientId: ctx.patientProfileId,
      bookingSource: SCHEDULED_VOLUNTEER_BOOKING_SOURCE,
      status: { in: ["CONFIRMED", "PENDING"] },
      scheduledAt: { gte: new Date() },
    },
  });
  if (futureCount >= MAX_FUTURE_SCHEDULED_VOLUNTEER_APPOINTMENTS) {
    return NextResponse.json(
      { error: { code: "volunteer_limit_exceeded", general: ["volunteer_limit_exceeded"] } },
      { status: 429 },
    );
  }

  try {
    const result = await fulfillScheduledVolunteerConsultation({
      userId: ctx.userId,
      providerId: professionalId,
      scheduledAt,
      type,
      acceptedCancellationPolicy: parsed.data.acceptedCancellationPolicy,
      visitReason: parsed.data.visitReason,
      healthPlanSlug: parsed.data.healthPlanSlug,
      healthPlanLabel: parsed.data.healthPlanLabel,
      serviceId: parsed.data.serviceId,
      serviceName: parsed.data.serviceName,
    });

    await audit.viewRecord(ctx.userId, "Appointment", result.appointmentId);
    return NextResponse.json(
      { success: true, appointmentId: result.appointmentId },
      { status: result.created ? 201 : 200 },
    );
  } catch (e) {
    if (e instanceof AppointmentSlotTakenError) {
      return NextResponse.json(
        { error: { code: "slot_unavailable", general: ["slot_unavailable"] } },
        { status: 409 },
      );
    }
    if (e instanceof VolunteerSlotBookingError) {
      return NextResponse.json(
        { error: { code: e.code, general: [e.code] } },
        { status: 409 },
      );
    }
    throw e;
  }
}
