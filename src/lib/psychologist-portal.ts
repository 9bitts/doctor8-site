import { isPsychologist } from "@/lib/profession-label";

export const PSYCHOLOGIST_LOGIN = "/login/psicologo";
export const PSYCHOLOGIST_HOME = "/psychologist";
export const PSYCHOLOGIST_REGISTER =
  "/register/professional/signup?portal=psychologist";

/** True when specialty is a psychology profession (includes onboarding value "Psychology"). */
export function isPsychologistSpecialty(
  specialty: string | null | undefined,
): boolean {
  if (!specialty?.trim()) return false;
  const s = specialty.trim();
  if (s === "Psychology") return true;
  return isPsychologist(s);
}

export function psychologistHubHref(pathname: string): string {
  return pathname.startsWith("/psychologist")
    ? PSYCHOLOGIST_HOME
    : "/professional/psychology";
}
