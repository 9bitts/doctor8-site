/** Laboratory (B2B lab network) portal routes. */

export const LABORATORY_HOME = "/laboratorios/painel";
export const LABORATORY_LOGIN = "/laboratorios/login";
export const LABORATORY_REGISTER = "/laboratorios/cadastro";
export const LABORATORY_LANDING = "/laboratorios";
export const LABORATORY_EXAMS = "/laboratorios/exames";
export const LABORATORY_SETTINGS = "/laboratorios/configuracoes";

export const LABORATORY_PUBLIC_PREFIXES = [
  "/laboratorios",
  "/laboratorios/login",
  "/laboratorios/cadastro",
] as const;

export function isLaboratoryPublicPath(pathname: string): boolean {
  if (pathname === "/laboratorios") return true;
  if (pathname === "/laboratorios/login" || pathname === "/laboratorios/cadastro") return true;
  return false;
}

export function isLaboratoryDashboardPath(pathname: string): boolean {
  if (!pathname.startsWith("/laboratorios/")) return false;
  return !isLaboratoryPublicPath(pathname);
}

export const LABORATORY_TYPE_LABELS: Record<string, string> = {
  BLOOD: "Análises clínicas (sangue)",
  IMAGING: "Exames de imagem",
  BOTH: "Análises clínicas e imagem",
};
