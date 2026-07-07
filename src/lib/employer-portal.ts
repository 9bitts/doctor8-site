/** Employer (B2B NR-1) portal routes — separate from Organization (clinic CNPJ). */

export const EMPLOYER_HOME = "/empresas/painel";
export const EMPLOYER_LOGIN = "/empresas/login";
export const EMPLOYER_REGISTER = "/empresas/cadastro";
export const EMPLOYER_LANDING = "/empresas";

export const EMPLOYER_PUBLIC_PREFIXES = [
  "/empresas",
  "/empresas/login",
  "/empresas/cadastro",
  "/empresas/pesquisa",
  "/empresas/denuncia",
  "/empresas/convite",
  "/empresas/equipe/cadastro",
] as const;

export function isEmployerPublicPath(pathname: string): boolean {
  if (pathname === "/empresas") return true;
  if (pathname === "/empresas/login" || pathname === "/empresas/cadastro") return true;
  if (pathname.startsWith("/empresas/pesquisa/")) return true;
  if (pathname.startsWith("/empresas/denuncia/")) return true;
  if (pathname.startsWith("/empresas/convite/")) return true;
  if (pathname.startsWith("/empresas/equipe/cadastro")) return true;
  return false;
}

export function isEmployerDashboardPath(pathname: string): boolean {
  if (!pathname.startsWith("/empresas/")) return false;
  return !isEmployerPublicPath(pathname);
}
