// Detect possible duplicate patient charts for the same professional.

import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import {
  buildPatientRecordSearchText,
  normalizeSearchToken,
} from "@/lib/patient-record-search";

function safeDecrypt(v: string): string {
  try {
    return decrypt(v);
  } catch {
    return v;
  }
}

export type DuplicateChartMatch = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  reason: "email" | "name";
};

export async function findPossibleDuplicateCharts(
  professionalId: string,
  firstName: string,
  lastName: string,
  email?: string | null,
): Promise<DuplicateChartMatch[]> {
  const matches: DuplicateChartMatch[] = [];
  const seen = new Set<string>();

  const normalizedEmail = email?.trim().toLowerCase() || null;

  if (normalizedEmail) {
    const byEmail = await db.patientRecord.findMany({
      where: { professionalId, email: normalizedEmail },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    for (const r of byEmail) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      matches.push({
        id: r.id,
        firstName: safeDecrypt(r.firstName),
        lastName: safeDecrypt(r.lastName),
        email: r.email,
        reason: "email",
      });
    }
  }

  const nameKey = buildPatientRecordSearchText(firstName, lastName, null);
  const normFirst = normalizeSearchToken(firstName);
  const normLast = normalizeSearchToken(lastName);

  const byName = await db.patientRecord.findMany({
    where: {
      professionalId,
      OR: [{ searchText: { contains: normFirst } }, { searchText: null }],
    },
    select: { id: true, firstName: true, lastName: true, email: true, searchText: true },
    take: 200,
  });

  for (const r of byName) {
    if (seen.has(r.id)) continue;
    const rFirst = normalizeSearchToken(safeDecrypt(r.firstName));
    const rLast = normalizeSearchToken(safeDecrypt(r.lastName));
    const nameMatch = rFirst === normFirst && rLast === normLast;
    const searchMatch = r.searchText === nameKey;
    if (nameMatch || searchMatch) {
      seen.add(r.id);
      matches.push({
        id: r.id,
        firstName: safeDecrypt(r.firstName),
        lastName: safeDecrypt(r.lastName),
        email: r.email,
        reason: "name",
      });
    }
  }

  return matches;
}
