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

function toLegacyRow(r: AcuraVolunteerAdminRow): AcuraVolunteerRow {
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
  return {
    totals: {
      optInVerified: data.totals.activeVerified,
      optInPending: data.totals.pending,
      byKind: data.totals.byKind,
    },
    volunteers: data.rows.map(toLegacyRow),
  };
}
