import type { NaturalMedicinePortal } from "@/lib/natural-medicine/config";

export type MedicinaNaturalCatalogPortal = "professional" | "integrative-therapist";

export function mnCatalogApiBase(portal: MedicinaNaturalCatalogPortal): string {
  return portal === "professional"
    ? "/api/professional/medicina-natural"
    : "/api/integrative-therapist/medicina-natural";
}

export function mnCatalogBasePath(portal: MedicinaNaturalCatalogPortal): string {
  return portal === "professional"
    ? "/professional/medicina-natural"
    : "/integrative-therapist/medicina-natural";
}

export function detectMnCatalogPortal(pathname: string): MedicinaNaturalCatalogPortal {
  return pathname.startsWith("/integrative-therapist")
    ? "integrative-therapist"
    : "professional";
}

export function naturalPortalToCatalogPortal(
  portal: NaturalMedicinePortal,
): MedicinaNaturalCatalogPortal {
  return portal === "professional" ? "professional" : "integrative-therapist";
}

export function prescriptionsBasePath(portal: MedicinaNaturalCatalogPortal): string {
  return portal === "professional"
    ? "/professional/prescriptions"
    : "/integrative-therapist/prescriptions";
}
