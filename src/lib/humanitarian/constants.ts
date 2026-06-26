// Default pool definitions for humanitarian campaigns.

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
  /** Which volunteer roles can serve this pool */
  volunteerRoles: ("PROFESSIONAL" | "PSYCHOANALYST")[];
  /** Match professional specialty keywords (lowercase) */
  specialtyHints?: string[];
}[] = [
  {
    slug: "medico",
    labelEs: "M?dico general",
    labelPt: "M?dico cl?nico",
    labelEn: "General physician",
    maxWaiting: 500,
    sortOrder: 1,
    volunteerRoles: ["PROFESSIONAL"],
    specialtyHints: ["general", "cl?nica", "clinica", "medicina", "m?dico", "medico", "family"],
  },
  {
    slug: "psicologo",
    labelEs: "Psic?logo",
    labelPt: "Psic?logo",
    labelEn: "Psychologist",
    maxWaiting: 200,
    sortOrder: 2,
    volunteerRoles: ["PROFESSIONAL"],
    specialtyHints: ["psicolog", "psycholog", "mental health", "sa?de mental", "salud mental"],
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
  if (lang.startsWith("es")) return pool.labelEs;
  if (lang.startsWith("pt")) return pool.labelPt;
  return pool.labelEn;
}
