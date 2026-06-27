// E.164 phone normalization for SMS verification.

/** Digits only, no +. Prepends default country code when missing. */
export function normalizeSmsPhone(
  raw: string,
  defaultCountry = process.env.SMS_DEFAULT_COUNTRY_CODE ||
    process.env.WHATSAPP_DEFAULT_COUNTRY_CODE ||
    "55",
): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length >= 12) return digits;
  if (digits.length === 10 || digits.length === 11) {
    return `${defaultCountry}${digits}`;
  }
  return digits.length >= 10 ? `${defaultCountry}${digits}` : null;
}

export function formatPhoneDisplay(e164: string): string {
  if (e164.length <= 4) return `+${e164}`;
  return `+${e164.slice(0, 2)} ${e164.slice(2)}`;
}
