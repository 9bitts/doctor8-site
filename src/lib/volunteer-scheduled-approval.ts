/** Default OFF - production unchanged until operator sets env var. */
export function isVolunteerScheduledApprovalRequired(): boolean {
  const raw = process.env.VOLUNTEER_SCHEDULED_APPROVAL_REQUIRED;
  if (raw === undefined || raw === "") return false;
  const normalized = raw.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

export type VolunteerScheduledProviderKind = "health" | "psychoanalyst" | "integrative";

export function isVolunteerScheduledApproved(
  _kind: VolunteerScheduledProviderKind,
  profile: {
    volunteerScheduledApproved?: boolean;
    verified?: boolean;
  } | null | undefined,
): boolean {
  if (!profile?.verified) return false;
  if (!isVolunteerScheduledApprovalRequired()) return true;
  return profile.volunteerScheduledApproved === true;
}

export class VolunteerScheduledNotApprovedError extends Error {
  constructor() {
    super("volunteer_scheduled_not_approved");
    this.name = "VolunteerScheduledNotApprovedError";
  }
}

export async function assertVolunteerScheduledApproved(
  kind: VolunteerScheduledProviderKind,
  profile: {
    volunteerScheduledApproved?: boolean;
    verified?: boolean;
  } | null | undefined,
): Promise<void> {
  if (!isVolunteerScheduledApproved(kind, profile)) {
    throw new VolunteerScheduledNotApprovedError();
  }
}
