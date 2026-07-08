/** Occupational physician (PCMSO coordinator) portal — B2B NR-1 read-only slice. */

export const OCCUPATIONAL_PHYSICIAN_HOME = "/empresas/medico/painel";
export const OCCUPATIONAL_PHYSICIAN_LOGIN = "/empresas/medico/login";
export const OCCUPATIONAL_PHYSICIAN_REGISTER = "/empresas/medico/cadastro";

export const OCCUPATIONAL_PHYSICIAN_PUBLIC_PREFIXES = [
  "/empresas/medico/login",
  "/empresas/medico/cadastro",
  "/empresas/medico/aceitar",
] as const;

export function isOccupationalPhysicianPublicPath(pathname: string): boolean {
  return OCCUPATIONAL_PHYSICIAN_PUBLIC_PREFIXES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function isOccupationalPhysicianDashboardPath(pathname: string): boolean {
  return pathname.startsWith("/empresas/medico/") && !isOccupationalPhysicianPublicPath(pathname);
}
