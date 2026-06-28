import { PROFESSION_GROUPS } from "@/lib/professions";

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

const ALL_CATEGORIZED = new Set<string>([
  ...ADMIN_PROFESSIONAL_CATEGORIES.medicos,
  ...ADMIN_PROFESSIONAL_CATEGORIES.psicologos,
  ...ADMIN_PROFESSIONAL_CATEGORIES.nutricionistas,
  ...ADMIN_PROFESSIONAL_CATEGORIES.fisioterapeutas,
]);

export function specialtiesForCategory(category: AdminProfessionalCategory): string[] {
  return [...ADMIN_PROFESSIONAL_CATEGORIES[category]];
}

export function resolveProfessionalCategory(specialty: string): AdminProfessionalCategory | "outros" {
  for (const [key, list] of Object.entries(ADMIN_PROFESSIONAL_CATEGORIES) as [
    AdminProfessionalCategory,
    string[],
  ][]) {
    if (list.includes(specialty)) return key;
  }
  return "outros";
}

export function isUncategorizedProfessional(specialty: string): boolean {
  return !ALL_CATEGORIZED.has(specialty);
}
