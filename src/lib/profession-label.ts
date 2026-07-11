// Derives human-readable profession type and council prefix from specialty string.

import type { Lang } from "@/lib/i18n/translations";
import { translate } from "@/lib/i18n/translations";
import { canonicalProfessionValue } from "@/lib/professions";

const PSYCHOLOGY = new Set([
  "Psychologist", "Psychology", "Psychoanalyst", "Neuropsychologist", "Psychotherapist", "Behavioral Therapist",
]);

const NUTRITION = new Set(["Nutritionist", "Dietitian"]);

const PHYSIO = new Set(["Physiotherapist", "Physical Therapist", "Occupational Therapist"]);

const NURSING = new Set([
  "Nurse", "Nursing", "Nurse Practitioner", "Midwife", "Obstetric Nurse",
]);

const PHARMACY = new Set(["Pharmacist", "Clinical Pharmacist", "Pharmacy"]);

const DENTISTRY = new Set([
  "Dentist", "Dental Surgeon", "Dentist (General)", "Orthodontist", "Endodontist",
  "Periodontist", "Oral and Maxillofacial Surgeon", "Pediatric Dentist", "Dentista",
]);

export interface ProfessionInfo {
  typeKey:    "doctor" | "psychologist" | "nutritionist" | "physiotherapist" | "nurse" | "pharmacist" | "dentist" | "professional";
  councilKey: "crm" | "crp" | "crn" | "crn_nutrition" | "crefito" | "crf" | "cro" | "council";
}

export function isPsychologist(specialty: string | null | undefined): boolean {
  if (!specialty) return false;
  return getProfessionInfo(specialty).typeKey === "psychologist";
}

export function isNutritionistSpecialty(specialty: string | null | undefined): boolean {
  if (!specialty?.trim()) return false;
  const s = specialty.trim();
  if (s === "Nutrition") return true;
  return getProfessionInfo(s).typeKey === "nutritionist";
}

export function isNurseSpecialty(specialty: string | null | undefined): boolean {
  if (!specialty?.trim()) return false;
  return getProfessionInfo(specialty.trim()).typeKey === "nurse";
}

export function isPharmacistSpecialty(specialty: string | null | undefined): boolean {
  if (!specialty?.trim()) return false;
  return getProfessionInfo(specialty.trim()).typeKey === "pharmacist";
}

export function isDentistSpecialty(specialty: string | null | undefined): boolean {
  if (!specialty?.trim()) return false;
  return getProfessionInfo(specialty.trim()).typeKey === "dentist";
}

export function getProfessionInfo(specialty: string): ProfessionInfo {
  const s = (canonicalProfessionValue(specialty) ?? specialty).trim();
  if (PSYCHOLOGY.has(s)) return { typeKey: "psychologist", councilKey: "crp" };
  if (NUTRITION.has(s)) return { typeKey: "nutritionist", councilKey: "crn_nutrition" };
  if (PHYSIO.has(s)) return { typeKey: "physiotherapist", councilKey: "crefito" };
  if (NURSING.has(s)) return { typeKey: "nurse", councilKey: "crn" };
  if (PHARMACY.has(s)) return { typeKey: "pharmacist", councilKey: "crf" };
  if (DENTISTRY.has(s)) return { typeKey: "dentist", councilKey: "cro" };
  // Medical specialties and general practice
  return { typeKey: "doctor", councilKey: "crm" };
}

export function formatLicense(licenseNumber: string, licenseState: string | null, councilKey: ProfessionInfo["councilKey"]): string {
  const prefix = councilKey.toUpperCase().replace("_NUTRITION", "N");
  const num = licenseNumber.trim();
  if (!num) return "";
  if (licenseState) return `${prefix} ${num}/${licenseState}`;
  return `${prefix} ${num}`;
}

/** Patient-facing honorific before provider name (AGD-34). */
export function patientProviderNamePrefix(
  lang: Lang,
  specialty: string,
  providerType?: "health" | "psychoanalyst" | "integrative",
): string {
  if (providerType === "psychoanalyst") return "";
  if (providerType === "integrative") return translate(lang, "volAppt.providerPrefix.integrative");

  switch (getProfessionInfo(specialty).typeKey) {
    case "psychologist":
      return translate(lang, "volAppt.providerPrefix.psychologist");
    case "nutritionist":
      return "Nutr.";
    case "physiotherapist":
      return "Fisio.";
    case "nurse":
      return "Enf.";
    case "dentist":
      return "Dent.";
    case "pharmacist":
      return "";
    default:
      return translate(lang, "volAppt.providerPrefix.doctor");
  }
}

export function formatPatientProviderDisplayName(
  lang: Lang,
  firstName: string,
  lastName: string,
  specialty: string,
  providerType?: "health" | "psychoanalyst" | "integrative",
): string {
  const prefix = patientProviderNamePrefix(lang, specialty, providerType);
  const name = `${firstName} ${lastName}`.trim();
  return prefix ? `${prefix} ${name}` : name;
}
