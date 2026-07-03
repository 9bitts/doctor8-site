import type { Lang } from "@/lib/i18n/translations";
import { translate } from "@/lib/i18n/translations";
import { registrationPhoneErrorMessage } from "@/lib/international-phone";

/** True when a thrown value likely indicates a network / fetch failure. */
export function isLikelyNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  if (err instanceof DOMException && err.name === "AbortError") return true;
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return (
      msg.includes("failed to fetch")
      || msg.includes("network")
      || msg.includes("load failed")
      || msg.includes("networkerror")
    );
  }
  return false;
}

export function networkErrorMessage(lang: Lang): string {
  return translate(lang, "reg.networkError");
}

/** Maps POST /api/auth/oauth-intent failures to a user-facing message. */
export function oauthIntentErrorMessage(
  lang: Lang,
  status: number,
  body: { error?: string } | null,
): string {
  const code = body?.error;
  if (code === "Invalid phone") {
    return translate(lang, "reg.oauthIntentInvalidPhone");
  }
  if (status === 429 || code === "RATE_LIMITED") {
    return translate(lang, "reg.rateLimited");
  }
  if (status >= 500) {
    return translate(lang, "reg.serverError");
  }
  return translate(lang, "reg.oauthIntentFailed");
}

type RegisterSuccessPayload = {
  existingAccount?: boolean;
  pendingVerification?: boolean;
  resumed?: boolean;
  emailVerificationSkipped?: boolean;
  emailSent?: boolean;
};

/** Handles 200 responses from register that are not a fresh signup. */
export function registerSuccessFollowUp(
  data: RegisterSuccessPayload,
):
  | { kind: "existingAccount" }
  | { kind: "continue" }
  | { kind: "verify"; emailSent: boolean } {
  if (data.existingAccount) {
    return { kind: "existingAccount" };
  }
  if (data.pendingVerification) {
    return { kind: "verify", emailSent: data.emailSent !== false };
  }
  return { kind: "continue" };
}

export function existingAccountMessage(lang: Lang): string {
  return translate(lang, "reg.existingAccount");
}

/** Maps POST /api/auth/complete-signup failures. */
export function completeSignupErrorMessage(
  lang: Lang,
  status: number,
  data: { error?: unknown },
): string {
  const err = data.error;
  if (status === 401) return translate(lang, "signup.role.err.notSignedIn");
  if (status === 409) return translate(lang, "signup.role.err.alreadyComplete");
  if (status === 404) return translate(lang, "signup.role.err.userNotFound");
  if (status === 400) {
    if (typeof err === "string") {
      return translate(lang, "signup.role.err.invalidRequest");
    }
    if (err && typeof err === "object" && !Array.isArray(err)) {
      const phoneErr = (err as Record<string, string[]>).phoneNational?.[0];
      if (phoneErr) {
        const known = ["TOO_SHORT", "TOO_LONG", "MISSING_AREA_CODE", "INVALID_FORMAT"];
        if (known.includes(phoneErr)) {
          return registrationPhoneErrorMessage(
            lang,
            phoneErr as "TOO_SHORT" | "TOO_LONG" | "MISSING_AREA_CODE" | "INVALID_FORMAT",
          );
        }
      }
      return translate(lang, "signup.role.err.invalidPhone");
    }
  }
  if (status >= 500) return translate(lang, "reg.serverError");
  return translate(lang, "signup.role.err.completeFailed");
}
