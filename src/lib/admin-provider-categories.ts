import { getProfessionInfo } from "@/lib/profession-label";
import {
  canonicalProfessionValue,
  PROFESSION_GROUPS,
  PSYCHOANALYSIS_SPECIALTY,
} from "@/lib/professions";

const PROFESSION_GROUP_TAB: Record<string, AdminProviderTab> = {
  "set.profGroup.medical": "medicos",
  "set.profGroup.psychology": "psicologos",
  "set.profGroup.nutrition": "nutricionistas",
  "set.profGroup.rehab": "fisioterapeutas",
  "set.profGroup.nursing": "outros",
  "set.profGroup.dentistry": "medicos",
  "set.profGroup.other": "outros",
};

const INTEGRATIVE_OTHER_PROFESSIONS = new Set([
  "Acupuncturist (non-medical)",
  "Naturopath",
]);

function tabFromCanonicalProfession(raw: string): AdminProviderTab | null {
  const canonical = canonicalProfessionValue(raw);
  if (!canonical) return null;
  if (canonical === PSYCHOANALYSIS_SPECIALTY || canonical === "Psychoanalyst") {
    return "psicanalistas";
  }
  if (INTEGRATIVE_OTHER_PROFESSIONS.has(canonical)) return "terapeutas";

  for (const group of PROFESSION_GROUPS) {
    if (!group.options.includes(canonical)) continue;
    return PROFESSION_GROUP_TAB[group.groupKey] ?? "outros";
  }
  return null;
}

export type AdminProviderTab =
  | "pendentes"
  | "incompletos"
  | "todos"
  | "medicos"
  | "psicologos"
  | "nutricionistas"
  | "fisioterapeutas"
  | "psicanalistas"
  | "terapeutas"
  | "anjos"
  | "outros";

export const ADMIN_PROVIDER_TABS: { id: AdminProviderTab }[] = [
  { id: "pendentes" },
  { id: "incompletos" },
  { id: "todos" },
  { id: "medicos" },
  { id: "psicologos" },
  { id: "nutricionistas" },
  { id: "fisioterapeutas" },
  { id: "psicanalistas" },
  { id: "terapeutas" },
  { id: "anjos" },
  { id: "outros" },
];

function normalizeProfessionText(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function isPsychologistSpecialtyValue(specialty: string | null | undefined): boolean {
  const s = normalizeProfessionText(specialty);
  if (!s) return false;
  return (
    s.includes("psychologist") ||
    s.includes("psicolog") ||
    s.includes("psicólog") ||
    s.includes("psicologa") ||
    s.includes("psicóloga")
  );
}

function tabFromProfessionInfoType(
  typeKey: ReturnType<typeof getProfessionInfo>["typeKey"],
): AdminProviderTab | null {
  switch (typeKey) {
    case "psychologist":
      return "psicologos";
    case "nutritionist":
      return "nutricionistas";
    case "physiotherapist":
      return "fisioterapeutas";
    case "nurse":
      return "outros";
    case "pharmacist":
      return "outros";
    case "dentist":
    case "doctor":
      return "medicos";
    default:
      return null;
  }
}

/** Infer admin tab from profession/specialty text alone. Empty → outros (license / parent resolver decides). */
export function resolveAdminTabFromProfessionText(
  specialty: string | null | undefined,
): AdminProviderTab {
  const raw = (specialty ?? "").trim();
  const s = normalizeProfessionText(specialty);
  if (!s) return "outros";

  if (s.includes("nutricion")) return "nutricionistas";
  if (s.includes("fisioterap")) return "fisioterapeutas";
  if (s.includes("psicanal")) return "psicanalistas";
  if (s.includes("terapeuta integrativ")) return "terapeutas";
  if (isPsychologistSpecialtyValue(specialty)) return "psicologos";
  if (s.includes("enferm") || s.includes("nurse")) return "outros";
  if (s.includes("farmac") || s.includes("pharm")) return "outros";

  const fromProfessionGroups = tabFromCanonicalProfession(raw);
  if (fromProfessionGroups) return fromProfessionGroups;

  const fromCanonical = tabFromProfessionInfoType(getProfessionInfo(raw).typeKey);
  if (fromCanonical) return fromCanonical;

  if (
    s.includes("physician") ||
    s.includes("doctor") ||
    s.includes("médico") ||
    s.includes("medico") ||
    s.includes("medicina") ||
    s.includes("cardiolog") ||
    s.includes("dermatolog") ||
    s.includes("ginecolog") ||
    s.includes("pediatr") ||
    s.includes("clínico geral") ||
    s.includes("clinico geral") ||
    s.includes("general practice") ||
    s.includes("general_practitioner") ||
    s.includes("dentist") ||
    s.includes("odontolog")
  ) {
    return "medicos";
  }

  if (
    s.includes("terapeuta") ||
    s.includes("therapist") ||
    s.includes("coach") ||
    s.includes("acupunt") ||
    s.includes("reiki") ||
    s.includes("homeopat") ||
    s.includes("naturopat") ||
    s.includes("fitoterap") ||
    s.includes("ayurved") ||
    s.includes("holistic") ||
    s.includes("integrativ")
  ) {
    return "terapeutas";
  }

  return "outros";
}

/** Infer tab from license prefix when specialty is empty or ambiguous. */
export function inferAdminTabFromLicense(
  licenseNumber: string | null | undefined,
): AdminProviderTab | null {
  const lic = (licenseNumber ?? "").trim().toUpperCase();
  if (!lic) return null;
  if (/\bCRM\b|\bCRO\b|CRM[\s/-]|CRO[\s/-]/.test(lic)) return "medicos";
  if (/\bCRP\b|CRP[\s/-]/.test(lic)) return "psicologos";
  if (/\bCRN\b|CRN[\s/-]/.test(lic)) return "nutricionistas";
  if (/\bCREFITO\b|CREFITO[\s/-]/.test(lic)) return "fisioterapeutas";
  if (/\bCOREN\b|COREN[\s/-]/.test(lic)) return "outros";
  if (/\bCRF\b|CRF[\s/-]/.test(lic)) return "outros";
  return null;
}

/**
 * Single source of truth for which admin tab a professional belongs to.
 * Explicit specialty wins over license prefix (fixes CRP + médico misclassification).
 */
export function resolveAdminTabForProfessional(
  specialty: string | null | undefined,
  licenseNumber?: string | null,
): AdminProviderTab {
  const s = normalizeProfessionText(specialty);

  if (!s) {
    return inferAdminTabFromLicense(licenseNumber) ?? "medicos";
  }

  const fromSpecialty = resolveAdminTabFromProfessionText(specialty);
  if (fromSpecialty !== "outros") return fromSpecialty;

  const fromLicense = inferAdminTabFromLicense(licenseNumber);
  if (fromLicense) return fromLicense;

  return fromSpecialty;
}

export function angelMatchesAdminTab(
  angel: { profession: string | null },
  tab: AdminProviderTab,
): boolean {
  if (tab === "pendentes" || tab === "anjos" || tab === "todos" || tab === "incompletos") return false;
  return resolveAdminTabFromProfessionText(angel.profession) === tab;
}

export function matchesAdminProviderTab(
  tab: AdminProviderTab,
  specialty: string | null | undefined,
  licenseNumber?: string | null,
): boolean {
  if (tab === "pendentes" || tab === "anjos" || tab === "todos" || tab === "incompletos") return false;
  return resolveAdminTabForProfessional(specialty, licenseNumber) === tab;
}
