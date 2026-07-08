/** Psychologist entry point under Doctor8 Empresas (EAP / rede B2B) — reuses /psychologist dashboard. */

import { PSYCHOLOGIST_HOME, PSYCHOLOGIST_REGISTER } from "@/lib/psychologist-portal";

export const EMPLOYER_PSYCHOLOGIST_LOGIN = "/empresas/psicologo/login";
export const EMPLOYER_PSYCHOLOGIST_HOME = PSYCHOLOGIST_HOME;
export const EMPLOYER_PSYCHOLOGIST_REGISTER = PSYCHOLOGIST_REGISTER;

export function isEmployerPsychologistPublicPath(pathname: string): boolean {
  return pathname === EMPLOYER_PSYCHOLOGIST_LOGIN;
}
