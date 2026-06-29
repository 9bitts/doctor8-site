import { canonicalProfessionValue, PROFESSION_GROUPS } from "@/lib/professions";

function optionsFor(groupKey: string): string[] {
  return PROFESSION_GROUPS.find((g) => g.groupKey === groupKey)?.options ?? [];
}

const MEDICAL = optionsFor("set.profGroup.medical");
const DENTISTRY = optionsFor("set.profGroup.dentistry");
const PSYCHOLOGY = optionsFor("set.profGroup.psychology").filter((s) => s !== "Psychoanalyst");
const NUTRITION = optionsFor("set.profGroup.nutrition");
const REHAB = optionsFor("set.profGroup.rehab");

export const ADMIN_PROFESSIONAL_CATEGORIES = {
  medicos: [...MEDICAL, ...DENTISTRY],
  psicologos: PSYCHOLOGY,
  nutricionistas: NUTRITION,
  fisioterapeutas: REHAB,
} as const;

export type AdminProfessionalCategory = keyof typeof ADMIN_PROFESSIONAL_CATEGORIES;

export type AdminProviderTab =
  | AdminProfessionalCategory
  | "psicanalistas"
  | "terapeutas"
  | "anjos"
  | "outros";

export const ADMIN_PROVIDER_TABS: { id: AdminProviderTab; labelPt: string }[] = [
  { id: "medicos", labelPt: "Médicos" },
  { id: "psicologos", labelPt: "Psicólogos" },
  { id: "nutricionistas", labelPt: "Nutricionistas" },
  { id: "fisioterapeutas", labelPt: "Fisioterapeutas" },
  { id: "psicanalistas", labelPt: "Psicanalistas" },
  { id: "terapeutas", labelPt: "Terapeutas integrativos" },
  { id: "anjos", labelPt: "Anjos" },
  { id: "outros", labelPt: "Outros" },
];

export function specialtiesForCategory(category: AdminProfessionalCategory): string[] {
  return [...ADMIN_PROFESSIONAL_CATEGORIES[category]];
}

export function resolveProfessionalCategory(specialty: string): AdminProfessionalCategory | "outros" {
  const trimmed = specialty.trim();
  // Doctors register with an empty specialty until they complete settings.
  if (!trimmed) return "medicos";

  const canonical = canonicalProfessionValue(trimmed) ?? trimmed;
  for (const [key, list] of Object.entries(ADMIN_PROFESSIONAL_CATEGORIES) as [
    AdminProfessionalCategory,
    string[],
  ][]) {
    if (list.includes(canonical)) return key;
  }
  return "outros";
}

export function isUncategorizedProfessional(specialty: string): boolean {
  return resolveProfessionalCategory(specialty) === "outros";
}
