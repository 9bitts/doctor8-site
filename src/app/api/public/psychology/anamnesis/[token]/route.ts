import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import {
  buildAnamnesisPayload,
  PSYCHOLOGY_ANAMNESIS_FIELDS,
} from "@/lib/psychology-anamnesis";
import { isPsychologyAnamnesisEnabled } from "@/lib/psychology-feature-flags";
import { safeDecrypt } from "@/lib/psychology-api";

const submitSchema = z.object({
  fields: z.record(z.string(), z.string()),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } },
) {
  if (!isPsychologyAnamnesisEnabled()) {
    return NextResponse.json({ error: "Feature disabled" }, { status: 503 });
  }

  const invite = await db.psychologyAnamnesisInvite.findUnique({
    where: { token: params.token },
    include: {
      professional: { select: { firstName: true, lastName: true, specialty: true } },
      patientRecord: { select: { firstName: true, lastName: true } },
    },
  });

  if (!invite) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = new Date();
  const expired = invite.expiresAt < now;
  const completed = invite.status === "COMPLETED";

  return NextResponse.json({
    fields: PSYCHOLOGY_ANAMNESIS_FIELDS,
    psychologistName: `${invite.professional.firstName} ${invite.professional.lastName}`.trim(),
    patientName: invite.patientRecord
      ? `${safeDecrypt(invite.patientRecord.firstName)} ${safeDecrypt(invite.patientRecord.lastName)}`.trim()
      : "",
    status: expired && !completed ? "EXPIRED" : invite.status,
    canSubmit: !completed && !expired,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } },
) {
  if (!isPsychologyAnamnesisEnabled()) {
    return NextResponse.json({ error: "Feature disabled" }, { status: 503 });
  }

  const invite = await db.psychologyAnamnesisInvite.findUnique({
    where: { token: params.token },
    include: { patientRecord: true },
  });

  if (!invite) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (invite.status === "COMPLETED") {
    return NextResponse.json({ error: "Already submitted" }, { status: 409 });
  }
  if (invite.expiresAt < new Date()) {
    await db.psychologyAnamnesisInvite.update({
      where: { id: invite.id },
      data: { status: "EXPIRED" },
    });
    return NextResponse.json({ error: "Link expired" }, { status: 410 });
  }

  const body = await req.json();
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  for (const field of PSYCHOLOGY_ANAMNESIS_FIELDS) {
    if (field.required && !(parsed.data.fields[field.key] || "").trim()) {
      return NextResponse.json({ error: `Missing field: ${field.key}` }, { status: 400 });
    }
  }

  const payload = buildAnamnesisPayload(parsed.data.fields);
  const patientName = invite.patientRecord
    ? `${safeDecrypt(invite.patientRecord.firstName)} ${safeDecrypt(invite.patientRecord.lastName)}`.trim()
    : "Paciente";
  const title = `Anamnese — ${patientName}`;

  await db.$transaction([
    db.medicalDocument.create({
      data: {
        patientRecordId: invite.patientRecordId,
        professionalId: invite.professionalId,
        type: "CLINICAL_NOTE",
        recordKind: "ANAMNESIS",
        title: encrypt(title),
        content: encrypt(JSON.stringify(payload)),
      },
    }),
    db.psychologyAnamnesisInvite.update({
      where: { id: invite.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        responses: encrypt(JSON.stringify(parsed.data.fields)),
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
