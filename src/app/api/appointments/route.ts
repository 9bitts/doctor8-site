// List and create appointments (health + psychoanalyst + integrative).

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { stripe } from "@/lib/stripe";
import {
  AppointmentSlotTakenError,
  fulfillConsultationPayment,
} from "@/lib/fulfill-consultation";
import {
  INTEGRATIVE_THERAPY_SPECIALTY,
} from "@/lib/integrative-therapy-specialty";
import {
  PSYCHOANALYSIS_SPECIALTY,
  PROVIDER_TYPE_ENUM,
  bookingProviderIds,
  providerIdMetadataKey,
  resolveBookingProviderId,
  type ProviderType,
} from "@/lib/providers";
import { safeDecrypt } from "@/lib/psychoanalyst-api";
import { stripPsychoanalystAppointmentFields, isPsychoanalystAppointmentRequest } from "@/lib/appointment-provider-access";
import { z } from "zod";
import { AppointmentStatus } from "@prisma/client";

function parseAppointmentStatus(status: string | null): AppointmentStatus | undefined {
  if (!status) return undefined;
  return (Object.values(AppointmentStatus) as string[]).includes(status)
    ? (status as AppointmentStatus)
    : undefined;
}

const appointmentListSelect = {
  id: true,
  scheduledAt: true,
  status: true,
  type: true,
  durationMins: true,
  bookingSource: true,
  professionalId: true,
  psychoanalystId: true,
  integrativeTherapistId: true,
  providerType: true,
  patientConfirmedAt: true,
  priceAmount: true,
  paidAt: true,
  meetingUrl: true,
  cancelledAt: true,
  cancelReason: true,
  cancelledBy: true,
  /** Fetched internally; mapped to hasNotes before response (AGD-14/15). */
  notes: true,
} as const;

const UPCOMING_ACTIVE_STATUSES = ["CONFIRMED", "PENDING"] as const;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const upcoming = searchParams.get("upcoming") === "true";
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const dateRange =
    fromParam || toParam
      ? {
          ...(fromParam ? { gte: new Date(fromParam) } : {}),
          ...(toParam ? { lte: new Date(toParam) } : {}),
        }
      : undefined;

  const statusFilter = parseAppointmentStatus(status);

  let appointments;

  if (session.user.role === "PATIENT") {
    const patient = await db.patientProfile.findUnique({ where: { userId: session.user.id } });
    if (!patient) return NextResponse.json({ appointments: [] });

    appointments = await db.appointment.findMany({
      where: {
        patientId: patient.id,
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(upcoming
          ? {
              scheduledAt: { gte: new Date() },
              status: { in: [...UPCOMING_ACTIVE_STATUSES] },
            }
          : {}),
        ...(dateRange ? { scheduledAt: dateRange } : {}),
      },
      select: {
        ...appointmentListSelect,
        professional: {
          select: { firstName: true, lastName: true, specialty: true, avatarUrl: true },
        },
        psychoanalyst: {
          select: { firstName: true, lastName: true, avatarUrl: true },
        },
        integrativeTherapist: {
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
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(upcoming ? { scheduledAt: { gte: new Date() } } : {}),
        ...(dateRange ? { scheduledAt: dateRange } : {}),
      },
      select: {
        ...appointmentListSelect,
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
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(upcoming ? { scheduledAt: { gte: new Date() } } : {}),
        ...(dateRange ? { scheduledAt: dateRange } : {}),
      },
      select: {
        ...appointmentListSelect,
        patient: { select: { firstName: true, lastName: true, avatarUrl: true } },
      },
      orderBy: { scheduledAt: upcoming ? "asc" : "desc" },
      take: 50,
    });
  } else if (session.user.role === "INTEGRATIVE_THERAPIST") {
    const integrative = await db.integrativeTherapistProfile.findUnique({
      where: { userId: session.user.id },
    });
    if (!integrative) return NextResponse.json({ appointments: [] });

    appointments = await db.appointment.findMany({
      where: {
        integrativeTherapistId: integrative.id,
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(upcoming ? { scheduledAt: { gte: new Date() } } : {}),
        ...(dateRange ? { scheduledAt: dateRange } : {}),
      },
      select: {
        ...appointmentListSelect,
        patient: { select: { firstName: true, lastName: true, avatarUrl: true } },
      },
      orderBy: { scheduledAt: upcoming ? "asc" : "desc" },
      take: 50,
    });
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const normalized = appointments.map((a) => {
    const hasNotes = Boolean(a.notes);
    const { notes: _notes, ...rest } = a;
    const base = { ...rest, hasNotes };

    if ("integrativeTherapist" in base && base.integrativeTherapist && !base.professional && !base.psychoanalyst) {
      return {
        ...base,
        providerType: "integrative" as const,
        professional: {
          firstName: base.integrativeTherapist.firstName,
          lastName: base.integrativeTherapist.lastName,
          specialty: INTEGRATIVE_THERAPY_SPECIALTY,
          avatarUrl: base.integrativeTherapist.avatarUrl,
        },
        integrativeTherapistId: base.integrativeTherapistId,
      };
    }

    if ("psychoanalyst" in base && base.psychoanalyst && !base.professional) {
      const row = {
        ...base,
        providerType: "psychoanalyst",
        professional: {
          firstName: safeDecrypt(base.psychoanalyst.firstName),
          lastName: safeDecrypt(base.psychoanalyst.lastName),
          specialty: PSYCHOANALYSIS_SPECIALTY,
          avatarUrl: base.psychoanalyst.avatarUrl,
        },
        psychoanalystId: base.psychoanalystId,
      };
      return isPsychoanalystAppointmentRequest(session.user.role)
        ? stripPsychoanalystAppointmentFields(row)
        : row;
    }
    const row = { ...base, providerType: "health" as const, professionalId: base.professionalId };
    if ("patient" in row && row.patient) {
      row.patient = {
        ...row.patient,
        firstName: safeDecrypt(row.patient.firstName),
        lastName: safeDecrypt(row.patient.lastName),
      };
    }
    return row;
  });

  await audit.viewRecord(session.user.id, "Appointment", "list");
  return NextResponse.json({ appointments: normalized });
}

const createSchema = z.object({
  professionalId: z.string().optional(),
  psychoanalystId: z.string().optional(),
  integrativeTherapistId: z.string().optional(),
  providerType: z.enum(PROVIDER_TYPE_ENUM).default("health"),
  scheduledAt: z.string().datetime(),
  type: z.enum(["TELECONSULT", "IN_PERSON"]),
  stripePaymentIntentId: z.string(),
  priceAmount: z.number(),
  currency: z.string(),
  acceptedCancellationPolicy: z.boolean().default(false),
  bookingSource: z.enum(["patient_panel", "public_profile", "public_search", "public_embed", "referral"]).optional(),
  visitReason: z.string().max(2000).optional(),
  healthPlanSlug: z.string().max(80).optional(),
  healthPlanLabel: z.string().max(120).optional(),
  serviceId: z.string().optional(),
  serviceName: z.string().max(120).optional(),
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
    visitReason,
    healthPlanSlug,
    healthPlanLabel,
    serviceId,
    serviceName,
  } = parsed.data;

  const providerId = resolveBookingProviderId({
    providerType: providerType as ProviderType,
    professionalId: parsed.data.professionalId,
    psychoanalystId: parsed.data.psychoanalystId,
    integrativeTherapistId: parsed.data.integrativeTherapistId,
  });

  if (!providerId) {
    return NextResponse.json({ error: { general: ["Provider not specified."] } }, { status: 400 });
  }

  const patient = await db.patientProfile.findUnique({ where: { userId: session.user.id } });
  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

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
  } else if (providerType === "integrative") {
    const integrative = await db.integrativeTherapistProfile.findUnique({
      where: { id: providerId, verified: true },
    });
    if (!integrative) return NextResponse.json({ error: "Professional not found" }, { status: 404 });
    providerName = `${integrative.firstName} ${integrative.lastName}`;
    providerSpecialty = INTEGRATIVE_THERAPY_SPECIALTY;
    durationMins = integrative.sessionDurationMins;
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
  const metaKey = providerIdMetadataKey(providerType as ProviderType);
  const metaProviderId = meta[metaKey];
  if (
    meta.userId !== session.user.id ||
    metaProviderId !== providerId ||
    meta.scheduledAt !== scheduledAt ||
    (meta.providerType && meta.providerType !== providerType)
  ) {
    return NextResponse.json({ error: { general: ["Payment does not match this booking."] } }, { status: 400 });
  }

  const alreadyUsed = await db.appointment.findFirst({ where: { stripePaymentId: intent.id } });
  if (alreadyUsed) {
    return NextResponse.json({ success: true, appointmentId: alreadyUsed.id }, { status: 200 });
  }

  try {
    const result = await fulfillConsultationPayment({
      stripePaymentId: intent.id,
      amount: intent.amount,
      currency: intent.currency,
      metadata: {
        userId: session.user.id,
        providerType,
        ...bookingProviderIds(providerType as ProviderType, providerId),
        scheduledAt,
        type,
        visitReason,
        healthPlanSlug,
        healthPlanLabel,
        serviceId,
        serviceName,
        acceptedCancellationPolicy: acceptedCancellationPolicy ? "true" : undefined,
        bookingSource: parsed.data.bookingSource ?? "patient_panel",
        doctorName: providerName,
        providerSpecialty,
        durationMins: String(durationMins),
      },
    });

    await audit.viewRecord(session.user.id, "Appointment", result.appointmentId);
    return NextResponse.json(
      { success: true, appointmentId: result.appointmentId },
      { status: result.created ? 201 : 200 },
    );
  } catch (e) {
    if (e instanceof AppointmentSlotTakenError) {
      return NextResponse.json(
        { error: { general: ["This slot is no longer available."] } },
        { status: 409 },
      );
    }
    throw e;
  }
}
