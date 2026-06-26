// Default pool definitions for humanitarian campaigns.

export const HUMANITARIAN_LANDING_URL = "https://acurabrasil.org/sos-venezuela.html";

export type HumanitarianPoolSlug =
  | "medico"
  | "psicologo"
  | "psicanalista"
  | "terapeuta_integrativo";

export const VENEZUELA_CAMPAIGN_SLUG = "venezuela-terremoto-2026";

export const DEFAULT_VENEZUELA_POOLS: {
  slug: HumanitarianPoolSlug;
  labelEs: string;
  labelPt: string;
  labelEn: string;
  maxWaiting: number;
  sortOrder: number;
  volunteerRoles: ("PROFESSIONAL" | "PSYCHOANALYST")[];
  specialtyHints?: string[];
}[] = [
  {
    slug: "medico",
    labelEs: "Médico general",
    labelPt: "Médico clínico",
    labelEn: "General physician",
    maxWaiting: 500,
    sortOrder: 1,
    volunteerRoles: ["PROFESSIONAL"],
    specialtyHints: ["general", "clínica", "clinica", "medicina", "médico", "medico", "family"],
  },
  {
    slug: "psicologo",
    labelEs: "Psicólogo",
    labelPt: "Psicólogo",
    labelEn: "Psychologist",
    maxWaiting: 200,
    sortOrder: 2,
    volunteerRoles: ["PROFESSIONAL"],
    specialtyHints: ["psicolog", "psycholog", "mental health", "saúde mental", "salud mental"],
  },
  {
    slug: "psicanalista",
    labelEs: "Psicanalista",
    labelPt: "Psicanalista",
    labelEn: "Psychoanalyst",
    maxWaiting: 100,
    sortOrder: 3,
    volunteerRoles: ["PSYCHOANALYST", "PROFESSIONAL"],
    specialtyHints: ["psicanal", "psychoanal"],
  },
  {
    slug: "terapeuta_integrativo",
    labelEs: "Terapeuta integrativo",
    labelPt: "Terapeuta integrativo",
    labelEn: "Integrative therapist",
    maxWaiting: 100,
    sortOrder: 4,
    volunteerRoles: ["PROFESSIONAL"],
    specialtyHints: ["integrativ", "holistic", "terapia", "counsel", "terapeuta"],
  },
];

export function poolLabel(
  pool: { labelEs: string; labelPt: string; labelEn: string },
  lang: string,
): string {
  if (lang.startsWith("pt")) return pool.labelPt;
  if (lang.startsWith("en")) return pool.labelEn;
  return pool.labelEs;
}
