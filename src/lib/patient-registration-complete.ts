import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";

export type PatientRegistrationFieldKey = "name" | "dateOfBirth" | "address";

export type PatientRegistrationStatus = {
  complete: boolean;
  checklist: Record<PatientRegistrationFieldKey, boolean>;
  missing: PatientRegistrationFieldKey[];
};

export const PATIENT_REGISTRATION_FIELD_KEYS: PatientRegistrationFieldKey[] = [
  "name",
  "dateOfBirth",
  "address",
];

function safeDecrypt(v: string | null): string {
  if (!v) return "";
  try {
    return decrypt(v);
  } catch {
    return v;
  }
}

export function computePatientRegistrationStatus(profile: {
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: unknown;
  addressLine1: string | null;
  city: string | null;
}): PatientRegistrationStatus {
  const firstName = safeDecrypt(profile.firstName);
  const lastName = safeDecrypt(profile.lastName);
  const hasName = !!(firstName.trim() && lastName.trim());
  const hasDob = !!profile.dateOfBirth;
  const hasAddress = !!(safeDecrypt(profile.addressLine1).trim() || (profile.city || "").trim());

  const checklist: Record<PatientRegistrationFieldKey, boolean> = {
    name: hasName,
    dateOfBirth: hasDob,
    address: hasAddress,
  };

  const missing = PATIENT_REGISTRATION_FIELD_KEYS.filter((key) => !checklist[key]);

  return {
    checklist,
    missing,
    complete: missing.length === 0,
  };
}

export async function getPatientRegistrationStatus(
  userId: string,
): Promise<PatientRegistrationStatus | null> {
  const profile = await db.patientProfile.findUnique({
    where: { userId },
    select: {
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      addressLine1: true,
      city: true,
    },
  });
  if (!profile) return null;
  return computePatientRegistrationStatus(profile);
}
