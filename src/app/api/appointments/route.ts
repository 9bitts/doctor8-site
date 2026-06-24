// List and create appointments (health professionals + psychoanalysts).

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { stripe } from "@/lib/stripe";
import { scheduleAppointmentReminders } from "@/lib/qstash";
import { ensureAnalysandForPatient, PSYCHOANALYSIS_SPECIALTY } from "@/lib/providers";
import { safeDecrypt } from "@/lib/psychoanalyst-api";
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
        psychoanalyst: {
          select: { firstName: true, lastName: true, avatarUrl: true },
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
  } else if (session.user.role === "PSYCHOANALYST") {
    const psychoanalyst = await db.psychoanalystProfile.findUnique({ where: { userId: session.user.id } });
    if (!psychoanalyst) return NextResponse.json({ appointments: [] });

    appointments = await db.appointment.findMany({
      where: {
        psychoanalystId: psychoanalyst.id,
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

  const normalized = (appointments as any[]).map((a) => {
    if (a.psychoanalyst && !a.professional) {
      return {
        ...a,
        providerType: "psychoanalyst",
        professional: {
          firstName: safeDecrypt(a.psychoanalyst.firstName),
          lastName: safeDecrypt(a.psychoanalyst.lastName),
          specialty: PSYCHOANALYSIS_SPECIALTY,
          avatarUrl: a.psychoanalyst.avatarUrl,
        },
        psychoanalystId: a.psychoanalystId,
      };
    }
    return { ...a, providerType: "health", professionalId: a.professionalId };
  });

  await audit.viewRecord(session.user.id, "Appointment", "list");
  return NextResponse.json({ appointments: normalized });
}

const createSchema = z.object({
  professionalId: z.string().optional(),
  psychoanalystId: z.string().optional(),
  providerType: z.enum(["health", "psychoanalyst"]).default("health"),
  scheduledAt: z.string().datetime(),
  type: z.enum(["TELECONSULT", "IN_PERSON"]),
  stripePaymentIntentId: z.string(),
  priceAmount: z.number(),
  currency: z.string(),
  acceptedCancellationPolicy: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PATIENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const {
    scheduledAt,
    type,
    stripePaymentIntentId,
    acceptedCancellationPolicy,
    providerType,
  } = parsed.data;

  const providerId =
    providerType === "psychoanalyst"
      ? parsed.data.psychoanalystId || parsed.data.professionalId
      : parsed.data.professionalId || parsed.data.psychoanalystId;

  if (!providerId) {
    return NextResponse.json({ error: { general: ["Provider not specified."] } }, { status: 400 });
  }

  const patient = await db.patientProfile.findUnique({ where: { userId: session.user.id } });
  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { email: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  let providerName = "";
  let providerSpecialty = "";
  let durationMins = 30;

  if (providerType === "psychoanalyst") {
    const psychoanalyst = await db.psychoanalystProfile.findUnique({
      where: { id: providerId, verified: true },
    });
    if (!psychoanalyst) return NextResponse.json({ error: "Professional not found" }, { status: 404 });
    providerName = `${safeDecrypt(psychoanalyst.firstName)} ${safeDecrypt(psychoanalyst.lastName)}`;
    providerSpecialty = PSYCHOANALYSIS_SPECIALTY;
    durationMins = psychoanalyst.sessionDurationMins;
  } else {
    const professional = await db.professionalProfile.findUnique({
      where: { id: providerId, verified: true },
    });
    if (!professional) return NextResponse.json({ error: "Professional not found" }, { status: 404 });
    providerName = `${professional.firstName} ${professional.lastName}`;
    providerSpecialty = professional.specialty;
  }

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
  const metaProviderId =
    providerType === "psychoanalyst" ? meta.psychoanalystId : meta.professionalId;
  if (
    meta.userId !== session.user.id ||
    metaProviderId !== providerId ||
    meta.scheduledAt !== scheduledAt ||
    (meta.providerType && meta.providerType !== providerType)
  ) {
    return NextResponse.json({ error: { general: ["Payment does not match this booking."] } }, { status: 400 });
  }

  const alreadyUsed = await db.appointment.findFirst({ where: { stripePaymentId: intent.id } });
  if (alreadyUsed) return NextResponse.json({ success: true, appointmentId: alreadyUsed.id }, { status: 200 });

  const slotWhere =
    providerType === "psychoanalyst"
      ? { psychoanalystId: providerId }
      : { professionalId: providerId };

  const existing = await db.appointment.findFirst({
    where: {
      ...slotWhere,
      scheduledAt: new Date(scheduledAt),
      status: { in: ["CONFIRMED", "PENDING"] },
    },
  });
  if (existing) {
    return NextResponse.json({ error: { general: ["This slot is no longer available."] } }, { status: 409 });
  }

  const appointment = await db.appointment.create({
    data: {
      patientId: patient.id,
      providerType: providerType === "psychoanalyst" ? "PSYCHOANALYST" : "HEALTH",
      professionalId: providerType === "health" ? providerId : null,
      psychoanalystId: providerType === "psychoanalyst" ? providerId : null,
      scheduledAt: new Date(scheduledAt),
      type: type as any,
      status: "CONFIRMED",
      priceAmount: intent.amount,
      currency: intent.currency,
      stripePaymentId: intent.id,
      paidAt: new Date(),
      durationMins,
      ...(acceptedCancellationPolicy
        ? {
            chiefComplaint: JSON.stringify({
              policyAccepted: true,
              acceptedAt: new Date().toISOString(),
            }),
          }
        : {}),
    },
  });

  if (providerType === "psychoanalyst") {
    await ensureAnalysandForPatient({
      psychoanalystId: providerId,
      patientUserId: session.user.id,
      patientProfile: { firstName: patient.firstName, lastName: patient.lastName },
      patientEmail: user.email,
    });
  }

  await audit.viewRecord(session.user.id, "Appointment", appointment.id);

  try {
    const patientUser = await db.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, language: true },
    });
    if (patientUser) {
      const { sendAppointmentConfirmation } = await import("@/lib/email");
      await sendAppointmentConfirmation({
        patientEmail: patientUser.email,
        patientName: `${patient.firstName} ${patient.lastName}`,
        doctorName: providerName,
        specialty: providerSpecialty,
        scheduledAt: new Date(scheduledAt),
        type,
        appointmentId: appointment.id,
        language: patientUser.language,
      });
    }
  } catch (e) {
    console.error("[APPOINTMENT EMAIL ERROR]", e);
  }

  scheduleAppointmentReminders(appointment.id, new Date(scheduledAt)).catch((e) => {
    console.error("[QSTASH SCHEDULE ERROR]", e);
  });

  return NextResponse.json({ success: true, appointmentId: appointment.id }, { status: 201 });
}
