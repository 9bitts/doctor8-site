import { encrypt, decrypt } from "@/lib/encryption";

/** Encrypt OAuth tokens before persisting on Account (Google link). */
export function encryptOAuthToken(token: string | null | undefined): string | null {
  if (!token) return null;
  return encrypt(token);
}

export function decryptOAuthToken(stored: string | null | undefined): string | null {
  if (!stored) return null;
  try {
    return decrypt(stored);
  } catch {
    return stored;
  }
}
