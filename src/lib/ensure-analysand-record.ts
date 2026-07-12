// Ensures an AnalysandRecord exists for a psychoanalyst + registered patient user.

import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encryption";

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v; }
}

export async function ensureAnalysandRecord(
  psychoanalystId: string,
  patientUserId: string,
): Promise<string | null> {
  const existing = await db.analysandRecord.findFirst({
    where: { psychoanalystId, linkedUserId: patientUserId },
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

  const record = await db.analysandRecord.create({
    data: {
      psychoanalystId,
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
