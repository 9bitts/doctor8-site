import { isPharmacistSpecialty } from "@/lib/profession-label";

export function canAccessPharmacyPharmacistPortal(
  role: string,
  specialty?: string | null,
): boolean {
  if (role === "ADMIN") return true;
  return role === "PROFESSIONAL" && isPharmacistSpecialty(specialty);
}

export function canAccessPharmacyStorePortal(role: string): boolean {
  return role === "PHARMACY_STORE" || role === "ADMIN";
}

export function canAccessPharmacyValidatePortal(
  role: string,
  specialty?: string | null,
): boolean {
  if (role === "ADMIN" || role === "PHARMACY_STORE") return true;
  return canAccessPharmacyPharmacistPortal(role, specialty);
}
