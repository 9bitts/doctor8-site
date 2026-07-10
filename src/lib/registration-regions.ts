// Registration country/region options (Americas + EU) and billing mapping.

import type { Lang } from "@/lib/i18n/translations";
import type { BillingRegion } from "@/lib/billing-regions";

export type RegistrationRegionCode =
  | "EU"
  | "US" | "CA" | "MX"
  | "BZ" | "CR" | "SV" | "GT" | "HN" | "NI" | "PA"
  | "AG" | "BS" | "BB" | "CU" | "DM" | "DO" | "GD" | "HT" | "JM" | "KN" | "LC" | "VC" | "TT"
  | "AR" | "BO" | "BR" | "CL" | "CO" | "EC" | "GY" | "PY" | "PE" | "SR" | "UY" | "VE";

type RegionMeta = { pt: string; en: string; es: string };

export const REGISTRATION_REGION_META: Record<RegistrationRegionCode, RegionMeta> = {
  US: { pt: "Estados Unidos", en: "United States", es: "Estados Unidos" },
  CA: { pt: "Canad\u00e1", en: "Canada", es: "Canad\u00e1" },
  MX: { pt: "M\u00e9xico", en: "Mexico", es: "M\u00e9xico" },
  BZ: { pt: "Belize", en: "Belize", es: "Belice" },
  CR: { pt: "Costa Rica", en: "Costa Rica", es: "Costa Rica" },
  SV: { pt: "El Salvador", en: "El Salvador", es: "El Salvador" },
  GT: { pt: "Guatemala", en: "Guatemala", es: "Guatemala" },
  HN: { pt: "Honduras", en: "Honduras", es: "Honduras" },
  NI: { pt: "Nicar\u00e1gua", en: "Nicaragua", es: "Nicaragua" },
  PA: { pt: "Panam\u00e1", en: "Panama", es: "Panam\u00e1" },
  AG: { pt: "Ant\u00edgua e Barbuda", en: "Antigua and Barbuda", es: "Antigua y Barbuda" },
  BS: { pt: "Bahamas", en: "Bahamas", es: "Bahamas" },
  BB: { pt: "Barbados", en: "Barbados", es: "Barbados" },
  CU: { pt: "Cuba", en: "Cuba", es: "Cuba" },
  DM: { pt: "Dominica", en: "Dominica", es: "Dominica" },
  DO: { pt: "Rep\u00fablica Dominicana", en: "Dominican Republic", es: "Rep\u00fablica Dominicana" },
  GD: { pt: "Granada", en: "Grenada", es: "Granada" },
  HT: { pt: "Haiti", en: "Haiti", es: "Hait\u00ed" },
  JM: { pt: "Jamaica", en: "Jamaica", es: "Jamaica" },
  KN: { pt: "S\u00e3o Crist\u00f3v\u00e3o e N\u00e9vis", en: "Saint Kitts and Nevis", es: "San Crist\u00f3bal y Nieves" },
  LC: { pt: "Santa L\u00facia", en: "Saint Lucia", es: "Santa Luc\u00eda" },
  VC: { pt: "S\u00e3o Vicente e Granadinas", en: "Saint Vincent and the Grenadines", es: "San Vicente y las Granadinas" },
  TT: { pt: "Trinidad e Tobago", en: "Trinidad and Tobago", es: "Trinidad y Tobago" },
  AR: { pt: "Argentina", en: "Argentina", es: "Argentina" },
  BO: { pt: "Bol\u00edvia", en: "Bolivia", es: "Bolivia" },
  BR: { pt: "Brasil", en: "Brazil", es: "Brasil" },
  CL: { pt: "Chile", en: "Chile", es: "Chile" },
  CO: { pt: "Col\u00f4mbia", en: "Colombia", es: "Colombia" },
  EC: { pt: "Equador", en: "Ecuador", es: "Ecuador" },
  GY: { pt: "Guiana", en: "Guyana", es: "Guyana" },
  PY: { pt: "Paraguai", en: "Paraguay", es: "Paraguay" },
  PE: { pt: "Peru", en: "Peru", es: "Per\u00fa" },
  SR: { pt: "Suriname", en: "Suriname", es: "Surinam" },
  UY: { pt: "Uruguai", en: "Uruguay", es: "Uruguay" },
  VE: { pt: "Venezuela", en: "Venezuela", es: "Venezuela" },
  EU: { pt: "Uni\u00e3o Europeia", en: "European Union", es: "Uni\u00f3n Europea" },
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

/** Label for native select: ISO code prefix (emoji flags break on Windows). */
export function registrationRegionLabel(code: RegistrationRegionCode, lang: Lang): string {
  const meta = REGISTRATION_REGION_META[code];
  if (!meta) return code;
  const name = lang === "pt" ? meta.pt : lang === "es" ? meta.es : meta.en;
  return `${code} \u2014 ${name}`;
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

export function requiresLgpd(code: RegistrationRegionCode | string): boolean {
  return code === "BR";
}

/** Default registration country when none is passed in the URL. */
export function defaultRegistrationRegionForLang(lang: Lang): RegistrationRegionCode {
  if (lang === "pt") return "BR";
  if (lang === "es") return "VE";
  return "US";
}
