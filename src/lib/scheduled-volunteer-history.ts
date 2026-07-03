/** Hours before appointment to nudge patient to fill/share history (volunteer scheduled). */
export const VOLUNTEER_HISTORY_REMINDER_HOURS_BEFORE = 24;

export const SCHEDULED_VOLUNTEER_NO_HISTORY_PROVIDER_TYPES = new Set([
  "psychoanalyst",
  "PSYCHOANALYST",
]);

export function volunteerBookingRequiresPatientHistory(providerType: string | undefined): boolean {
  if (!providerType) return true;
  return !SCHEDULED_VOLUNTEER_NO_HISTORY_PROVIDER_TYPES.has(providerType);
}
