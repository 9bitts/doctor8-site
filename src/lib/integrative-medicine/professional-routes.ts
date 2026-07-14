/** Routes and auth links for the physician integrative medicine area. */

export const PROFESSIONAL_INTEGRATIVE_HUB = "/professional/medicina-natural";

export const INTEGRATIVE_MEDICINE_LANDING = "/medicinaintegrativa";

export function professionalIntegrativePrescriptionHref(
  add: "phytotherapy" | "floral" | "homeopathy" | "aromatherapy" | "apitherapy" | "cannabis" = "phytotherapy",
): string {
  return `/professional/prescriptions?add=${add}`;
}

export function professionalIntegrativeProtocolHref(protocolId: string): string {
  return `/professional/prescriptions?protocol=${encodeURIComponent(protocolId)}`;
}

export function doctorIntegrativeLoginHref(callbackUrl = PROFESSIONAL_INTEGRATIVE_HUB): string {
  const sp = new URLSearchParams({ portal: "doctor", callbackUrl });
  return `/login?${sp.toString()}`;
}

export function doctorIntegrativeRegisterHref(callbackUrl = PROFESSIONAL_INTEGRATIVE_HUB): string {
  const sp = new URLSearchParams({ portal: "doctor", callbackUrl });
  return `/register/professional/signup?${sp.toString()}`;
}
