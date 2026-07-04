export type DrugCountryCode = "BR" | "VE" | "US" | "CO";

function countryFlagEmoji(iso2: string): string {
  return iso2
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0)))
    .join("");
}

export const DRUG_COUNTRIES: {
  code: DrugCountryCode;
  flag: string;
  labelKey: "rx2.countryBR" | "rx2.countryVE" | "rx2.countryUS" | "rx2.countryCO";
}[] = [
  { code: "BR", flag: countryFlagEmoji("BR"), labelKey: "rx2.countryBR" },
  { code: "VE", flag: countryFlagEmoji("VE"), labelKey: "rx2.countryVE" },
  { code: "US", flag: countryFlagEmoji("US"), labelKey: "rx2.countryUS" },
  { code: "CO", flag: countryFlagEmoji("CO"), labelKey: "rx2.countryCO" },
];

export const DRUG_COUNTRY_CODES = DRUG_COUNTRIES.map((c) => c.code);

export function isDrugCountryCode(v: string): v is DrugCountryCode {
  return (DRUG_COUNTRY_CODES as string[]).includes(v);
}
