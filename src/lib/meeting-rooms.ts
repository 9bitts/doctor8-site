/**
 * Fixed Google Meet rooms for professional coordination (e.g. humanitarian briefings).
 * Use a recurring Google Calendar event to obtain a permanent Meet URL, then set
 * NEXT_PUBLIC_MEETING_ROOM_NISE_URL in the environment.
 */

export type MeetingRoomConfig = {
  id: string;
  titleKey: string;
  /** Short label for the quick-access nav at the top of the page. */
  navLabelKey: string;
  subjectKey: string;
  audienceKey: string;
  /** Daily start time in America/Sao_Paulo */
  scheduleHour: number;
  scheduleMinute: number;
  timezone: string;
  /** Optional Google Meet dial-in line (shown on room card and share text). */
  dialIn?: string;
  /** Optional tel.meet URL with more phone numbers. */
  phoneNumbersUrl?: string;
};

export const MEETING_ROOMS: MeetingRoomConfig[] = [
  {
    id: "alianca-pela-vida",
    titleKey: "meetRoom.alianca.title",
    navLabelKey: "meetRoom.alianca.nav",
    subjectKey: "meetRoom.alianca.subject",
    audienceKey: "meetRoom.alianca.audience",
    scheduleHour: 20,
    scheduleMinute: 0,
    timezone: "America/Sao_Paulo",
    dialIn: "(DE) +49 30 300195060 · PIN: 525 174 424 8791#",
    phoneNumbersUrl: "https://tel.meet/knj-ohde-eih?pin=5251744248791",
  },
  {
    id: "nise-yamaguchi",
    titleKey: "meetRoom.nise.title",
    navLabelKey: "meetRoom.nise.nav",
    subjectKey: "meetRoom.nise.subject",
    audienceKey: "meetRoom.nise.audience",
    scheduleHour: 17,
    scheduleMinute: 0,
    timezone: "America/Sao_Paulo",
  },
  {
    id: "treinamento-doctor8",
    titleKey: "meetRoom.doctor8.title",
    navLabelKey: "meetRoom.doctor8.nav",
    subjectKey: "meetRoom.doctor8.subject",
    audienceKey: "meetRoom.doctor8.audience",
    scheduleHour: 19,
    scheduleMinute: 30,
    timezone: "America/Sao_Paulo",
  },
  {
    id: "medicos-pela-vida",
    titleKey: "meetRoom.medicosPelaVida.title",
    navLabelKey: "meetRoom.medicosPelaVida.nav",
    subjectKey: "meetRoom.medicosPelaVida.subject",
    audienceKey: "meetRoom.medicosPelaVida.audience",
    scheduleHour: 20,
    scheduleMinute: 0,
    timezone: "America/Sao_Paulo",
    dialIn: "(DE) +49 30 300195060 · PIN: 714 236 139 9552#",
    phoneNumbersUrl: "https://tel.meet/dtp-rdjw-wuz?pin=7142361399552",
  },
  {
    id: "claudia-de-bessa-solmucci",
    titleKey: "meetRoom.claudia.title",
    navLabelKey: "meetRoom.claudia.nav",
    subjectKey: "meetRoom.claudia.subject",
    audienceKey: "meetRoom.claudia.audience",
    scheduleHour: 20,
    scheduleMinute: 0,
    timezone: "America/Sao_Paulo",
    dialIn: "(DE) +49 30 300195060 · PIN: 486 636 105 6264#",
    phoneNumbersUrl: "https://tel.meet/pan-xqiv-xor?pin=4866361056264",
  },
];

export function getMeetingRoomInvitePath(roomId: string): string {
  return `/anfiteatro/${roomId}`;
}

export function getMeetingRoomElementId(roomId: string): string {
  return `meeting-room-${roomId}`;
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

const MEETING_ROOM_URL_BY_ID: Record<string, string | undefined> = {
  "alianca-pela-vida": process.env.NEXT_PUBLIC_MEETING_ROOM_ALIANCA_PELA_VIDA_URL,
  "nise-yamaguchi": process.env.NEXT_PUBLIC_MEETING_ROOM_NISE_URL,
  "treinamento-doctor8": process.env.NEXT_PUBLIC_MEETING_ROOM_DOCTOR8_URL,
  "medicos-pela-vida": process.env.NEXT_PUBLIC_MEETING_ROOM_MEDICOS_PELA_VIDA_URL,
  "claudia-de-bessa-solmucci": process.env.NEXT_PUBLIC_MEETING_ROOM_CLAUDIA_URL,
};

const MEETING_ROOM_URL_FALLBACK: Record<string, string> = {
  "alianca-pela-vida": "https://meet.google.com/knj-ohde-eih",
  "treinamento-doctor8": "https://meet.google.com/kbe-vkof-xza",
  "medicos-pela-vida": "https://meet.google.com/dtp-rdjw-wuz",
  "claudia-de-bessa-solmucci": "https://meet.google.com/pan-xqiv-xor",
};

export function getMeetingRoomMeetUrl(roomId: string): string | null {
  const url =
    MEETING_ROOM_URL_BY_ID[roomId]?.trim() ||
    MEETING_ROOM_URL_FALLBACK[roomId] ||
    (roomId === "nise-yamaguchi" ? process.env.GOOGLE_MEET_DEFAULT_URL?.trim() : undefined);
  return normalizeMeetUrl(url);
}
