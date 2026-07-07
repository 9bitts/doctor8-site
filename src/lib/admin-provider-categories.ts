import { getProfessionInfo } from "@/lib/profession-label";
import {
  canonicalProfessionValue,
  PROFESSION_GROUPS,
  PSYCHOANALYSIS_SPECIALTY,
} from "@/lib/professions";

/** Profession categories that mirror signup/login portals (no catch-all "outros"). */
export type AdminProfessionCategory =
  | "medicos"
  | "psicologos"
  | "nutricionistas"
  | "fisioterapeutas"
  | "enfermeiros"
  | "farmaceuticos"
  | "psicanalistas"
  | "terapeutas";

export type AdminProviderTab =
  | "pendentes"
  | "incompletos"
  | "todos"
  | AdminProfessionCategory
  | "anjos";

const PROFESSION_GROUP_TAB: Record<string, AdminProfessionCategory> = {
  "set.profGroup.medical": "medicos",
  "set.profGroup.psychology": "psicologos",
  "set.profGroup.nutrition": "nutricionistas",
  "set.profGroup.rehab": "fisioterapeutas",
  "set.profGroup.nursing": "enfermeiros",
  "set.profGroup.dentistry": "medicos",
};

const OTHER_GROUP_CANONICAL_TAB: Record<string, AdminProfessionCategory> = {
  Pharmacist: "farmaceuticos",
  "Biomedical Scientist": "medicos",
  "Physical Educator / Personal Trainer": "fisioterapeutas",
  "Social Worker (Health)": "terapeutas",
  Optometrist: "medicos",
  Podiatrist: "medicos",
  "Acupuncturist (non-medical)": "terapeutas",
  Naturopath: "terapeutas",
  Veterinarian: "medicos",
  Other: "medicos",
};

const INTEGRATIVE_OTHER_PROFESSIONS = new Set([
  "Acupuncturist (non-medical)",
  "Naturopath",
]);

export const ADMIN_PROVIDER_TABS: { id: AdminProviderTab }[] = [
  { id: "pendentes" },
  { id: "incompletos" },
  { id: "todos" },
  { id: "medicos" },
  { id: "psicologos" },
  { id: "nutricionistas" },
  { id: "fisioterapeutas" },
  { id: "enfermeiros" },
  { id: "farmaceuticos" },
  { id: "psicanalistas" },
  { id: "terapeutas" },
  { id: "anjos" },
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
): AdminProfessionCategory | null {
  switch (typeKey) {
    case "psychologist":
      return "psicologos";
    case "nutritionist":
      return "nutricionistas";
    case "physiotherapist":
      return "fisioterapeutas";
    case "nurse":
      return "enfermeiros";
    case "pharmacist":
      return "farmaceuticos";
    case "dentist":
    case "doctor":
      return "medicos";
    default:
      return null;
  }
}

function tabFromCanonicalProfession(raw: string): AdminProfessionCategory | null {
  const canonical = canonicalProfessionValue(raw);
  if (!canonical) return null;
  if (canonical === PSYCHOANALYSIS_SPECIALTY || canonical === "Psychoanalyst") {
    return "psicanalistas";
  }
  if (INTEGRATIVE_OTHER_PROFESSIONS.has(canonical)) return "terapeutas";
  if (canonical in OTHER_GROUP_CANONICAL_TAB) {
    return OTHER_GROUP_CANONICAL_TAB[canonical];
  }

  for (const group of PROFESSION_GROUPS) {
    if (!group.options.includes(canonical)) continue;
    return PROFESSION_GROUP_TAB[group.groupKey] ?? null;
  }
  return null;
}

/**
 * Strict profession classification from specialty text alone.
 * Returns null when the text does not map to a known health profession
 * (e.g. angels who list "Contador" as their volunteer profession).
 */
export function classifyProfessionCategory(
  specialty: string | null | undefined,
): AdminProfessionCategory | null {
  const raw = (specialty ?? "").trim();
  const s = normalizeProfessionText(specialty);
  if (!s) return null;

  if (s.includes("nutricion")) return "nutricionistas";
  if (s.includes("fisioterap")) return "fisioterapeutas";
  if (s.includes("psicanal")) return "psicanalistas";
  if (s.includes("terapeuta integrativ")) return "terapeutas";
  if (isPsychologistSpecialtyValue(specialty)) return "psicologos";
  if (
    s.includes("enferm") ||
    s.includes("nurse") ||
    s.includes("midwife") ||
    s.includes("obstetric nurse")
  ) {
    return "enfermeiros";
  }
  if (s.includes("farmac") || s.includes("pharm")) return "farmaceuticos";

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

  return null;
}

/** Infer tab from license prefix when specialty is empty or ambiguous. */
export function inferAdminTabFromLicense(
  licenseNumber: string | null | undefined,
): AdminProfessionCategory | null {
  const lic = (licenseNumber ?? "").trim().toUpperCase();
  if (!lic) return null;
  if (/\bCRM\b|\bCRO\b|CRM[\s/-]|CRO[\s/-]/.test(lic)) return "medicos";
  if (/\bCRP\b|CRP[\s/-]/.test(lic)) return "psicologos";
  if (/\bCRN\b|CRN[\s/-]/.test(lic)) return "nutricionistas";
  if (/\bCREFITO\b|CREFITO[\s/-]/.test(lic)) return "fisioterapeutas";
  if (/\bCOREN\b|COREN[\s/-]/.test(lic)) return "enfermeiros";
  if (/\bCRF\b|CRF[\s/-]/.test(lic)) return "farmaceuticos";
  return null;
}

/**
 * Single source of truth for which admin tab a professional belongs to.
 * Every PROFESSIONAL signup maps to a portal category; default is médicos.
 */
export function resolveAdminTabForProfessional(
  specialty: string | null | undefined,
  licenseNumber?: string | null,
): AdminProfessionCategory {
  const classified = classifyProfessionCategory(specialty);
  if (classified) return classified;

  const fromLicense = inferAdminTabFromLicense(licenseNumber);
  if (fromLicense) return fromLicense;

  return "medicos";
}

/** @deprecated Use classifyProfessionCategory — kept for internal angel matching. */
export function resolveAdminTabFromProfessionText(
  specialty: string | null | undefined,
): AdminProfessionCategory | null {
  return classifyProfessionCategory(specialty);
}

export function angelMatchesAdminTab(
  angel: { profession: string | null },
  tab: AdminProviderTab,
): boolean {
  if (tab === "pendentes" || tab === "anjos" || tab === "todos" || tab === "incompletos") {
    return false;
  }
  const category = classifyProfessionCategory(angel.profession);
  return category !== null && category === tab;
}

export function matchesAdminProviderTab(
  tab: AdminProviderTab,
  specialty: string | null | undefined,
  licenseNumber?: string | null,
): boolean {
  if (tab === "pendentes" || tab === "anjos" || tab === "todos" || tab === "incompletos") {
    return false;
  }
  return resolveAdminTabForProfessional(specialty, licenseNumber) === tab;
}
