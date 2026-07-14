// Normalized search index for PatientProfile (platform-wide professional search).

import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import {
  buildPatientRecordSearchText,
  normalizeSearchQuery,
  normalizeSearchToken,
} from "@/lib/patient-record-search";

export { normalizeSearchQuery };

function safeDecrypt(v: string | null | undefined): string {
  if (v == null) return "";
  try {
    return decrypt(v);
  } catch {
    return String(v);
  }
}

/** Builds searchText from decrypted/plain name, email and phone digits. */
export function buildPatientProfileSearchText(
  firstName: string,
  lastName: string,
  email?: string | null,
  phone?: string | null,
): string {
  const base = buildPatientRecordSearchText(firstName, lastName, email);
  const phoneDigits = phone?.replace(/\D/g, "") ?? "";
  const parts = [base, phoneDigits ? normalizeSearchToken(phoneDigits) : ""].filter(Boolean);
  return parts.join(" ");
}

export async function syncPatientProfileSearchText(profileId: string): Promise<void> {
  const profile = await db.patientProfile.findUnique({
    where: { id: profileId },
    include: { user: { select: { email: true } } },
  });
  if (!profile) return;

  const firstName = safeDecrypt(profile.firstName);
  const lastName = safeDecrypt(profile.lastName);
  const phone = profile.phone ? safeDecrypt(profile.phone) : null;
  const searchText = buildPatientProfileSearchText(
    firstName,
    lastName,
    profile.user?.email ?? null,
    phone,
  );

  await db.patientProfile.update({
    where: { id: profileId },
    data: { searchText },
  });
}
