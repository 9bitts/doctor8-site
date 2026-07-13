import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { userPhonesMatch } from "@/lib/user-phone";

/** Busca PatientProfile cujo telefone normalizado bate com waPhone (phone é @encrypted). */
export async function findPatientProfileIdByWaPhone(waPhone: string): Promise<string | null> {
  const profiles = await db.patientProfile.findMany({
    where: { phone: { not: null } },
    select: { id: true, phone: true },
    take: 5000,
  });
  for (const p of profiles) {
    if (userPhonesMatch(p.phone, waPhone)) return p.id;
  }
  return null;
}

export function decryptPatientDisplayName(firstName: string, lastName: string): string {
  try {
    return `${decrypt(firstName)} ${decrypt(lastName)}`.trim();
  } catch {
    return "";
  }
}

export async function loadPatientNamesByIds(
  ids: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;

  const profiles = await db.patientProfile.findMany({
    where: { id: { in: ids } },
    select: { id: true, firstName: true, lastName: true },
  });

  for (const p of profiles) {
    const name = decryptPatientDisplayName(p.firstName, p.lastName);
    if (name) map.set(p.id, name);
  }
  return map;
}
