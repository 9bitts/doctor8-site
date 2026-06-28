import { db } from "@/lib/db";
import { safeDecrypt } from "@/lib/psychoanalyst-api";
import { decryptIntegrativeNameFields } from "@/lib/integrative-therapist-api";

export type AcuraVolunteerRow = {
  id: string;
  kind: "professional" | "psychoanalyst" | "integrative";
  name: string;
  email: string | null;
  specialty: string | null;
  verified: boolean;
  acuraVolunteer: boolean;
};

export type AcuraVolunteerStats = {
  totals: {
    optInVerified: number;
    optInPending: number;
    byKind: {
      professional: number;
      psychoanalyst: number;
      integrative: number;
    };
  };
  volunteers: AcuraVolunteerRow[];
};

export async function getAcuraVolunteerStats(limit = 50): Promise<AcuraVolunteerStats> {
  const [profOptIn, profVerified, paOptIn, paVerified, itOptIn, itVerified] = await Promise.all([
    db.professionalProfile.count({ where: { acuraVolunteer: true } }),
    db.professionalProfile.count({ where: { acuraVolunteer: true, verified: true } }),
    db.psychoanalystProfile.count({ where: { acuraVolunteer: true } }),
    db.psychoanalystProfile.count({ where: { acuraVolunteer: true, verified: true } }),
    db.integrativeTherapistProfile.count({ where: { acuraVolunteer: true } }),
    db.integrativeTherapistProfile.count({ where: { acuraVolunteer: true, verified: true } }),
  ]);

  const [professionals, psychoanalysts, integrative] = await Promise.all([
    db.professionalProfile.findMany({
      where: { acuraVolunteer: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        specialty: true,
        verified: true,
        acuraVolunteer: true,
        user: { select: { email: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
    }),
    db.psychoanalystProfile.findMany({
      where: { acuraVolunteer: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        verified: true,
        acuraVolunteer: true,
        user: { select: { email: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
    }),
    db.integrativeTherapistProfile.findMany({
      where: { acuraVolunteer: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        verified: true,
        acuraVolunteer: true,
        user: { select: { email: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
    }),
  ]);

  const volunteers: AcuraVolunteerRow[] = [
    ...professionals.map((p) => ({
      id: p.id,
      kind: "professional" as const,
      name: `${p.firstName} ${p.lastName}`.trim(),
      email: p.user.email,
      specialty: p.specialty,
      verified: p.verified,
      acuraVolunteer: p.acuraVolunteer,
    })),
    ...psychoanalysts.map((p) => {
      const first = safeDecrypt(p.firstName);
      const last = safeDecrypt(p.lastName);
      return {
        id: p.id,
        kind: "psychoanalyst" as const,
        name: `${first} ${last}`.trim(),
        email: p.user.email,
        specialty: "Psychoanalysis",
        verified: p.verified,
        acuraVolunteer: p.acuraVolunteer,
      };
    }),
    ...integrative.map((p) => {
      const d = decryptIntegrativeNameFields(p);
      return {
        id: p.id,
        kind: "integrative" as const,
        name: `${d.firstName} ${d.lastName}`.trim(),
        email: p.user.email,
        specialty: "Integrative therapy",
        verified: p.verified,
        acuraVolunteer: p.acuraVolunteer,
      };
    }),
  ].sort((a, b) => {
    if (a.verified !== b.verified) return a.verified ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return {
    totals: {
      optInVerified: profVerified + paVerified + itVerified,
      optInPending: profOptIn + paOptIn + itOptIn - (profVerified + paVerified + itVerified),
      byKind: {
        professional: profVerified,
        psychoanalyst: paVerified,
        integrative: itVerified,
      },
    },
    volunteers: volunteers.slice(0, limit),
  };
}
