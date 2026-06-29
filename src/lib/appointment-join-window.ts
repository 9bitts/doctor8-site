// Shared join-window rules for scheduled teleconsult appointments.

export function appointmentJoinWindow(scheduledAt: Date, durationMins: number) {
  const start = scheduledAt.getTime();
  const duration = durationMins || 30;
  const now = Date.now();
  return {
    joinOpensAt: start - 10 * 60 * 1000,
    joinClosesAt: start + (duration + 30) * 60 * 1000,
    now,
  };
}

export function isWithinAppointmentJoinWindow(
  scheduledAt: Date,
  durationMins: number,
): boolean {
  const { joinOpensAt, joinClosesAt, now } = appointmentJoinWindow(scheduledAt, durationMins);
  return now >= joinOpensAt && now <= joinClosesAt;
}

export function teleconsultJoinUrl(
  appointmentId: string,
  meetingUrl?: string | null,
): string {
  if (meetingUrl) return meetingUrl;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://doctor8.org";
  return `${appUrl}/video/${appointmentId}`;
}
