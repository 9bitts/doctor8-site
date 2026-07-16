import type { Lang } from "@/lib/i18n/translations";
import { findPhoneCountryByDialCode } from "@/lib/phone-countries";
import {
  type RegistrationRegionCode,
  isValidRegistrationRegion,
  defaultRegistrationRegionForLang,
} from "@/lib/registration-regions";

/** EU member states mapped to the EU billing/registration bucket. */
const EU_MEMBER_ISO2 = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU",
  "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
]);

export function detectCountryCodeFromHeaders(headers: Headers): string | null {
  const raw =
    headers.get("x-vercel-ip-country") ||
    headers.get("cf-ipcountry") ||
    headers.get("x-country-code") ||
    null;
  if (!raw) return null;
  const code = raw.trim().toUpperCase();
  if (!code || code === "XX" || code === "T1") return null;
  return code;
}

export function mapGeoCountryToRegistrationRegion(
  countryCode: string,
): RegistrationRegionCode | null {
  const code = countryCode.toUpperCase();
  if (isValidRegistrationRegion(code)) return code;
  if (EU_MEMBER_ISO2.has(code)) return "EU";
  return null;
}

export function registrationRegionFromPhoneDdi(
  ddi: string,
): RegistrationRegionCode | null {
  const ddiDigits = ddi.replace(/\D/g, "");
  if (!ddiDigits) return null;
  const country = findPhoneCountryByDialCode(ddiDigits);
  if (!country) return null;
  if (isValidRegistrationRegion(country.iso2)) return country.iso2;
  return null;
}

export function registrationRegionFromPhoneE164(
  e164: string | null | undefined,
): RegistrationRegionCode | null {
  if (!e164) return null;
  const digits = e164.replace(/\D/g, "");
  if (!digits) return null;

  // Try longest dial-code match first (e.g. 1242 before 1).
  for (let len = Math.min(4, digits.length); len >= 1; len--) {
    const fromDdi = registrationRegionFromPhoneDdi(digits.slice(0, len));
    if (fromDdi) return fromDdi;
  }
  return null;
}

export function resolveRegistrationRegion(opts: {
  explicit?: string | null;
  phoneDdi?: string | null;
  phoneE164?: string | null;
  language?: Lang | string | null;
  headers?: Headers;
}): RegistrationRegionCode {
  if (opts.explicit && isValidRegistrationRegion(opts.explicit)) {
    return opts.explicit;
  }

  if (opts.headers) {
    const geo = detectCountryCodeFromHeaders(opts.headers);
    if (geo) {
      const mapped = mapGeoCountryToRegistrationRegion(geo);
      if (mapped) return mapped;
    }
  }

  if (opts.phoneDdi) {
    const fromPhone = registrationRegionFromPhoneDdi(opts.phoneDdi);
    if (fromPhone) return fromPhone;
  }

  if (opts.phoneE164) {
    const fromE164 = registrationRegionFromPhoneE164(opts.phoneE164);
    if (fromE164) return fromE164;
  }

  const lang = opts.language;
  if (lang === "pt" || lang === "es" || lang === "en") {
    return defaultRegistrationRegionForLang(lang);
  }

  return "BR";
}

/**
 * Resolves region for signup: honors an explicit non-BR choice; when the client
 * still has the generic BR default, prefers phone DDI and geo headers.
 */
export function resolveRegistrationRegionForSignup(opts: {
  explicit?: string | null;
  phoneDdi?: string | null;
  phoneE164?: string | null;
  language?: Lang | string | null;
  headers?: Headers;
}): RegistrationRegionCode {
  const explicit =
    opts.explicit && isValidRegistrationRegion(opts.explicit) ? opts.explicit : null;

  if (explicit && explicit !== "BR") {
    return explicit;
  }

  const auto = resolveRegistrationRegion({
    phoneDdi: opts.phoneDdi,
    phoneE164: opts.phoneE164,
    language: opts.language,
    headers: opts.headers,
  });

  if (explicit === "BR" && auto !== "BR") {
    return auto;
  }

  return explicit ?? auto;
}
