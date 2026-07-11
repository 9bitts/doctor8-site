// POST — create a PatientRecord chart from an existing PatientProfile (Doctor8 account).
import { NextRequest, NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encryption";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";
import { AuditAction } from "@prisma/client";
import { canProfessionalReadPatientAccount } from "@/lib/patient-professional-link";

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
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const profile = parsed.data.patientProfileId
    ? await db.patientProfile.findUnique({
        where: { id: parsed.data.patientProfileId },
        include: { user: { select: { email: true, role: true } } },
      })
    : null;

  const resolvedProfile = profile ?? (parsed.data.email
    ? (await db.user.findFirst({
        where: { email: parsed.data.email.toLowerCase(), role: "PATIENT" },
        include: { patientProfile: { include: { user: { select: { email: true, role: true } } } } },
      }))?.patientProfile ?? null
    : null);

  if (!resolvedProfile) {
    return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 });
  }

  if (resolvedProfile.user?.role !== "PATIENT") {
    return NextResponse.json({ error: "Invalid patient account" }, { status: 400 });
  }

  const email = resolvedProfile.user?.email?.toLowerCase() ?? null;

  const existing = await db.patientRecord.findFirst({
    where: {
      professionalId: ctx.professional.id,
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

  const allowed = await canProfessionalReadPatientAccount({
    professionalId: ctx.professional.id,
    professionalUserId: ctx.userId,
    patientProfileId: resolvedProfile.id,
    patientUserId: resolvedProfile.userId,
  });

  if (!allowed) {
    console.log(
      "[PHI-IMPORT-AUDIT]",
      JSON.stringify({
        professionalUserId: ctx.userId,
        patientUserId: resolvedProfile.userId,
        denied: true,
        at: new Date().toISOString(),
      }),
    );
    return NextResponse.json(
      { error: "LINK_REQUIRED", code: "LINK_REQUIRED" },
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

  const proFull = await db.professionalProfile.findUnique({
    where: { id: ctx.professional.id },
    select: { specialty: true },
  });
  if (proFull) {
    const { assertCanAddPsychologyPatient } = await import("@/lib/psychology-plan-limits");
    const { isPsychologistSpecialty } = await import("@/lib/psychologist-portal");
    if (isPsychologistSpecialty(proFull.specialty)) {
      const gate = await assertCanAddPsychologyPatient(
        ctx.userId,
        ctx.professional.id,
        proFull.specialty,
      );
      if (!gate.ok) {
        return NextResponse.json(
          { code: gate.code, limit: gate.limit, current: gate.current, remaining: gate.remaining },
          { status: 402 },
        );
      }
    }
  }

  const record = await db.patientRecord.create({
    data: {
      professionalId: ctx.professional.id,
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

  console.log(
    "[PHI-IMPORT-AUDIT]",
    JSON.stringify({
      professionalUserId: ctx.userId,
      patientUserId: resolvedProfile.userId,
      recordId: record.id,
      at: new Date().toISOString(),
    }),
  );

  await createAuditLog({
    userId: ctx.userId,
    action: AuditAction.CREATE_RECORD,
    resource: "PatientRecordImport",
    resourceId: record.id,
    details: { patientUserId: resolvedProfile.userId },
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
