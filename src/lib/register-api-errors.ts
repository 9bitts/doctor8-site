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
  payload: { code?: string; error?: Record<string, string[]> },
): Record<string, string[]> {
  if (payload.code === "ACCOUNT_INCOMPLETE") {
    return { email: [translate(lang, "reg.accountIncomplete")] };
  }

  const apiErrors = payload.error || { general: [translate(lang, "reg.regFailed")] };

  if (apiErrors.phoneNational?.[0]) {
    const raw = apiErrors.phoneNational[0];
    if (isPhoneErrorCode(raw)) {
      apiErrors.phoneNational = [registrationPhoneErrorMessage(lang, raw)];
    }
  }

  if (apiErrors.general?.[0] === "Something went wrong. Please try again.") {
    apiErrors.general = [translate(lang, "reg.genericError")];
  }

  return apiErrors;
}
