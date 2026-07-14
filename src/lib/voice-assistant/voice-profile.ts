import { hasAnyNaturalMedicinePractice } from "@/lib/natural-medicine/config";
import {
  professionalPortalBaseFromSpecialty,
  type ProfessionalPortalBase,
} from "@/lib/psychologist-portal";
import {
  resolveSkillsPortalFromPathname,
  resolveVoicePortalFromPathname,
} from "./portal-resolver";
import type { VoicePortalId, VoiceProfileContext } from "./types";

export type { VoiceProfileContext };

const BASE_TO_VOICE_PORTAL: Record<ProfessionalPortalBase, VoicePortalId> = {
  "/psychologist": "PSYCHOLOGIST",
  "/nutricionista": "NUTRITIONIST",
  "/enfermeiro": "NURSE",
  "/farmaceutico": "PHARMACIST",
  "/odontologo": "DENTIST",
  "/professional": "PROFESSIONAL",
};

export function voicePortalFromProfessionalBase(base: ProfessionalPortalBase): VoicePortalId {
  return BASE_TO_VOICE_PORTAL[base];
}

export function voicePortalFromSpecialty(
  specialty: string | null | undefined,
): VoicePortalId {
  return voicePortalFromProfessionalBase(professionalPortalBaseFromSpecialty(specialty));
}

/**
 * Resolves which skill set applies — pathname first for dedicated portals and
 * /professional/psychology, then profile specialty when on generic /professional.
 */
export function resolveEffectiveSkillsPortal(
  pathname: string | undefined,
  profile: VoiceProfileContext | null | undefined,
  fallbackPortalId: VoicePortalId,
): VoicePortalId {
  if (pathname) {
    const fromSkillsPath = resolveSkillsPortalFromPathname(pathname);
    if (fromSkillsPath === "PSYCHOLOGIST") return "PSYCHOLOGIST";

    const fromPath = resolveVoicePortalFromPathname(pathname);
    if (fromPath && fromPath !== "PROFESSIONAL") return fromPath;
  }

  if (profile?.specialty) {
    const fromSpecialty = voicePortalFromSpecialty(profile.specialty);
    if (fromSpecialty !== "PROFESSIONAL") return fromSpecialty;
  }

  if (pathname) {
    const fromSkillsPath = resolveSkillsPortalFromPathname(pathname);
    if (fromSkillsPath) return fromSkillsPath;
  }

  return fallbackPortalId;
}

export function shouldShowNaturalMedicineNav(
  portalId: VoicePortalId,
  profile: VoiceProfileContext | null | undefined,
): boolean {
  if (portalId === "PROFESSIONAL") {
    return profile?.practicesIntegrativeMedicine === true;
  }
  if (portalId === "INTEGRATIVE_THERAPIST") {
    return hasAnyNaturalMedicinePractice(profile?.picsPractices ?? []);
  }
  return true;
}

export function filterNavigationForProfile(
  items: Array<{ href: string; labelKey: string }>,
  portalId: VoicePortalId,
  profile: VoiceProfileContext | null | undefined,
): Array<{ href: string; labelKey: string }> {
  if (shouldShowNaturalMedicineNav(portalId, profile)) return items;
  return items.filter((item) => !item.href.includes("/medicina-natural"));
}
