/** Doctor8 WABA — E.164 digits (no +). Inbound messages appear in /admin/mensagens. */
export const DOCTOR8_CONTACT_WHATSAPP_E164 = "491749803699";

/** Display form of the Doctor8 WhatsApp line (+49 174 9803699). */
export const DOCTOR8_CONTACT_WHATSAPP_DISPLAY = "+49 174 9803699";

/** Legacy BR contact lines replaced by the Meta WABA number above. */
const LEGACY_DOCTOR8_WHATSAPP_NUMBERS = new Set([
  "553197170053",
  "5531971720053",
]);

export function doctor8ContactWhatsAppDigits(): string {
  const fromEnv = process.env.NEXT_PUBLIC_DOCTOR8_WHATSAPP_PHONE?.replace(/\D/g, "");
  if (fromEnv && fromEnv.length >= 10 && !looksLikeEnvPlaceholder(fromEnv)) {
    return fromEnv;
  }
  return DOCTOR8_CONTACT_WHATSAPP_E164;
}

function looksLikeEnvPlaceholder(value: string): boolean {
  return /^WHATSAPP_|^NEXT_PUBLIC_/i.test(value);
}

export function doctor8ContactWhatsAppHref(message?: string): string {
  const phone = doctor8ContactWhatsAppDigits();
  const base = `https://wa.me/${phone}`;
  const text = message?.trim();
  if (!text) return base;
  return `${base}?text=${encodeURIComponent(text)}`;
}

/** Normalize legacy hardcoded wa.me targets to the Doctor8 WABA line. */
export function normalizeDoctor8ContactWhatsAppDigits(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (LEGACY_DOCTOR8_WHATSAPP_NUMBERS.has(digits)) {
    return doctor8ContactWhatsAppDigits();
  }
  return digits;
}
