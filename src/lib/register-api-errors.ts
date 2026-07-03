import type { Lang } from "@/lib/i18n/translations";
import { translate } from "@/lib/i18n/translations";
import { registrationPhoneErrorMessage } from "@/lib/international-phone";

const PHONE_ERROR_CODES = ["TOO_SHORT", "TOO_LONG", "MISSING_AREA_CODE", "INVALID_FORMAT"] as const;

type PhoneErrorCode = (typeof PHONE_ERROR_CODES)[number];

function isPhoneErrorCode(value: string): value is PhoneErrorCode {
  return (PHONE_ERROR_CODES as readonly string[]).includes(value);
}

/** Maps register API field errors to translated messages for display in forms. */
export function mapRegisterApiErrors(
  lang: Lang,
  payload: { code?: string; error?: Record<string, string[]> | string },
): Record<string, string[]> {
  if (payload.code === "ACCOUNT_INCOMPLETE") {
    return { email: [translate(lang, "reg.accountIncomplete")] };
  }

  if (payload.error === "RATE_LIMITED" || payload.code === "RATE_LIMITED") {
    return { general: [translate(lang, "reg.rateLimited")] };
  }

  const fieldErrors =
    payload.error && typeof payload.error === "object" && !Array.isArray(payload.error)
      ? payload.error
      : null;

  const apiErrors = fieldErrors || { general: [translate(lang, "reg.regFailed")] };

  if (apiErrors.email?.[0]?.includes("Email already in use")) {
    apiErrors.email = [translate(lang, "reg.emailInUse")];
  }

  if (apiErrors.phoneNational?.[0]) {
    const raw = apiErrors.phoneNational[0];
    if (isPhoneErrorCode(raw)) {
      apiErrors.phoneNational = [registrationPhoneErrorMessage(lang, raw)];
    }
  }

  if (apiErrors.general?.[0] === "Something went wrong. Please try again.") {
    apiErrors.general = [translate(lang, "reg.serverError")];
  }

  return apiErrors;
}
