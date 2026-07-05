import type { MedicinalTeasPortal } from "./types";

export function medicinalTeasBasePath(portal: MedicinalTeasPortal): string {
  return portal === "professional"
    ? "/professional/chas-medicinais"
    : "/integrative-therapist/chas-medicinais";
}

export function detectMedicinalTeasPortal(pathname: string): MedicinalTeasPortal {
  return pathname.startsWith("/integrative-therapist") ? "integrative-therapist" : "professional";
}
