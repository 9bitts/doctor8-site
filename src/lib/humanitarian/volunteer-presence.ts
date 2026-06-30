/** How long a volunteer is considered present after last heartbeat (ms). */
export const VOLUNTEER_PRESENCE_TTL_MS = 2 * 60 * 1000;

export function presenceCutoff(): Date {
  return new Date(Date.now() - VOLUNTEER_PRESENCE_TTL_MS);
}

export function isVolunteerPresent(lastSeenAt: Date | null | undefined): boolean {
  if (!lastSeenAt) return false;
  return lastSeenAt.getTime() >= presenceCutoff().getTime();
}
