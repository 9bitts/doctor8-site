import { z } from "zod";
import type { Lang } from "@/lib/i18n/translations";
import { translate } from "@/lib/i18n/translations";
import { findPhoneCountryByDialCode, findPhoneCountryByIso } from "@/lib/phone-countries";
import { REGISTRATION_REGION_CODES } from "@/lib/registration-regions";

export type InternationalPhoneParts = {
  ddi: string;
  nationalNumber: string;
};

export type PhoneValidationIssue =
  | "TOO_SHORT"
  | "TOO_LONG"
  | "MISSING_AREA_CODE"
  | "INVALID_FORMAT";

export type RegistrationPhoneResult =
  | { ok: true; e164: string; nationalDigits: string }
  | { ok: false; issue: PhoneValidationIssue };

const ISSUE_TRANSLATION_KEYS: Record<PhoneValidationIssue, string> = {
  TOO_SHORT: "reg.phoneError.tooShort",
  TOO_LONG: "reg.phoneError.tooLong",
  MISSING_AREA_CODE: "reg.phoneError.missingAreaCode",
  INVALID_FORMAT: "reg.phoneError.invalidFormat",
};

const REGION_DEFAULT_DDI: Record<string, string> = { EU: "34" };

for (const code of REGISTRATION_REGION_CODES) {
  if (code === "EU") continue;
  const country = findPhoneCountryByIso(code);
  if (country) REGION_DEFAULT_DDI[code] = country.dialCode;
}

if (!REGION_DEFAULT_DDI.US) REGION_DEFAULT_DDI.US = "1";
if (!REGION_DEFAULT_DDI.BR) REGION_DEFAULT_DDI.BR = "55";
if (!REGION_DEFAULT_DDI.VE) REGION_DEFAULT_DDI.VE = "58";

const NATIONAL_LENGTH: Record<string, { min: number; max: number }> = {
  "55": { min: 10, max: 11 },
  "58": { min: 10, max: 11 },
  "1": { min: 10, max: 10 },
  "52": { min: 10, max: 10 },
  "54": { min: 10, max: 11 },
  "56": { min: 9, max: 9 },
  "57": { min: 10, max: 10 },
  "51": { min: 9, max: 9 },
  "598": { min: 8, max: 8 },
  "595": { min: 9, max: 9 },
  "591": { min: 8, max: 8 },
  "593": { min: 9, max: 9 },
};

function nationalLengthRule(ddi: string): { min: number; max: number } {
  return NATIONAL_LENGTH[ddi] ?? { min: 8, max: 12 };
}

/** Strips duplicate country code and leading trunk zeros from the national part. */
export function prepareNationalDigits(ddiDigits: string, nationalNumber: string): string {
  let digits = nationalNumber.replace(/\D/g, "");
  if (!digits) return digits;

  if (
    ddiDigits &&
    digits.startsWith(ddiDigits) &&
    digits.length > ddiDigits.length + 6
  ) {
    const withoutDdi = digits.slice(ddiDigits.length);
    if (withoutDdi.length >= 6) digits = withoutDdi;
  }

  digits = digits.replace(/^0+/, "");
  return digits;
}

export function defaultDdiForRegion(region: string): string {
  return REGION_DEFAULT_DDI[region.toUpperCase()] || "1";
}

export function validateRegistrationPhone(
  ddi: string,
  nationalNumber: string,
): RegistrationPhoneResult {
  const ddiDigits = ddi.replace(/\D/g, "");
  if (!ddiDigits || !findPhoneCountryByDialCode(ddiDigits)) {
    return { ok: false, issue: "INVALID_FORMAT" };
  }

  const nationalDigits = prepareNationalDigits(ddiDigits, nationalNumber);
  if (!nationalDigits) {
    return { ok: false, issue: "TOO_SHORT" };
  }

  const full = `${ddiDigits}${nationalDigits}`;
  if (full.length > 15) return { ok: false, issue: "TOO_LONG" };
  if (full.length < 10) return { ok: false, issue: "TOO_SHORT" };

  const { min, max } = nationalLengthRule(ddiDigits);
  if (nationalDigits.length < min) {
    return {
      ok: false,
      issue: nationalDigits.length >= 6 ? "MISSING_AREA_CODE" : "TOO_SHORT",
    };
  }
  if (nationalDigits.length > max) {
    return { ok: false, issue: "TOO_LONG" };
  }

  return { ok: true, e164: full, nationalDigits };
}

/** Builds E.164 digits (no +) from country code + national number (with area code). */
export function buildInternationalPhoneE164(
  ddi: string,
  nationalNumber: string,
): string | null {
  const result = validateRegistrationPhone(ddi, nationalNumber);
  return result.ok ? result.e164 : null;
}

export function getRegistrationPhoneIssue(
  ddi: string,
  nationalNumber: string,
): PhoneValidationIssue | null {
  if (!nationalNumber.replace(/\D/g, "")) return null;
  const result = validateRegistrationPhone(ddi, nationalNumber);
  return result.ok ? null : result.issue;
}

export function registrationPhoneErrorMessage(
  lang: Lang | string | undefined,
  issue: PhoneValidationIssue | "PHONE_REQUIRED" | "INVALID_PHONE",
): string {
  const normalizedLang: Lang =
    lang === "pt" || lang === "es" || lang === "en" ? lang : "en";
  if (issue === "PHONE_REQUIRED" || issue === "INVALID_PHONE") {
    return translate(normalizedLang, "reg.phoneInvalid");
  }
  return translate(normalizedLang, ISSUE_TRANSLATION_KEYS[issue]);
}

export function parseE164ToParts(e164: string): InternationalPhoneParts {
  const digits = e164.replace(/\D/g, "");
  const sortedCodes = [
    "1242", "1246", "1264", "1268", "1284", "1340", "1345", "1441", "1473", "1649",
    "1664", "1670", "1671", "1684", "1758", "1767", "1784", "1809", "1868", "1869",
    "1876", "1939",
    "880", "886", "960", "961", "962", "963", "964", "965", "966", "967", "968", "970",
    "971", "972", "973", "974", "975", "976", "977", "992", "993", "994", "995", "996", "998",
    "351", "352", "353", "354", "355", "356", "357", "358", "359", "370", "371", "372", "373",
    "374", "375", "376", "377", "378", "379", "380", "381", "382", "385", "386", "387", "389",
    "420", "421", "423",
    "501", "502", "503", "504", "505", "506", "507", "508", "509", "591", "592", "593", "595",
    "597", "598", "599",
    "673", "674", "675", "676", "677", "678", "679", "680", "681", "682", "683", "685", "686",
    "687", "688", "689", "690", "691", "692",
    "850", "852", "853", "855", "856", "880",
    "212", "213", "216", "218", "220", "221", "222", "223", "224", "225", "226", "227", "228",
    "229", "230", "231", "232", "233", "234", "235", "236", "237", "238", "239", "240", "241",
    "242", "243", "244", "245", "246", "248", "249", "250", "251", "252", "253", "254", "255",
    "256", "257", "258", "260", "261", "262", "263", "264", "265", "266", "267", "268", "269",
    "27", "290", "291", "297", "298", "299",
    "30", "31", "32", "33", "34", "36", "39", "40", "41", "43", "44", "45", "46", "47", "48", "49",
    "51", "52", "53", "54", "55", "56", "57", "58", "60", "61", "62", "63", "64", "65", "66",
    "81", "82", "84", "86", "90", "91", "92", "93", "94", "95", "98",
    "1", "7",
  ];

  for (const code of sortedCodes) {
    if (digits.startsWith(code)) {
      return { ddi: code, nationalNumber: digits.slice(code.length) };
    }
  }
  return { ddi: digits.slice(0, 2), nationalNumber: digits.slice(2) };
}

export function formatInternationalPhoneDisplay(e164: string): string {
  const { ddi, nationalNumber } = parseE164ToParts(e164);
  return `+${ddi} ${nationalNumber}`;
}

export const registrationPhoneSchema = z.object({
  phoneDdi: z.string().min(1).max(4),
  phoneNational: z.string().min(6).max(20),
}).superRefine((data, ctx) => {
  const result = validateRegistrationPhone(data.phoneDdi, data.phoneNational);
  if (!result.ok) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: result.issue,
      path: ["phoneNational"],
    });
  }
});

export function parseRegistrationPhone(body: {
  phoneDdi?: string;
  phoneNational?: string;
  phone?: string;
}): { e164: string } | { error: PhoneValidationIssue | "PHONE_REQUIRED" } {
  if (body.phoneDdi && body.phoneNational) {
    const result = validateRegistrationPhone(body.phoneDdi, body.phoneNational);
    return result.ok ? { e164: result.e164 } : { error: result.issue };
  }
  if (body.phone) {
    const digits = body.phone.replace(/\D/g, "");
    if (digits.length >= 10 && digits.length <= 15) return { e164: digits };
    return { error: "INVALID_FORMAT" };
  }
  return { error: "PHONE_REQUIRED" };
}

export function phoneValidationMessage(lang: Lang): string {
  return translate(lang, "reg.phoneInvalid");
}
