import { encrypt, decrypt } from "@/lib/encryption";

export function safeDecryptPhone(stored: string | null | undefined): string {
  if (!stored) return "";
  try {
    return decrypt(stored);
  } catch {
    return stored;
  }
}

export function encryptUserPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return encrypt(digits);
}

export function userPhoneDigits(stored: string | null | undefined): string {
  return safeDecryptPhone(stored).replace(/\D/g, "");
}

export function userPhonesMatch(
  stored: string | null | undefined,
  normalizedPhone: string,
): boolean {
  if (!stored) return false;
  return userPhoneDigits(stored) === normalizedPhone.replace(/\D/g, "");
}
