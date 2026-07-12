// Ensures an IntegrativeClientRecord exists for a therapist + registered patient user.

import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encryption";

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v; }
}

export async function ensureIntegrativeClientRecord(
  integrativeTherapistId: string,
  patientUserId: string,
): Promise<string | null> {
  const existing = await db.integrativeClientRecord.findFirst({
    where: { integrativeTherapistId, linkedUserId: patientUserId },
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

  const email = profile.user.email?.toLowerCase() ?? null;

  const record = await db.integrativeClientRecord.create({
    data: {
      integrativeTherapistId,
      linkedUserId: patientUserId,
      firstName: encrypt(firstName || "Paciente"),
      lastName: encrypt(lastName || ""),
      email,
      phone: profile.phone ?? null,
      dateOfBirth: profile.dateOfBirth ?? null,
      processStartDate: new Date(),
    },
  });

  return record.id;
}
