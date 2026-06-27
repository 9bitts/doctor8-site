export type DrugCountryCode = "BR" | "VE" | "US";

export const DRUG_COUNTRIES: {
  code: DrugCountryCode;
  flag: string;
  labelKey: "rx2.countryBR" | "rx2.countryVE" | "rx2.countryUS";
}[] = [
  { code: "BR", flag: "????", labelKey: "rx2.countryBR" },
  { code: "VE", flag: "????", labelKey: "rx2.countryVE" },
  { code: "US", flag: "????", labelKey: "rx2.countryUS" },
];

export const DRUG_COUNTRY_CODES = DRUG_COUNTRIES.map((c) => c.code);

export function isDrugCountryCode(v: string): v is DrugCountryCode {
  return (DRUG_COUNTRY_CODES as string[]).includes(v);
}
