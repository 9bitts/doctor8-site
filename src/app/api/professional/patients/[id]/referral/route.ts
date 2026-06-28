// POST ? create a referral booking link for a colleague + optional chart note.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encryption";
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
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PROFESSIONAL")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const professional = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!professional) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const chart = await db.patientRecord.findUnique({
    where: { id: params.id },
    select: { id: true, professionalId: true, firstName: true, lastName: true },
  });
  if (!chart || chart.professionalId !== professional.id) {
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
      professionalId: professional.id,
      type: "REFERRAL",
      title: encrypt(`Encaminhamento — ${target.specialty}`),
      content: encrypt(content),
    },
  });

  return NextResponse.json({
    bookingUrl,
    targetName,
    targetSpecialty: target.specialty,
  });
}
