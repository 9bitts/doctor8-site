// Patient-side search for verified health professionals by name or license.

import { db } from "@/lib/db";
import { linkDb, type LinkStatus } from "@/lib/patient-professional-link-db";

export const PRO_SEARCH_MIN_CHARS = 2;
export const PRO_SEARCH_MAX_RESULTS = 30;
const PRO_SEARCH_FETCH_LIMIT = 200;

export type PlatformProfessionalMatch = {
  professionalId: string;
  professionalUserId: string;
  name: string;
  specialty: string | null;
  licenseNumber: string | null;
  linkStatus: LinkStatus | "NONE";
  linkId: string | null;
};

function normText(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

function matchesProQuery(
  q: string,
  firstName: string,
  lastName: string,
  licenseNumber: string | null,
): boolean {
  const nq = normText(q);
  const full = normText(`${firstName} ${lastName}`.trim());
  if (full.includes(nq) || normText(firstName).includes(nq) || normText(lastName).includes(nq)) {
    return true;
  }
  if (licenseNumber) {
    const lic = normText(licenseNumber);
    if (lic.includes(nq)) return true;
    const qDigits = q.replace(/\D/g, "");
    const licDigits = licenseNumber.replace(/\D/g, "");
    if (qDigits.length >= 3 && licDigits.includes(qDigits)) return true;
  }
  return false;
}

export async function searchPlatformProfessionals(params: {
  q: string;
  patientUserId: string;
}): Promise<PlatformProfessionalMatch[]> {
  const q = params.q.trim();
  if (q.length < PRO_SEARCH_MIN_CHARS) return [];

  const pros = await db.professionalProfile.findMany({
    where: {
      verified: true,
      user: { role: "PROFESSIONAL", deletedAt: null },
    },
    select: {
      id: true,
      userId: true,
      firstName: true,
      lastName: true,
      specialty: true,
      licenseNumber: true,
    },
    take: PRO_SEARCH_FETCH_LIMIT,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const matched = pros
    .filter((p) => matchesProQuery(q, p.firstName, p.lastName, p.licenseNumber))
    .slice(0, PRO_SEARCH_MAX_RESULTS);

  if (matched.length === 0) return [];

  const links = await linkDb().findMany({
    where: {
      patientUserId: params.patientUserId,
      professionalUserId: { in: matched.map((p) => p.userId) },
    },
  });
  const linkByProUser = new Map(links.map((l) => [l.professionalUserId, l]));

  return matched.map((p) => {
    const link = linkByProUser.get(p.userId);
    return {
      professionalId: p.id,
      professionalUserId: p.userId,
      name: `Dr. ${p.firstName} ${p.lastName}`.trim(),
      specialty: p.specialty,
      licenseNumber: p.licenseNumber,
      linkStatus: (link?.status as LinkStatus | undefined) ?? "NONE",
      linkId: link?.id ?? null,
    };
  });
}
