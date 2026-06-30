import { canonicalProfessionValue, PROFESSION_GROUPS, normalizeProfessionSearchText } from "@/lib/professions";
import { resolveProfessionalPoolSlug } from "@/lib/humanitarian/pool-slugs";

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
  | "pendentes"
  | AdminProfessionalCategory
  | "psicanalistas"
  | "terapeutas"
  | "anjos"
  | "outros";

export const ADMIN_PROVIDER_TABS: { id: AdminProviderTab; labelPt: string }[] = [
  { id: "pendentes", labelPt: "Aguardando aprovação" },
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

const POOL_SLUG_TO_ADMIN_TAB: Record<string, AdminProviderTab> = {
  medico: "medicos",
  psicologo: "psicologos",
  psicanalista: "psicanalistas",
  terapeuta_integrativo: "terapeutas",
  fisioterapeuta: "fisioterapeutas",
  nutricionista: "nutricionistas",
  cuidados_paliativos: "medicos",
};

/** Map a specialty or free-text profession (PT/EN/ES) to an admin providers tab. */
export function resolveAdminTabFromProfessionText(text: string): AdminProviderTab {
  const trimmed = text.trim();
  if (!trimmed) return "medicos";

  const lower = normalizeProfessionSearchText(trimmed);
  if (/psicanal|psychoanal|psicoanal/.test(lower)) return "psicanalistas";
  if (/nutric|dietet|dietitian|dietista/.test(lower)) return "nutricionistas";
  // Before generic "terapeuta" — "fisioterapeuta" contains that substring.
  if (/fisioter|physiother|physical therap|rehabilit/.test(lower)) return "fisioterapeutas";
  if (/psicolog|psycholog|mental health|saude mental|crp\b/.test(lower)) return "psicologos";
  if (/integrativ|holistic|\bpics\b|naturop|reiki|aromaterap|fitoterap|(?<!fisio)terapeuta/.test(lower)) {
    return "terapeutas";
  }
  if (
    /medic|medicina|clinic|enferm|dentist|odont|cirurg|pediatr|ginec|cardio|urolog|ortop|obstet|doula|parteira|midwife|gestante|matern|\bcrm\b/.test(
      lower,
    )
  ) {
    return "medicos";
  }

  const healthCategory = resolveProfessionalCategory(trimmed);
  if (healthCategory !== "outros") return healthCategory;

  const poolSlug = resolveProfessionalPoolSlug(trimmed);
  return POOL_SLUG_TO_ADMIN_TAB[poolSlug] ?? "outros";
}

export function angelProfessionText(angel: {
  profession?: string | null;
  volunteerHelp?: string | null;
  motivation?: string | null;
}): string {
  return [angel.profession, angel.volunteerHelp, angel.motivation].filter(Boolean).join(" ");
}

export function angelMatchesAdminTab(
  angel: {
    profession?: string | null;
    volunteerHelp?: string | null;
    motivation?: string | null;
    approvalStatus?: string;
  },
  tab: AdminProviderTab,
): boolean {
  if (tab === "anjos") return true;
  if (tab === "pendentes") return angel.approvalStatus === "PENDING";

  const declaredProfession = angel.profession?.trim();
  if (declaredProfession) {
    return resolveAdminTabFromProfessionText(declaredProfession) === tab;
  }

  const text = angelProfessionText(angel);
  if (!text.trim()) return tab === "outros";
  return resolveAdminTabFromProfessionText(text) === tab;
}
