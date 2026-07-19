// POST — professional creates an immediate private teleconsult during Online Duty
// and receives a join link to share via WhatsApp or Doctor8 messaging.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { decrypt } from "@/lib/encryption";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { requireVerifiedProfessional } from "@/lib/professional-verified";
import { createNotification } from "@/lib/notifications";
import { storedNotificationText } from "@/lib/notification-i18n";
import { teleconsultJoinUrl } from "@/lib/appointment-join-window";
import { JIT_PRIVATE_CONSULT_BOOKING_SOURCE } from "@/lib/jit-private-consult";
import { waPhoneDigits } from "@/lib/wa-phone";
import { buildWhatsAppUrl } from "@/lib/humanitarian/angel-utils";
import { readJsonBody } from "@/lib/safe-json";

const schema = z.object({
  patientRecordId: z.string().min(1),
  sessionId: z.string().min(1).optional(),
});

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try {
    return decrypt(v);
  } catch {
    return v;
  }
}

export async function POST(req: NextRequest) {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const verified = await requireVerifiedProfessional(ctx.userId);
  if (!verified.ok) {
    return NextResponse.json(
      { error: "PROVIDER_NOT_VERIFIED", message: verified.error },
      { status: verified.status },
    );
  }

  const body = await readJsonBody(req);
  if (body === null) {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { patientRecordId, sessionId } = parsed.data;

  const session = await db.jitSession.findFirst({
    where: {
      professionalId: ctx.professional.id,
      ...(sessionId ? { id: sessionId } : {}),
      status: { in: ["ONLINE", "PAUSED"] },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      status: true,
      estimatedMinutesPerPatient: true,
      currency: true,
    },
  });

  if (!session) {
    return NextResponse.json(
      {
        error: "SESSION_NOT_ACTIVE",
        message: "Start Online Duty before creating a private consultation.",
      },
      { status: 400 },
    );
  }

  const record = await db.patientRecord.findFirst({
    where: { id: patientRecordId, professionalId: ctx.professional.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      country: true,
      linkedUserId: true,
    },
  });

  if (!record) {
    return NextResponse.json({ error: "RECORD_NOT_FOUND" }, { status: 404 });
  }

  if (!record.linkedUserId) {
    return NextResponse.json(
      {
        error: "PATIENT_NO_ACCOUNT",
        message: "Patient needs a Doctor8 account linked to the chart.",
      },
      { status: 400 },
    );
  }

  const patientProfile = await db.patientProfile.findUnique({
    where: { userId: record.linkedUserId },
    select: { id: true, firstName: true, lastName: true, phone: true, country: true },
  });

  if (!patientProfile) {
    return NextResponse.json(
      {
        error: "PATIENT_PROFILE_MISSING",
        message: "Linked patient profile was not found.",
      },
      { status: 400 },
    );
  }

  const durationMins = Math.min(
    120,
    Math.max(15, session.estimatedMinutesPerPatient || 30),
  );
  const scheduledAt = new Date();
  const currency = session.currency || "BRL";

  // Private invites are off-platform / courtesy — no Stripe charge on create.
  const appointment = await db.appointment.create({
    data: {
      patientId: patientProfile.id,
      providerType: "HEALTH",
      professionalId: ctx.professional.id,
      scheduledAt,
      durationMins,
      type: "TELECONSULT",
      status: "CONFIRMED",
      videoChannel: "DAILY",
      priceAmount: 0,
      currency,
      bookingSource: JIT_PRIVATE_CONSULT_BOOKING_SOURCE,
    },
  });

  const joinPath = `/video/${appointment.id}`;
  const joinUrl = teleconsultJoinUrl(appointment.id);

  const patientFirst = safeDecrypt(record.firstName) || safeDecrypt(patientProfile.firstName);
  const patientLast = safeDecrypt(record.lastName) || safeDecrypt(patientProfile.lastName);
  const patientName = `${patientFirst} ${patientLast}`.trim() || "Patient";

  const phoneRaw =
    safeDecrypt(record.phone) || safeDecrypt(patientProfile.phone) || "";
  const country = record.country || patientProfile.country || "BR";
  const phoneDigits = phoneRaw ? waPhoneDigits(phoneRaw, country) : "";

  const proName = `Dr. ${ctx.professional.firstName} ${ctx.professional.lastName}`.trim();
  const waMessage =
    `Olá ${patientFirst || patientName}! Sua teleconsulta com ${proName} na Doctor8 já está disponível.\n\n` +
    `Entre pelo link (faça login na Doctor8):\n${joinUrl}`;

  const whatsappUrl = phoneDigits ? buildWhatsAppUrl(phoneDigits, waMessage) : null;
  // Fallback: open WhatsApp without a prefilled number so the doctor can pick a contact.
  const whatsappShareUrl = whatsappUrl
    || `https://wa.me/?text=${encodeURIComponent(waMessage)}`;

  const notif = storedNotificationText(
    "notif.jit.privateConsult.title",
    "notif.jit.privateConsult.body",
    { name: proName },
  );
  await createNotification({
    userId: record.linkedUserId,
    title: notif.title,
    body: notif.body,
    type: "appointment_booked",
    data: {
      appointmentId: appointment.id,
      url: joinPath,
      link: joinPath,
      titleKey: "notif.jit.privateConsult.title",
      bodyKey: "notif.jit.privateConsult.body",
      bodyParams: { name: proName },
    },
  });

  await audit.createRecord(ctx.userId, "Appointment", appointment.id);

  return NextResponse.json(
    {
      appointmentId: appointment.id,
      joinPath,
      joinUrl,
      patientUserId: record.linkedUserId,
      patientName,
      patientPhoneDigits: phoneDigits || null,
      whatsappUrl: whatsappShareUrl,
      messageBody:
        `${proName} convidou você para uma teleconsulta agora na Doctor8.\n\n` +
        `Entre aqui: ${joinPath}`,
      sessionId: session.id,
    },
    { status: 201 },
  );
}
