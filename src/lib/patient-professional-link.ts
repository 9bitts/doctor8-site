// Consent-based patient-professional link helpers (PRO-1A).

import { db } from "@/lib/db";
import { linkDb, type LinkStatus, type PatientProfessionalLinkRow } from "@/lib/patient-professional-link-db";

export type { LinkStatus, PatientProfessionalLinkRow };

export function formatPatientDisplayName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
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

/**
 * True when the patient already has a real relationship with the professional:
 * ACCEPTED consent link, linked chart, or any appointment history.
 * Used to suppress "unknown emitter" safety banners.
 */
export async function hasKnownProfessionalRelationship(params: {
  patientUserId: string;
  patientProfileId: string;
  professionalUserId: string;
}): Promise<boolean> {
  const { patientUserId, patientProfileId, professionalUserId } = params;

  if (await hasAcceptedLink(patientUserId, professionalUserId)) return true;

  const [chart, appointment] = await Promise.all([
    db.patientRecord.findFirst({
      where: {
        linkedUserId: patientUserId,
        professional: { userId: professionalUserId },
      },
      select: { id: true },
    }),
    db.appointment.findFirst({
      where: {
        patientId: patientProfileId,
        professional: { userId: professionalUserId },
      },
      select: { id: true },
    }),
  ]);

  return !!(chart || appointment);
}

/** Patient affirms they know an emitter: accept PENDING link or create ACCEPTED. */
export async function acceptOrCreateEmissionLink(params: {
  patientUserId: string;
  professionalUserId: string;
}): Promise<PatientProfessionalLinkRow> {
  const { patientUserId, professionalUserId } = params;
  const existing = await getLink(patientUserId, professionalUserId);

  if (existing?.status === "ACCEPTED") return existing;

  if (existing?.status === "PENDING") {
    return linkDb().update({
      where: { id: existing.id },
      data: {
        status: "ACCEPTED",
        respondedAt: new Date(),
      },
    });
  }

  if (existing) {
    return linkDb().update({
      where: { id: existing.id },
      data: {
        status: "ACCEPTED",
        requestedBy: "PROFESSIONAL",
        respondedAt: new Date(),
      },
    });
  }

  return linkDb().create({
    data: {
      patientUserId,
      professionalUserId,
      status: "ACCEPTED",
      requestedBy: "PROFESSIONAL",
      respondedAt: new Date(),
    },
  });
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
      where: {
        sharedWithProfessionalId: professionalId,
        patientId: patientProfileId,
        heldUntilLinkAccepted: false,
        revokedAt: null,
      },
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
