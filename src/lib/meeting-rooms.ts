/**
 * Fixed Google Meet rooms for professional coordination (e.g. humanitarian briefings).
 * Use a recurring Google Calendar event to obtain a permanent Meet URL, then set
 * NEXT_PUBLIC_MEETING_ROOM_NISE_URL in the environment.
 */

export type MeetingRoomConfig = {
  id: string;
  titleKey: string;
  subjectKey: string;
  audienceKey: string;
  /** Daily start time in America/Sao_Paulo */
  scheduleHour: number;
  scheduleMinute: number;
  timezone: string;
};

export const MEETING_ROOMS: MeetingRoomConfig[] = [
  {
    id: "nise-yamaguchi",
    titleKey: "meetRoom.nise.title",
    subjectKey: "meetRoom.nise.subject",
    audienceKey: "meetRoom.nise.audience",
    scheduleHour: 17,
    scheduleMinute: 0,
    timezone: "America/Sao_Paulo",
  },
];

export function getMeetingRoomInvitePath(roomId: string): string {
  return `/anfiteatro/${roomId}`;
}

export function getMeetingRoomInviteUrl(roomId: string, origin?: string): string {
  const base = (
    origin ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "https://app.doctor8.org"
  ).replace(/\/$/, "");
  return `${base}${getMeetingRoomInvitePath(roomId)}`;
}

/** Ensures Meet links open externally (not as a relative path on the app). */
export function normalizeMeetUrl(raw: string | null | undefined): string | null {
  const url = raw?.trim();
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("meet.google.com/")) return `https://${url}`;
  if (/^[a-z]{3}-[a-z]{4}-[a-z]{3}$/i.test(url)) {
    return `https://meet.google.com/${url.toLowerCase()}`;
  }
  return `https://${url.replace(/^\/+/, "")}`;
}

export function getMeetingRoomMeetUrl(roomId: string): string | null {
  if (roomId === "nise-yamaguchi") {
    const url =
      process.env.NEXT_PUBLIC_MEETING_ROOM_NISE_URL?.trim() ||
      process.env.GOOGLE_MEET_DEFAULT_URL?.trim();
    return normalizeMeetUrl(url);
  }
  return null;
}
