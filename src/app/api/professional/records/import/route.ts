// POST ? create a PatientRecord chart from an existing PatientProfile (Doctor8 account).
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encryption";
import { z } from "zod";

const schema = z.object({
  patientProfileId: z.string().optional(),
  email: z.string().email().optional(),
}).refine((d) => !!d.patientProfileId || !!d.email, {
  message: "patientProfileId or email is required",
});

function safeDecrypt(v: string | null | undefined): string {
  if (v == null) return "";
  try { return decrypt(v); } catch { return String(v); }
}

function computeMissingForRx(r: {
  firstName: string;
  lastName: string;
  dobDecrypted: string | null;
  addressLine1: string | null;
  city: string | null;
}): string[] {
  const missing: string[] = [];
  if (!(r.firstName && r.lastName)) missing.push("name");
  if (!(r.addressLine1 || r.city)) missing.push("address");
  if (!r.dobDecrypted) missing.push("dob");
  return missing;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PROFESSIONAL") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const professional = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!professional) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const profile = parsed.data.patientProfileId
    ? await db.patientProfile.findUnique({
        where: { id: parsed.data.patientProfileId },
        include: { user: { select: { email: true } } },
      })
    : null;

  const resolvedProfile = profile ?? (parsed.data.email
    ? (await db.user.findFirst({
        where: { email: parsed.data.email.toLowerCase(), role: "PATIENT" },
        include: { patientProfile: { include: { user: { select: { email: true } } } } },
      }))?.patientProfile ?? null
    : null);

  if (!resolvedProfile) {
    return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 });
  }

  const email = resolvedProfile.user?.email?.toLowerCase() ?? null;

  const existing = await db.patientRecord.findFirst({
    where: {
      professionalId: professional.id,
      OR: [
        { linkedUserId: resolvedProfile.userId },
        ...(email ? [{ email }] : []),
      ],
    },
  });
  if (existing) {
    const firstName = safeDecrypt(existing.firstName);
    const lastName = safeDecrypt(existing.lastName);
    return NextResponse.json({
      id: existing.id,
      firstName,
      lastName,
      email: existing.email,
      hasAccount: !!existing.linkedUserId,
      missingForRx: computeMissingForRx({
        firstName,
        lastName,
        dobDecrypted: existing.dateOfBirth ? safeDecrypt(existing.dateOfBirth) : null,
        addressLine1: existing.addressLine1 ? safeDecrypt(existing.addressLine1) : null,
        city: existing.city || null,
      }),
    });
  }

  const allowedByAppointment = await db.appointment.findFirst({
    where: { professionalId: professional.id, patientId: resolvedProfile.id },
    select: { id: true },
  });
  const allowedByShare = await db.sharedRecord.findFirst({
    where: { sharedWithProfessionalId: professional.id, patientId: resolvedProfile.id },
    select: { id: true },
  });
  const allowedByEmail = !!parsed.data.email;
  const allowedByProfileId = !!parsed.data.patientProfileId;
  if (!allowedByAppointment && !allowedByShare && !allowedByEmail && !allowedByProfileId) {
    return NextResponse.json(
      { error: "Sem vinculo com este paciente. Crie a ficha manualmente em Pacientes." },
      { status: 403 },
    );
  }

  const firstName = safeDecrypt(resolvedProfile.firstName);
  const lastName = safeDecrypt(resolvedProfile.lastName);
  const phone = resolvedProfile.phone ? safeDecrypt(resolvedProfile.phone) : "";
  if (!phone.trim()) {
    return NextResponse.json(
      { error: "O paciente não tem telefone no cadastro. Crie a ficha manualmente em Pacientes." },
      { status: 400 },
    );
  }

  const record = await db.patientRecord.create({
    data: {
      professionalId: professional.id,
      firstName: encrypt(firstName),
      lastName: encrypt(lastName),
      email,
      phone: encrypt(phone),
      dateOfBirth: resolvedProfile.dateOfBirth ? encrypt(safeDecrypt(resolvedProfile.dateOfBirth)) : null,
      sex: resolvedProfile.sex || null,
      cpf: resolvedProfile.cpf ? encrypt(safeDecrypt(resolvedProfile.cpf)) : null,
      addressLine1: resolvedProfile.addressLine1 ? encrypt(safeDecrypt(resolvedProfile.addressLine1)) : null,
      city: resolvedProfile.city || null,
      state: resolvedProfile.state || null,
      country: resolvedProfile.country || "BR",
      zipCode: resolvedProfile.zipCode ? encrypt(safeDecrypt(resolvedProfile.zipCode)) : null,
      linkedUserId: resolvedProfile.userId,
    },
  });

  const dobDecrypted = record.dateOfBirth ? safeDecrypt(record.dateOfBirth) : null;
  const addressLine1 = record.addressLine1 ? safeDecrypt(record.addressLine1) : null;

  return NextResponse.json({
    id: record.id,
    firstName,
    lastName,
    email: record.email,
    hasAccount: true,
    missingForRx: computeMissingForRx({
      firstName,
      lastName,
      dobDecrypted,
      addressLine1,
      city: record.city || null,
    }),
  }, { status: 201 });
}
