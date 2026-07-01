/**
 * Fixed Google Meet rooms for professional coordination (e.g. humanitarian briefings).
 * Use a recurring Google Calendar event to obtain a permanent Meet URL, then set
 * NEXT_PUBLIC_MEETING_ROOM_NISE_URL in the environment.
 */

export type MeetingRoomConfig = {
  id: string;
  titleKey: string;
  subtitleKey: string;
  /** Daily start time in America/Sao_Paulo */
  scheduleHour: number;
  scheduleMinute: number;
  timezone: string;
};

export const MEETING_ROOMS: MeetingRoomConfig[] = [
  {
    id: "nise-yamaguchi",
    titleKey: "meetRoom.nise.title",
    subtitleKey: "meetRoom.nise.subtitle",
    scheduleHour: 17,
    scheduleMinute: 0,
    timezone: "America/Sao_Paulo",
  },
];

export function getMeetingRoomMeetUrl(roomId: string): string | null {
  if (roomId === "nise-yamaguchi") {
    const url =
      process.env.NEXT_PUBLIC_MEETING_ROOM_NISE_URL?.trim() ||
      process.env.GOOGLE_MEET_DEFAULT_URL?.trim();
    return url || null;
  }
  return null;
}
