// src/app/api/appointments/route.ts
// List and create appointments

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
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
  professionalId: z.string(),
  scheduledAt: z.string().datetime(),
  type: z.enum(["TELECONSULT", "IN_PERSON"]),
  stripePaymentIntentId: z.string(),
  priceAmount: z.number(),
  currency: z.string(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PATIENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { professionalId, scheduledAt, type, stripePaymentIntentId, priceAmount, currency } = parsed.data;

  const patient = await db.patientProfile.findUnique({ where: { userId: session.user.id } });
  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  // Verify professional exists and is verified
  const professional = await db.professionalProfile.findUnique({
    where: { id: professionalId, verified: true },
  });
  if (!professional) return NextResponse.json({ error: "Professional not found" }, { status: 404 });

  // Check slot is still available
  const existing = await db.appointment.findFirst({
    where: {
      professionalId,
      scheduledAt: new Date(scheduledAt),
      status: { in: ["CONFIRMED", "PENDING"] },
    },
  });
  if (existing) return NextResponse.json({ error: { general: ["This slot is no longer available."] } }, { status: 409 });

  // Create appointment
  const appointment = await db.appointment.create({
    data: {
      patientId: patient.id,
      professionalId,
      scheduledAt: new Date(scheduledAt),
      type: type as any,
      status: "CONFIRMED",
      priceAmount,
      currency,
      stripePaymentId: stripePaymentIntentId,
      paidAt: new Date(),
      durationMins: 30,
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
        patientName: `${patient.firstName} ${patient.lastName}`,
        doctorName: `${professional.firstName} ${professional.lastName}`,
        specialty: professional.specialty,
        scheduledAt: new Date(scheduledAt),
        type,
        appointmentId: appointment.id,
      });
    }
  } catch (e) {
    console.error("[APPOINTMENT EMAIL ERROR]", e);
  }

  return NextResponse.json({ success: true, appointmentId: appointment.id }, { status: 201 });
}
