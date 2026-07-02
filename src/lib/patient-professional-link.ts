// Consent-based patient-professional link helpers (PRO-1A).

import { db } from "@/lib/db";
import { linkDb, type LinkStatus, type PatientProfessionalLinkRow } from "@/lib/patient-professional-link-db";

export type { LinkStatus, PatientProfessionalLinkRow };

export function maskPatientDisplayName(firstName: string, lastName: string): string {
  const first = firstName.trim();
  const initial = lastName.trim()[0];
  return initial ? `${first} ${initial}.` : first;
}

export async function getLink(
  patientUserId: string,
  professionalUserId: string,
): Promise<PatientProfessionalLinkRow | null> {
  return linkDb().findUnique({
    where: {
      patientUserId_professionalUserId: { patientUserId, professionalUserId },
    },
  });
}

export async function hasAcceptedLink(
  patientUserId: string,
  professionalUserId: string,
): Promise<boolean> {
  const link = await getLink(patientUserId, professionalUserId);
  return link?.status === "ACCEPTED";
}

export async function getLinkStatusForPair(
  patientUserId: string,
  professionalUserId: string,
): Promise<LinkStatus | "NONE"> {
  const link = await getLink(patientUserId, professionalUserId);
  return link?.status ?? "NONE";
}

/** READ (import/chart PHI): appointment, share, or ACCEPTED link. */
export async function canProfessionalReadPatientAccount(params: {
  professionalId: string;
  professionalUserId: string;
  patientProfileId: string;
  patientUserId: string;
}): Promise<boolean> {
  const { professionalId, professionalUserId, patientProfileId, patientUserId } = params;

  const [appointment, share, accepted] = await Promise.all([
    db.appointment.findFirst({
      where: { professionalId, patientId: patientProfileId },
      select: { id: true },
    }),
    db.sharedRecord.findFirst({
      where: { sharedWithProfessionalId: professionalId, patientId: patientProfileId },
      select: { id: true },
    }),
    hasAcceptedLink(patientUserId, professionalUserId),
  ]);

  return !!(appointment || share || accepted);
}

export async function getAcceptedLinkMap(
  professionalUserId: string,
  patientUserIds: string[],
): Promise<Map<string, LinkStatus | "NONE">> {
  const map = new Map<string, LinkStatus | "NONE">();
  if (patientUserIds.length === 0) return map;

  const links = await linkDb().findMany({
    where: {
      professionalUserId,
      patientUserId: { in: patientUserIds },
    },
  });

  for (const id of patientUserIds) {
    map.set(id, "NONE");
  }
  for (const link of links) {
    map.set(link.patientUserId, link.status);
  }
  return map;
}
