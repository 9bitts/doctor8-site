// Derives human-readable profession type and council prefix from specialty string.

const PSYCHOLOGY = new Set([
  "Psychologist", "Psychology", "Psychoanalyst", "Neuropsychologist", "Psychotherapist", "Behavioral Therapist",
]);

const NUTRITION = new Set(["Nutritionist", "Dietitian"]);

const PHYSIO = new Set(["Physiotherapist", "Physical Therapist", "Occupational Therapist"]);

const NURSING = new Set([
  "Nurse", "Nursing", "Nurse Practitioner", "Midwife", "Obstetric Nurse",
]);

const PHARMACY = new Set(["Pharmacist", "Clinical Pharmacist", "Pharmacy"]);

const DENTISTRY = new Set(["Dentist", "Dental Surgeon"]);

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

export function getProfessionInfo(specialty: string): ProfessionInfo {
  const s = specialty.trim();
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
