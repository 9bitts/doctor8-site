/** Pharmacy store (B2B drogaria) portal routes — Pilar 3. */

export const PHARMACY_STORE_HOME = "/farmacias/painel";
export const PHARMACY_STORE_LOGIN = "/farmacias/login";
export const PHARMACY_STORE_REGISTER = "/farmacias/cadastro";
export const PHARMACY_STORE_LANDING = "/farmacias";
export const PHARMACY_STORE_INVENTORY = "/farmacias/estoque";
export const PHARMACY_STORE_SETTINGS = "/farmacias/configuracoes";

export const PHARMACY_STORE_PHARMACIST_HOME = "/farmacias/farmaceutico/painel";
export const PHARMACY_STORE_PHARMACIST_LOGIN = "/farmacias/farmaceutico/login";

export const PHARMACY_STORE_PUBLIC_PREFIXES = [
  "/farmacias",
  "/farmacias/login",
  "/farmacias/cadastro",
  "/farmacias/farmaceutico/login",
] as const;

export function isPharmacyStorePublicPath(pathname: string): boolean {
  if (pathname === "/farmacias") return true;
  if (pathname === "/farmacias/login" || pathname === "/farmacias/cadastro") return true;
  if (pathname === "/farmacias/farmaceutico/login") return true;
  if (pathname.startsWith("/farmacias/validar/")) return true;
  return false;
}

export function isPharmacyStoreDashboardPath(pathname: string): boolean {
  if (!pathname.startsWith("/farmacias/")) return false;
  return !isPharmacyStorePublicPath(pathname);
}

export function isPharmacyStorePharmacistPath(pathname: string): boolean {
  return pathname === "/farmacias/farmaceutico/painel"
    || pathname.startsWith("/farmacias/farmaceutico/painel/");
}
