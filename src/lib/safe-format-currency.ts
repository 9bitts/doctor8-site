const FALLBACK_CURRENCY = "USD";

/** Normalize to a 3-letter ISO 4217 code or fall back to USD. */
export function safeCurrencyCode(currency: string | null | undefined): string {
  const normalized = (currency || FALLBACK_CURRENCY).trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) return FALLBACK_CURRENCY;
  return normalized;
}

/** Format cents as currency without throwing on invalid codes. */
export function formatMoneyCents(
  cents: number,
  currency: string | null | undefined,
  locale: string,
): string {
  const code = safeCurrencyCode(currency);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
    }).format(cents / 100);
  } catch {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: FALLBACK_CURRENCY,
    }).format(cents / 100);
  }
}
