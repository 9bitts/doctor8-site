// src/app/api/appointments/route.ts
// List and create appointments.
// On creation: schedules QStash reminders (24h email + 3h email/WhatsApp/bell).
// Cancellation policy checkbox is recorded in appointment metadata.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { stripe } from "@/lib/stripe";
import { scheduleAppointmentReminders } from "@/lib/qstash";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const upcoming = searchParams.get("upcoming") === "true";

  let appointments;

  if (session.user.role === "PATIENT") {
    const patient = await db.patientProfile.findUnique({ where: { userId: session.user.id } });
    if (!patient) return NextResponse.json({ appointments: [] });

    appointments = await db.appointment.findMany({
      where: {
        patientId: patient.id,
        ...(status ? { status: status as any } : {}),
        ...(upcoming ? { scheduledAt: { gte: new Date() } } : {}),
      },
      include: {
        professional: {
          select: { firstName: true, lastName: true, specialty: true, avatarUrl: true },
        },
      },
      orderBy: { scheduledAt: upcoming ? "asc" : "desc" },
      take: 50,
    });
  } else if (session.user.role === "PROFESSIONAL") {
    const professional = await db.professionalProfile.findUnique({ where: { userId: session.user.id } });
    if (!professional) return NextResponse.json({ appointments: [] });

    appointments = await db.appointment.findMany({
      where: {
        professionalId: professional.id,
        ...(status ? { status: status as any } : {}),
        ...(upcoming ? { scheduledAt: { gte: new Date() } } : {}),
      },
      include: {
        patient: { select: { firstName: true, lastName: true, avatarUrl: true } },
      },
      orderBy: { scheduledAt: upcoming ? "asc" : "desc" },
      take: 50,
    });
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await audit.viewRecord(session.user.id, "Appointment", "list");
  return NextResponse.json({ appointments });
}

const createSchema = z.object({
  professionalId:        z.string(),
  scheduledAt:           z.string().datetime(),
  type:                  z.enum(["TELECONSULT", "IN_PERSON"]),
  stripePaymentIntentId: z.string(),
  priceAmount:           z.number(),
  currency:              z.string(),
  // CDC checkbox — patient must accept cancellation policy
  acceptedCancellationPolicy: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PATIENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { professionalId, scheduledAt, type, stripePaymentIntentId, acceptedCancellationPolicy } = parsed.data;

  const patient = await db.patientProfile.findUnique({ where: { userId: session.user.id } });
  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  const professional = await db.professionalProfile.findUnique({
    where: { id: professionalId, verified: true },
  });
  if (!professional) return NextResponse.json({ error: "Professional not found" }, { status: 404 });

  // Verify Stripe payment server-side
  let intent;
  try {
    intent = await stripe.paymentIntents.retrieve(stripePaymentIntentId);
  } catch {
    return NextResponse.json({ error: { general: ["Payment could not be verified."] } }, { status: 402 });
  }

  if (intent.status !== "succeeded") {
    return NextResponse.json({ error: { general: ["Payment has not been completed."] } }, { status: 402 });
  }

  const meta = intent.metadata || {};
  if (
    meta.userId !== session.user.id ||
    meta.professionalId !== professionalId ||
    meta.scheduledAt !== scheduledAt
  ) {
    return NextResponse.json({ error: { general: ["Payment does not match this booking."] } }, { status: 400 });
  }

  // Idempotency
  const alreadyUsed = await db.appointment.findFirst({ where: { stripePaymentId: intent.id } });
  if (alreadyUsed) return NextResponse.json({ success: true, appointmentId: alreadyUsed.id }, { status: 200 });

  // Check slot still available
  const existing = await db.appointment.findFirst({
    where: {
      professionalId,
      scheduledAt: new Date(scheduledAt),
      status: { in: ["CONFIRMED", "PENDING"] },
    },
  });
  if (existing) return NextResponse.json({ error: { general: ["This slot is no longer available."] } }, { status: 409 });

  const appointment = await db.appointment.create({
    data: {
      patientId:      patient.id,
      professionalId,
      scheduledAt:    new Date(scheduledAt),
      type:           type as any,
      status:         "CONFIRMED",
      priceAmount:    intent.amount,
      currency:       intent.currency,
      stripePaymentId: intent.id,
      paidAt:         new Date(),
      durationMins:   30,
      // Store policy acceptance in notes field as JSON metadata
      ...(acceptedCancellationPolicy ? {
        chiefComplaint: JSON.stringify({ policyAccepted: true, acceptedAt: new Date().toISOString() }),
      } : {}),
    },
  });

  await audit.viewRecord(session.user.id, "Appointment", appointment.id);

  // Send confirmation email (non-blocking)
  try {
    const user = await db.user.findUnique({ where: { id: session.user.id }, select: { email: true } });
    if (user) {
      const { sendAppointmentConfirmation } = await import("@/lib/email");
      await sendAppointmentConfirmation({
        patientEmail: user.email,
        patientName:  `${patient.firstName} ${patient.lastName}`,
        doctorName:   `${professional.firstName} ${professional.lastName}`,
        specialty:    professional.specialty,
        scheduledAt:  new Date(scheduledAt),
        type,
        appointmentId: appointment.id,
      });
    }
  } catch (e) {
    console.error("[APPOINTMENT EMAIL ERROR]", e);
  }

  // Schedule QStash reminders (non-blocking)
  scheduleAppointmentReminders(appointment.id, new Date(scheduledAt)).catch((e) => {
    console.error("[QSTASH SCHEDULE ERROR]", e);
  });

  return NextResponse.json({ success: true, appointmentId: appointment.id }, { status: 201 });
}
