// Registration country/region options (Americas + EU) and billing mapping.

import type { Lang } from "@/lib/i18n/translations";
import type { BillingRegion } from "@/lib/billing-regions";

export type RegistrationRegionCode =
  | "EU"
  | "US" | "CA" | "MX"
  | "BZ" | "CR" | "SV" | "GT" | "HN" | "NI" | "PA"
  | "AG" | "BS" | "BB" | "CU" | "DM" | "DO" | "GD" | "HT" | "JM" | "KN" | "LC" | "VC" | "TT"
  | "AR" | "BO" | "BR" | "CL" | "CO" | "EC" | "GY" | "PY" | "PE" | "SR" | "UY" | "VE";

type RegionMeta = { flag: string; pt: string; en: string; es: string };

export const REGISTRATION_REGION_META: Record<RegistrationRegionCode, RegionMeta> = {
  US: { flag: "????", pt: "Estados Unidos", en: "United States", es: "Estados Unidos" },
  CA: { flag: "????", pt: "Canad?", en: "Canada", es: "Canad?" },
  MX: { flag: "????", pt: "M?xico", en: "Mexico", es: "M?xico" },
  BZ: { flag: "????", pt: "Belize", en: "Belize", es: "Belice" },
  CR: { flag: "????", pt: "Costa Rica", en: "Costa Rica", es: "Costa Rica" },
  SV: { flag: "????", pt: "El Salvador", en: "El Salvador", es: "El Salvador" },
  GT: { flag: "????", pt: "Guatemala", en: "Guatemala", es: "Guatemala" },
  HN: { flag: "????", pt: "Honduras", en: "Honduras", es: "Honduras" },
  NI: { flag: "????", pt: "Nicar?gua", en: "Nicaragua", es: "Nicaragua" },
  PA: { flag: "????", pt: "Panam?", en: "Panama", es: "Panam?" },
  AG: { flag: "????", pt: "Ant?gua e Barbuda", en: "Antigua and Barbuda", es: "Antigua y Barbuda" },
  BS: { flag: "????", pt: "Bahamas", en: "Bahamas", es: "Bahamas" },
  BB: { flag: "????", pt: "Barbados", en: "Barbados", es: "Barbados" },
  CU: { flag: "????", pt: "Cuba", en: "Cuba", es: "Cuba" },
  DM: { flag: "????", pt: "Dominica", en: "Dominica", es: "Dominica" },
  DO: { flag: "????", pt: "Rep?blica Dominicana", en: "Dominican Republic", es: "Rep?blica Dominicana" },
  GD: { flag: "????", pt: "Granada", en: "Grenada", es: "Granada" },
  HT: { flag: "????", pt: "Haiti", en: "Haiti", es: "Hait?" },
  JM: { flag: "????", pt: "Jamaica", en: "Jamaica", es: "Jamaica" },
  KN: { flag: "????", pt: "S?o Crist?v?o e N?vis", en: "Saint Kitts and Nevis", es: "San Crist?bal y Nieves" },
  LC: { flag: "????", pt: "Santa L?cia", en: "Saint Lucia", es: "Santa Luc?a" },
  VC: { flag: "????", pt: "S?o Vicente e Granadinas", en: "Saint Vincent and the Grenadines", es: "San Vicente y las Granadinas" },
  TT: { flag: "????", pt: "Trinidad e Tobago", en: "Trinidad and Tobago", es: "Trinidad y Tobago" },
  AR: { flag: "????", pt: "Argentina", en: "Argentina", es: "Argentina" },
  BO: { flag: "????", pt: "Bol?via", en: "Bolivia", es: "Bolivia" },
  BR: { flag: "????", pt: "Brasil", en: "Brazil", es: "Brasil" },
  CL: { flag: "????", pt: "Chile", en: "Chile", es: "Chile" },
  CO: { flag: "????", pt: "Col?mbia", en: "Colombia", es: "Colombia" },
  EC: { flag: "????", pt: "Equador", en: "Ecuador", es: "Ecuador" },
  GY: { flag: "????", pt: "Guiana", en: "Guyana", es: "Guyana" },
  PY: { flag: "????", pt: "Paraguai", en: "Paraguay", es: "Paraguay" },
  PE: { flag: "????", pt: "Peru", en: "Peru", es: "Per?" },
  SR: { flag: "????", pt: "Suriname", en: "Suriname", es: "Surinam" },
  UY: { flag: "????", pt: "Uruguai", en: "Uruguay", es: "Uruguay" },
  VE: { flag: "????", pt: "Venezuela", en: "Venezuela", es: "Venezuela" },
  EU: { flag: "????", pt: "Uni?o Europeia", en: "European Union", es: "Uni?n Europea" },
};

export const REGISTRATION_REGION_GROUPS: {
  key: string;
  labelKey: string;
  codes: readonly RegistrationRegionCode[];
}[] = [
  {
    key: "north_america",
    labelKey: "reg.regionGroupNorthAmerica",
    codes: ["US", "CA", "MX"],
  },
  {
    key: "central_america",
    labelKey: "reg.regionGroupCentralAmerica",
    codes: ["BZ", "CR", "SV", "GT", "HN", "NI", "PA"],
  },
  {
    key: "caribbean",
    labelKey: "reg.regionGroupCaribbean",
    codes: ["AG", "BS", "BB", "CU", "DM", "DO", "GD", "HT", "JM", "KN", "LC", "VC", "TT"],
  },
  {
    key: "south_america",
    labelKey: "reg.regionGroupSouthAmerica",
    codes: ["AR", "BO", "BR", "CL", "CO", "EC", "GY", "PY", "PE", "SR", "UY", "VE"],
  },
  {
    key: "europe",
    labelKey: "reg.regionGroupEurope",
    codes: ["EU"],
  },
];

export const REGISTRATION_REGION_CODES = REGISTRATION_REGION_GROUPS.flatMap(
  (g) => g.codes,
) as RegistrationRegionCode[];

const REGISTRATION_REGION_SET = new Set<string>(REGISTRATION_REGION_CODES);

export function isValidRegistrationRegion(value: unknown): value is RegistrationRegionCode {
  return typeof value === "string" && REGISTRATION_REGION_SET.has(value);
}

export function parseRegistrationRegion(
  value: unknown,
  fallback: RegistrationRegionCode = "US",
): RegistrationRegionCode {
  return isValidRegistrationRegion(value) ? value : fallback;
}

export function registrationRegionLabel(code: RegistrationRegionCode, lang: Lang): string {
  const meta = REGISTRATION_REGION_META[code];
  if (!meta) return code;
  const name = lang === "pt" ? meta.pt : lang === "es" ? meta.es : meta.en;
  return `${meta.flag} ${name}`;
}

/** Maps account country to Stripe billing bucket (BR / US / EU / VE). */
export function toBillingRegion(code: RegistrationRegionCode | string): BillingRegion {
  if (code === "BR") return "BR";
  if (code === "VE") return "VE";
  if (code === "EU") return "EU";
  if (code === "US") return "US";
  if (isValidRegistrationRegion(code)) return "US";
  return "US";
}

export function requiresHipaa(code: RegistrationRegionCode | string): boolean {
  return code === "US";
}

export function requiresGdpr(code: RegistrationRegionCode | string): boolean {
  return code === "EU";
}
