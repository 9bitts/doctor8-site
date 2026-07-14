import { getProfessionInfo } from "@/lib/profession-label";
import type { LibraryProfessionKey, LibraryProviderKind } from "./types";

export function professionKeyFromSpecialty(
  specialty: string | null | undefined,
): Exclude<LibraryProfessionKey, "psychoanalyst" | "integrative_therapist"> {
  const { typeKey } = getProfessionInfo(specialty || "General Practice");
  if (typeKey === "professional" || typeKey === "physiotherapist") return "doctor";
  return typeKey;
}

export function resolveLibraryProfessionKey(opts: {
  role: string;
  specialty?: string | null;
}): LibraryProfessionKey {
  if (opts.role === "PSYCHOANALYST") return "psychoanalyst";
  if (opts.role === "INTEGRATIVE_THERAPIST") return "integrative_therapist";
  return professionKeyFromSpecialty(opts.specialty);
}

export function providerKindFromRole(role: string): LibraryProviderKind {
  if (role === "PSYCHOANALYST") return "psychoanalyst";
  if (role === "INTEGRATIVE_THERAPIST") return "integrative";
  return "health";
}

export const LIBRARY_CATEGORY_KEYS: ResourceCategoryKey[] = [
  "general",
  "condition",
  "medication",
  "lifestyle",
  "procedure",
  "mental_health",
  "nutrition",
  "dental",
  "integrative",
  "parenting",
  "other",
];

type ResourceCategoryKey = import("./types").ResourceCategory;

export function categoriesForProfession(profession: LibraryProfessionKey): ResourceCategoryKey[] {
  const base: ResourceCategoryKey[] = ["general", "condition", "lifestyle", "other"];
  switch (profession) {
    case "psychologist":
    case "psychoanalyst":
      return [...base, "mental_health", "parenting"];
    case "nutritionist":
      return [...base, "nutrition", "lifestyle"];
    case "dentist":
      return [...base, "dental", "procedure"];
    case "pharmacist":
      return [...base, "medication"];
    case "nurse":
      return [...base, "procedure", "medication"];
    case "integrative_therapist":
      return [...base, "integrative", "lifestyle"];
    case "doctor":
    default:
      return [...base, "medication", "procedure", "mental_health", "integrative"];
  }
}
