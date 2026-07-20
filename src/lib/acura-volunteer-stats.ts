import { listAcuraVolunteersAdmin, type AcuraVolunteerAdminRow } from "@/lib/acura-volunteer-admin";

/** @deprecated Prefer listAcuraVolunteersAdmin — kept for HumanitarianProgramsPanel link period. */
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

type LegacyAcuraKind = AcuraVolunteerRow["kind"];

function toLegacyRow(
  r: AcuraVolunteerAdminRow & { kind: LegacyAcuraKind },
): AcuraVolunteerRow {
  return {
    id: r.id,
    kind: r.kind,
    name: r.name,
    email: r.email,
    specialty: r.specialty,
    verified: r.verified,
    acuraVolunteer: r.acuraVolunteer,
  };
}

export async function getAcuraVolunteerStats(limit = 50): Promise<AcuraVolunteerStats> {
  const data = await listAcuraVolunteersAdmin({ status: "ACTIVE", limit });
  const c = data.totals.byCategory;
  return {
    totals: {
      optInVerified: data.totals.activeVerified,
      optInPending: data.totals.pending,
      byKind: {
        professional:
          c.medicos +
          c.odontologistas +
          c.psicologos +
          c.nutricionistas +
          c.fisioterapeutas +
          c.enfermeiros +
          c.farmaceuticos,
        psychoanalyst: c.psicanalistas,
        integrative: c.terapeutas,
      },
    },
    volunteers: data.rows
      .filter(
        (r): r is AcuraVolunteerAdminRow & { kind: "professional" | "psychoanalyst" | "integrative" } =>
          r.kind !== "angel",
      )
      .map(toLegacyRow),
  };
}
