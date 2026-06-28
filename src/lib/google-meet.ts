import { google } from "googleapis";

export function isGoogleMeetEnabled(): boolean {
  return process.env.GOOGLE_MEET_ENABLED === "1" || process.env.GOOGLE_MEET_ENABLED === "true";
}

type MeetLinkParams = {
  entryId: string;
  patientName: string;
  volunteerName: string;
};

function parseServiceAccountJson(): Record<string, string> | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    console.error("[google-meet] GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON");
    return null;
  }
}

function calendarUserEmail(): string | null {
  return (
    process.env.GOOGLE_CALENDAR_USER?.trim() ||
    process.env.GOOGLE_CALENDAR_ID?.trim() ||
    null
  );
}

function fallbackMeetLink(): string {
  const fixed = process.env.GOOGLE_MEET_DEFAULT_URL?.trim();
  if (fixed) return fixed;
  return "https://meet.google.com/new";
}

function extractMeetUrl(event: {
  hangoutLink?: string | null;
  conferenceData?: {
    entryPoints?: { entryPointType?: string | null; uri?: string | null }[] | null;
  } | null;
}): string | null {
  if (event.hangoutLink) return event.hangoutLink;
  const video = event.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video");
  return video?.uri ?? null;
}

async function createMeetViaCalendarApi(params: MeetLinkParams): Promise<string | null> {
  const sa = parseServiceAccountJson();
  const subject = calendarUserEmail();
  if (!sa?.client_email || !sa?.private_key || !subject) {
    return null;
  }

  const auth = new google.auth.JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes: ["https://www.googleapis.com/auth/calendar"],
    subject,
  });

  const calendar = google.calendar({ version: "v3", auth });
  const start = new Date();
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const requestId = `hum-${params.entryId}-${Date.now()}`;

  const { data } = await calendar.events.insert({
    calendarId: "primary",
    conferenceDataVersion: 1,
    sendUpdates: "none",
    requestBody: {
      summary: `Doctor8 humanit?rio ? ${params.patientName}`,
      description: `Consulta humanit?ria\nPaciente: ${params.patientName}\nVolunt?rio: ${params.volunteerName}\nEntrada: ${params.entryId}`,
      start: { dateTime: start.toISOString(), timeZone: "America/Sao_Paulo" },
      end: { dateTime: end.toISOString(), timeZone: "America/Sao_Paulo" },
      conferenceData: {
        createRequest: {
          requestId,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    },
  });

  return extractMeetUrl(data);
}

/** Creates a unique Meet room via Calendar API (concierge calendar) or falls back. */
export async function createHumanitarianMeetLink(params: MeetLinkParams): Promise<string> {
  try {
    const url = await createMeetViaCalendarApi(params);
    if (url) return url;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[google-meet] Calendar API failed:", msg);
    throw new Error("MEET_CREATE_FAILED");
  }

  if (parseServiceAccountJson() && calendarUserEmail()) {
    console.error("[google-meet] Calendar API returned no Meet URL");
    throw new Error("MEET_CREATE_FAILED");
  }

  console.warn("[google-meet] Using fallback link (service account or calendar user not configured)");
  return fallbackMeetLink();
}

export function isCalendarMeetConfigured(): boolean {
  const sa = parseServiceAccountJson();
  return Boolean(sa?.client_email && sa?.private_key && calendarUserEmail());
}
