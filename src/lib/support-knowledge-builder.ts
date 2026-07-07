/**
 * Auto-generates support AI knowledge from platform-nav-registry.ts.
 * Manual flow descriptions stay in support-knowledge-manual.ts.
 */

import {
  PLATFORM_NAV_BY_PORTAL,
  PLATFORM_PUBLIC_ROUTES,
  type PlatformPortalId,
} from "@/lib/platform-nav-registry";

const PORTAL_LABELS: Record<PlatformPortalId, string> = {
  PATIENT: "Patient portal",
  PROFESSIONAL: "Physician portal (/professional)",
  PSYCHOLOGIST: "Psychologist portal (/psychologist)",
  NUTRITIONIST: "Nutritionist portal (/nutricionista)",
  NURSE: "Nurse portal (/enfermeiro)",
  PHARMACIST: "Pharmacist portal (/farmaceutico)",
  DENTIST: "Dentist portal (/odontologo)",
  PSYCHOANALYST: "Psychoanalyst portal (/psychoanalyst)",
  INTEGRATIVE_THERAPIST: "Integrative therapist portal (/integrative-therapist)",
  ORGANIZATION: "Clinic / organization portal (/organization)",
  ADMIN: "Admin portal (/admin ? ADMIN role only)",
  ANGEL: "Angel volunteer portal (/admin/patients, /admin/angel ? ANGEL role)",
};

export function buildGeneratedNavKnowledge(): string {
  const sections: string[] = [
    "AUTO-GENERATED ROUTE INDEX (synced from platform-nav-registry.ts ? update registry when adding menus):",
    "",
  ];

  for (const [portalId, entries] of Object.entries(PLATFORM_NAV_BY_PORTAL) as [
    PlatformPortalId,
    typeof PLATFORM_NAV_BY_PORTAL[PlatformPortalId],
  ][]) {
    sections.push(`${PORTAL_LABELS[portalId]}:`);
    for (const entry of entries) {
      sections.push(`- ${entry.href} ? menu key: ${entry.labelKey}`);
    }
    sections.push("");
  }

  sections.push("PUBLIC / AUTH ROUTES (not in dashboard sidebar):");
  for (const route of PLATFORM_PUBLIC_ROUTES) {
    sections.push(`- ${route.href} ? ${route.description}`);
  }

  return sections.join("\n");
}
