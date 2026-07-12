import { getProfessionInfo } from "@/lib/profession-label";

const CRN_NUMBER = /^\d{3,8}$/;
const UF_CODE = /^[A-Z]{2}$/;

/** Validates professional license number + state for the given specialty. */
export function validateProfessionalLicense(
  specialty: string,
  licenseNumber: string,
  licenseState: string,
): string | null {
  const trimmed = licenseNumber.trim();
  const state = licenseState.trim().toUpperCase();
  if (!trimmed) return "licenseRequired";

  const { councilKey } = getProfessionInfo(specialty);

  if (councilKey === "crn_nutrition") {
    if (!CRN_NUMBER.test(trimmed)) return "crnInvalidNumber";
    if (!UF_CODE.test(state)) return "crnInvalidState";
    return null;
  }

  if (councilKey === "cro") {
    if (!CRN_NUMBER.test(trimmed)) return "croInvalidNumber";
    if (!UF_CODE.test(state)) return "croInvalidState";
    return null;
  }

  return null;
}

/** Whether a provider should appear in public search / booking listings. */
export function hasListableLicense(licenseNumber: string | null | undefined): boolean {
  return Boolean(licenseNumber?.trim());
}
