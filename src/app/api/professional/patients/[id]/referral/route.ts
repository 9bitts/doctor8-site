// POST ? create a referral booking link for a colleague + optional chart note.

import { NextRequest, NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encryption";
import { createNotification } from "@/lib/notifications";
import { storedNotificationText } from "@/lib/notification-i18n";
import { z } from "zod";

const schema = z.object({
  targetProfessionalId: z.string(),
  note: z.string().max(2000).optional(),
});

function safeDecrypt(v: string | null): string {
  if (!v) return "";
  try {
    return decrypt(v);
  } catch {
    return v;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const professional = await db.professionalProfile.findUnique({
    where: { userId: ctx.userId },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!professional) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const chart = await db.patientRecord.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      professionalId: true,
      firstName: true,
      lastName: true,
      linkedUserId: true,
    },
  });
  if (!chart || chart.professionalId !== ctx.professional.id) {
    return NextResponse.json({ error: "Chart not found" }, { status: 404 });
  }

  const target = await db.professionalProfile.findUnique({
    where: { id: parsed.data.targetProfessionalId, verified: true },
    select: { id: true, firstName: true, lastName: true, specialty: true },
  });
  if (!target) {
    return NextResponse.json({ error: "Colleague not found" }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://doctor8.app";
  const bookingUrl = `${appUrl}/patient/appointments?pro=${target.id}&providerType=health&from=referral`;

  const patientName = `${safeDecrypt(chart.firstName)} ${safeDecrypt(chart.lastName)}`.trim();
  const referrerName = `Dr. ${professional.firstName} ${professional.lastName}`;
  const targetName = `Dr. ${target.firstName} ${target.lastName}`;
  const note = parsed.data.note?.trim();

  const content = [
    `Encaminhamento de ${referrerName} para ${targetName} (${target.specialty}).`,
    patientName ? `Paciente: ${patientName}` : null,
    note ? `\nObservações:\n${note}` : null,
    `\nLink de agendamento:\n${bookingUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  await db.medicalDocument.create({
    data: {
      patientRecordId: chart.id,
      professionalId: ctx.professional.id,
      type: "REFERRAL",
      title: encrypt(`Encaminhamento — ${target.specialty}`),
      content: encrypt(content),
    },
  });

  if (chart.linkedUserId) {
    await db.message.create({
      data: {
        senderId: ctx.userId,
        receiverId: chart.linkedUserId,
        content: encrypt(
          `📋 ${referrerName} indicou ${targetName} (${target.specialty}).\nAgende sua consulta:\n${bookingUrl}`,
        ),
      },
    });
    const notif = storedNotificationText("notif.referral.title", "notif.referral.body", {
      doctor: referrerName,
      specialty: target.specialty,
    });
    await createNotification({
      userId: chart.linkedUserId,
      title: notif.title,
      body: notif.body,
      type: "referral",
      data: {
        chartId: chart.id,
        targetProfessionalId: target.id,
        bookingUrl,
        titleKey: "notif.referral.title",
        bodyKey: "notif.referral.body",
        bodyParams: { doctor: referrerName, specialty: target.specialty },
      },
    });
  }

  return NextResponse.json({
    bookingUrl,
    targetName,
    targetSpecialty: target.specialty,
  });
}
