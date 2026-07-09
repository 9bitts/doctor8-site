import { encrypt, decrypt } from "@/lib/encryption";

/** Encrypt PHI field for DB storage; empty values pass through as null. */
export function encryptPhiField(value: string | null | undefined): string | null {
  if (value == null || value === "") return null;
  return encrypt(value);
}

/** Decrypt PHI field; returns plaintext legacy values if not encrypted. */
export function decryptPhiField(stored: string | null | undefined): string | null {
  if (stored == null || stored === "") return stored ?? null;
  try {
    return decrypt(stored);
  } catch {
    return stored;
  }
}
