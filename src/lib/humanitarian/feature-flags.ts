/** Default OFF when env unset ? phone gate hidden in humanitarian patient flow. */
export function isHumanitarianPhoneGateEnabled(): boolean {
  const raw = process.env.HUMANITARIAN_PHONE_GATE_ENABLED;
  if (raw === undefined || raw === "") return false;
  const normalized = raw.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

/** Default OFF when env unset ? email verification not required in humanitarian auth flows. */
export function isHumanitarianEmailVerificationEnabled(): boolean {
  const raw = process.env.HUMANITARIAN_EMAIL_VERIFICATION_ENABLED;
  if (raw === undefined || raw === "") return false;
  const normalized = raw.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

/** When the gate is disabled, patients may proceed without a verified phone. */
export function effectiveHumanitarianPhoneReady(actualPhoneReady: boolean): boolean {
  if (!isHumanitarianPhoneGateEnabled()) return true;
  return actualPhoneReady;
}

function humanitarianPathMatches(path: string): boolean {
  return path.startsWith("/humanitarian/") || path === "/sos-venezuela";
}

/** Auth/register originated from SOS Venezuela or in-app humanitarian patient flow. */
export function isHumanitarianContext(
  callbackUrl: string | null | undefined,
  originCookie = false,
): boolean {
  if (originCookie) return true;
  if (!callbackUrl) return false;
  try {
    const path = callbackUrl.startsWith("http")
      ? new URL(callbackUrl).pathname
      : callbackUrl.split("?")[0];
    return humanitarianPathMatches(path);
  } catch {
    return false;
  }
}

/** Skip email verification when humanitarian context and flag is off (default). */
export function canSkipHumanitarianEmailVerification(
  callbackUrl: string | null | undefined,
  originCookie = false,
): boolean {
  return isHumanitarianContext(callbackUrl, originCookie)
    && !isHumanitarianEmailVerificationEnabled();
}
