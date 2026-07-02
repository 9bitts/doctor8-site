/** Default OFF when env unset ? phone gate hidden in humanitarian patient flow. */
export function isHumanitarianPhoneGateEnabled(): boolean {
  const raw = process.env.HUMANITARIAN_PHONE_GATE_ENABLED;
  if (raw === undefined || raw === "") return false;
  const normalized = raw.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

/** When the gate is disabled, patients may proceed without a verified phone. */
export function effectiveHumanitarianPhoneReady(actualPhoneReady: boolean): boolean {
  if (!isHumanitarianPhoneGateEnabled()) return true;
  return actualPhoneReady;
}
