/** How long a volunteer is considered present after last heartbeat (ms). */
export const VOLUNTEER_PRESENCE_TTL_MS = 2 * 60 * 1000;

/** Patient waiting queue — expire if no poll/heartbeat within this window. */
export const PATIENT_WAITING_TTL_MS = (() => {
  const raw = process.env.HUMANITARIAN_PRESENCE_TTL_MS;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 600_000;
})();

/** CALLED entry reverts to WAITING if consult never starts (volunteer no-show). */
export const VOLUNTEER_CALLED_REVERT_MS = 5 * 60 * 1000;

/**
 * IN_PROGRESS consult is considered abandoned if neither side sends a room
 * heartbeat within this window (both tabs closed / crashed). Generous so a real
 * consultation on a flaky connection is never cut short.
 */
export const IN_PROGRESS_STALE_MS = 15 * 60 * 1000;

export function presenceCutoff(): Date {
  return new Date(Date.now() - VOLUNTEER_PRESENCE_TTL_MS);
}

export function patientWaitingCutoff(): Date {
  return new Date(Date.now() - PATIENT_WAITING_TTL_MS);
}

export function volunteerCalledRevertCutoff(): Date {
  return new Date(Date.now() - VOLUNTEER_CALLED_REVERT_MS);
}

export function inProgressStaleCutoff(): Date {
  return new Date(Date.now() - IN_PROGRESS_STALE_MS);
}

export function isVolunteerPresent(lastSeenAt: Date | null | undefined): boolean {
  if (!lastSeenAt) return false;
  return lastSeenAt.getTime() >= presenceCutoff().getTime();
}

export function isPatientQueuePresent(
  lastSeenAt: Date | null | undefined,
  enteredAt: Date,
): boolean {
  const cutoff = patientWaitingCutoff().getTime();
  if (lastSeenAt) return lastSeenAt.getTime() >= cutoff;
  return enteredAt.getTime() >= cutoff;
}
