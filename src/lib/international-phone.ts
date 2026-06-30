import { z } from "zod";
import type { Lang } from "@/lib/i18n/translations";
import { findPhoneCountryByDialCode } from "@/lib/phone-countries";

export type InternationalPhoneParts = {
  ddi: string;
  nationalNumber: string;
};

const REGION_DEFAULT_DDI: Record<string, string> = {
  BR: "55",
  US: "1",
  VE: "58",
  AR: "54",
  CL: "56",
  CO: "57",
  MX: "52",
  PE: "51",
  PT: "351",
  ES: "34",
  GB: "44",
  DE: "49",
  FR: "33",
  IT: "39",
  CA: "1",
  UY: "598",
  PY: "595",
  BO: "591",
  EC: "593",
};

export function defaultDdiForRegion(region: string): string {
  return REGION_DEFAULT_DDI[region.toUpperCase()] || "1";
}

/** Builds E.164 digits (no +) from country code + national number (with area code). */
export function buildInternationalPhoneE164(
  ddi: string,
  nationalNumber: string,
): string | null {
  const ddiDigits = ddi.replace(/\D/g, "");
  const nationalDigits = nationalNumber.replace(/\D/g, "");
  if (!ddiDigits || nationalDigits.length < 6) return null;
  const full = `${ddiDigits}${nationalDigits}`;
  if (full.length < 10 || full.length > 15) return null;
  if (!findPhoneCountryByDialCode(ddiDigits)) return null;
  return full;
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
  const e164 = buildInternationalPhoneE164(data.phoneDdi, data.phoneNational);
  if (!e164) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "INVALID_PHONE",
      path: ["phoneNational"],
    });
  }
});

export function parseRegistrationPhone(body: {
  phoneDdi?: string;
  phoneNational?: string;
  phone?: string;
}): { e164: string } | { error: string } {
  if (body.phoneDdi && body.phoneNational) {
    const e164 = buildInternationalPhoneE164(body.phoneDdi, body.phoneNational);
    return e164 ? { e164 } : { error: "INVALID_PHONE" };
  }
  if (body.phone) {
    const digits = body.phone.replace(/\D/g, "");
    if (digits.length >= 10 && digits.length <= 15) return { e164: digits };
    return { error: "INVALID_PHONE" };
  }
  return { error: "PHONE_REQUIRED" };
}

export function phoneValidationMessage(lang: Lang): string {
  if (lang === "pt") return "Informe um celular v?lido (DDI + n?mero com DDD/?rea).";
  if (lang === "es") return "Ingrese un celular v?lido (c?digo de pa?s + n?mero con ?rea).";
  return "Enter a valid mobile number (country code + number with area code).";
}
