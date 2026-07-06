// Default pool definitions for humanitarian campaigns.

export const HUMANITARIAN_LANDING_URL = "https://acurabrasil.org/sos-venezuela.html";

/** Professional volunteer signup (SOS Venezuela). */
export const PROFESSIONAL_VOLUNTEER_SIGNUP_URL =
  "https://app.doctor8.org/register/professional/signup";

/** Public signup for lay accompaniment volunteers (Anjo / Ángel). */
export const ANGEL_REGISTER_PATH = "/register/angel";

export type HumanitarianPoolSlug =
  | "medico"
  | "psicologo"
  | "psicanalista"
  | "terapeuta_integrativo"
  | "fisioterapeuta"
  | "nutricionista"
  | "enfermeiro"
  | "cuidados_paliativos";

export const VENEZUELA_CAMPAIGN_SLUG = "venezuela-terremoto-2026";

export const DEFAULT_VENEZUELA_POOLS: {
  slug: HumanitarianPoolSlug;
  labelEs: string;
  labelPt: string;
  labelEn: string;
  maxWaiting: number;
  sortOrder: number;
  volunteerRoles: ("PROFESSIONAL" | "PSYCHOANALYST" | "INTEGRATIVE_THERAPIST")[];
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
    specialtyHints: [
      "general", "clínica", "clinica", "medicina", "médico", "medico", "family",
      "enferm", "nurse", "doula", "parteira", "midwife", "obstet", "médic",
      "gestante", "gestantes", "grávida", "gravida", "acompanhante", "parto",
      "matern", "obstetr",
    ],
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
    volunteerRoles: ["INTEGRATIVE_THERAPIST", "PROFESSIONAL"],
    specialtyHints: ["integrativ", "holistic", "terapia", "counsel", "terapeuta"],
  },
  {
    slug: "fisioterapeuta",
    labelEs: "Fisioterapeuta",
    labelPt: "Fisioterapeuta",
    labelEn: "Physiotherapist",
    maxWaiting: 150,
    sortOrder: 5,
    volunteerRoles: ["PROFESSIONAL"],
    specialtyHints: ["fisio", "physio", "rehab", "reabilit"],
  },
  {
    slug: "nutricionista",
    labelEs: "Nutricionista",
    labelPt: "Nutricionista",
    labelEn: "Nutritionist",
    maxWaiting: 100,
    sortOrder: 6,
    volunteerRoles: ["PROFESSIONAL"],
    specialtyHints: ["nutri", "nutrition", "diet"],
  },
  {
    slug: "enfermeiro",
    labelEs: "Enfermero(a)",
    labelPt: "Enfermeiro(a)",
    labelEn: "Nurse",
    maxWaiting: 150,
    sortOrder: 7,
    volunteerRoles: ["PROFESSIONAL"],
    specialtyHints: ["enferm", "nurse", "nursing", "midwife", "parteira", "obstet"],
  },
  {
    slug: "cuidados_paliativos",
    labelEs: "Cuidados paliativos",
    labelPt: "Cuidados paliativos",
    labelEn: "Palliative care",
    maxWaiting: 80,
    sortOrder: 8,
    volunteerRoles: ["PROFESSIONAL"],
    specialtyHints: ["paliativ", "palliat", "hospice", "cuidados"],
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
