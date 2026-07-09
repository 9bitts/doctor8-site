import type { VoicePortalId } from "./types";

/** Resolve voice portal from dashboard pathname. */
export function resolveVoicePortalFromPathname(pathname: string): VoicePortalId | null {
  if (pathname.startsWith("/psychologist")) return "PSYCHOLOGIST";
  if (pathname.startsWith("/nutricionista")) return "NUTRITIONIST";
  if (pathname.startsWith("/enfermeiro")) return "NURSE";
  if (pathname.startsWith("/farmaceutico")) return "PHARMACIST";
  if (pathname.startsWith("/odontologo")) return "DENTIST";
  if (pathname.startsWith("/psychoanalyst")) return "PSYCHOANALYST";
  if (pathname.startsWith("/integrative-therapist")) return "INTEGRATIVE_THERAPIST";
  if (pathname.startsWith("/professional")) return "PROFESSIONAL";
  return null;
}

export function prescriptionsRouteForPortal(portalId: VoicePortalId): string {
  switch (portalId) {
    case "DENTIST":
      return "/odontologo/prescriptions";
    case "INTEGRATIVE_THERAPIST":
      return "/integrative-therapist/prescriptions";
    default:
      return "/professional/prescriptions";
  }
}

export function patientsRouteForPortal(portalId: VoicePortalId): string {
  switch (portalId) {
    case "PSYCHOLOGIST":
      return "/psychologist/patients";
    case "NUTRITIONIST":
      return "/nutricionista/patients";
    case "NURSE":
      return "/enfermeiro/patients";
    case "PHARMACIST":
      return "/farmaceutico/patients";
    case "DENTIST":
      return "/odontologo/patients";
    case "PSYCHOANALYST":
      return "/psychoanalyst/analysands";
    case "INTEGRATIVE_THERAPIST":
      return "/integrative-therapist/clients";
    default:
      return "/professional/patients";
  }
}

export function appointmentsRouteForPortal(portalId: VoicePortalId): string {
  switch (portalId) {
    case "PSYCHOLOGIST":
      return "/psychologist/appointments";
    case "NUTRITIONIST":
      return "/nutricionista/appointments";
    case "NURSE":
      return "/enfermeiro/appointments";
    case "PHARMACIST":
      return "/farmaceutico/appointments";
    case "DENTIST":
      return "/odontologo/appointments";
    case "PSYCHOANALYST":
      return "/psychoanalyst/appointments";
    case "INTEGRATIVE_THERAPIST":
      return "/integrative-therapist/appointments";
    default:
      return "/professional/appointments";
  }
}

export function patientChartRouteForPortal(portalId: VoicePortalId, recordId: string): string {
  switch (portalId) {
    case "PSYCHOLOGIST":
      return `/psychologist/patients/${recordId}`;
    case "NUTRITIONIST":
      return `/nutricionista/patients/${recordId}`;
    case "NURSE":
      return `/enfermeiro/patients/${recordId}`;
    case "PHARMACIST":
      return `/farmaceutico/patients/${recordId}`;
    case "DENTIST":
      return `/odontologo/patients/${recordId}`;
    case "INTEGRATIVE_THERAPIST":
      return `/integrative-therapist/clients/${recordId}`;
    default:
      return `/professional/patients/${recordId}`;
  }
}
