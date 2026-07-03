import { translate, type Lang } from "@/lib/i18n/translations";

const ERROR_I18N_KEYS: Record<string, string> = {
  NOT_YOUR_TURN: "hum.err.notYourTurn",
  TRIAGE_REQUIRED: "hum.err.triageRequired",
  TCLE_REQUIRED: "hum.err.tcleRequired",
  PHONE_REQUIRED: "hum.err.phoneRequired",
  INVALID_PHONE: "hum.err.invalidPhone",
  QUEUE_FULL: "hum.err.queueFull",
  CANNOT_SWITCH_IN_CONSULT: "hum.err.cannotSwitchInConsult",
  RATE_LIMITED: "hum.err.rateLimited",
  VALIDATION_ERROR: "hum.err.validation",
  UNAUTHORIZED: "hum.err.unauthorized",
  FORBIDDEN: "hum.err.forbidden",
  NOT_FOUND: "hum.err.notFound",
  EXPIRED: "hum.err.expired",
  INVALID_BODY: "hum.err.invalidBody",
  ALREADY_IN_QUEUE: "hum.err.alreadyInQueue",
  CAMPAIGN_UNAVAILABLE: "hum.err.campaignUnavailable",
  PHONE_SAVE_FAILED: "hum.err.phoneSaveFailed",
  NOT_VERIFIED: "hum.err.notVerified",
  NO_PROFILE: "hum.err.noProfile",
};

function extractErrorCode(body: {
  errorCode?: string;
  error?: unknown;
}): string | undefined {
  if (typeof body.errorCode === "string" && body.errorCode) return body.errorCode;
  if (typeof body.error === "string" && body.error) return body.error;
  return undefined;
}

/** Maps a humanitarian API error payload to a translated user message. */
export function humanitarianApiErrorMessage(
  lang: Lang,
  body: { errorCode?: string; error?: unknown; message?: string },
): string {
  const code = extractErrorCode(body);
  if (code) {
    const key = ERROR_I18N_KEYS[code];
    if (key) return translate(lang, key);
  }
  return translate(lang, "hum.err.generic");
}
