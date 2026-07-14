// Platform-wide patient search for professionals (registered PatientProfile accounts).

import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import {
  formatPatientDisplayName,
  getAcceptedLinkMap,
  type LinkStatus,
} from "@/lib/patient-professional-link";
import { normalizeSearchQuery } from "@/lib/patient-profile-search";

export const PLATFORM_MIN_CHARS = 3;
export const PLATFORM_MAX_RESULTS = 50;
/** Fetch extra rows when searchText is not backfilled yet. */
const PLATFORM_FETCH_LIMIT = 200;

export type PlatformPatientMatch = {
  patientProfileId: string;
  patientUserId: string;
  displayName: string;
  city: string | null;
  hasLink: boolean;
  linkStatus: LinkStatus | "NONE";
};

function safeDecrypt(v: string | null | undefined): string {
  if (v == null) return "";
  try {
    return decrypt(v);
  } catch {
    return String(v);
  }
}

function normText(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

function matchesPlatformQuery(
  q: string,
  firstName: string,
  lastName: string,
  email: string | null,
  phone: string | null,
): boolean {
  const nq = normText(q);
  const full = normText(`${firstName} ${lastName}`.trim());
  if (full.includes(nq) || normText(firstName).includes(nq) || normText(lastName).includes(nq)) {
    return true;
  }
  if (email && normText(email).includes(nq)) return true;
  if (phone) {
    const digits = phone.replace(/\D/g, "");
    const qDigits = q.replace(/\D/g, "");
    if (qDigits.length >= 3 && digits.includes(qDigits)) return true;
  }
  return false;
}

export async function searchPlatformPatients(params: {
  q: string;
  professionalUserId: string;
  excludeUserIds: Set<string>;
  excludeEmails: Set<string>;
}): Promise<PlatformPatientMatch[]> {
  const q = params.q.trim();
  if (q.length < PLATFORM_MIN_CHARS) return [];

  const normalizedQ = normalizeSearchQuery(q);
  const qDigits = q.replace(/\D/g, "");
  const excludeUserIds = [...params.excludeUserIds];

  const profiles = await db.patientProfile.findMany({
    where: {
      user: { role: "PATIENT" },
      ...(excludeUserIds.length > 0 ? { userId: { notIn: excludeUserIds } } : {}),
      OR: [
        { searchText: { contains: normalizedQ } },
        ...(qDigits.length >= 3 ? [{ searchText: { contains: qDigits } }] : []),
        { searchText: null },
      ],
    },
    include: {
      user: { select: { email: true, role: true } },
    },
    take: 500,
    orderBy: { updatedAt: "desc" },
  });

  const candidates: {
    profile: (typeof profiles)[0];
    firstName: string;
    lastName: string;
  }[] = [];

  for (const p of profiles) {
    if (p.user?.role !== "PATIENT") continue;
    const email = p.user?.email?.toLowerCase() ?? null;
    if (email && params.excludeEmails.has(email)) continue;

    const firstName = safeDecrypt(p.firstName);
    const lastName = safeDecrypt(p.lastName);
    const phone = p.phone ? safeDecrypt(p.phone) : null;
    if (!matchesPlatformQuery(q, firstName, lastName, p.user?.email ?? null, phone)) continue;

    candidates.push({ profile: p, firstName, lastName });
  }

  const limited = candidates.slice(0, PLATFORM_MAX_RESULTS);
  const userIds = limited.map((c) => c.profile.userId);
  const linkMap = await getAcceptedLinkMap(params.professionalUserId, userIds);

  return limited.map(({ profile, firstName, lastName }) => {
    const linkStatus = linkMap.get(profile.userId) ?? "NONE";
    return {
      patientProfileId: profile.id,
      patientUserId: profile.userId,
      displayName: formatPatientDisplayName(firstName, lastName),
      city: profile.city || null,
      hasLink: linkStatus === "ACCEPTED",
      linkStatus,
    };
  });
}
