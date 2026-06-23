// Ensures a PatientRecord exists for a professional + registered patient user.

import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encryption";

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v; }
}

export async function ensurePatientRecord(
  professionalId: string,
  patientUserId: string,
): Promise<string | null> {
  const existing = await db.patientRecord.findFirst({
    where: { professionalId, linkedUserId: patientUserId },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
  if (existing) return existing.id;

  const profile = await db.patientProfile.findUnique({
    where: { userId: patientUserId },
    include: { user: { select: { email: true } } },
  });
  if (!profile) return null;

  const firstName = safeDecrypt(profile.firstName);
  const lastName = safeDecrypt(profile.lastName);
  if (!firstName && !lastName) return null;

  const record = await db.patientRecord.create({
    data: {
      professionalId,
      linkedUserId: patientUserId,
      firstName: encrypt(firstName || "Paciente"),
      lastName: encrypt(lastName || ""),
      email: profile.user.email?.toLowerCase() ?? null,
      phone: profile.phone ?? null,
      dateOfBirth: profile.dateOfBirth ?? null,
      sex: profile.sex ?? null,
    },
  });

  return record.id;
}
