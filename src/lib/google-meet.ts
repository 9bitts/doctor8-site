import { google } from "googleapis";

export function isGoogleMeetEnabled(): boolean {
  return process.env.GOOGLE_MEET_ENABLED === "1" || process.env.GOOGLE_MEET_ENABLED === "true";
}

export type MeetLinkParams = {
  entryId: string;
  patientName: string;
  volunteerName: string;
  /** Emails of people joining the call — added as calendar guests so Meet lets them in. */
  attendeeEmails?: string[];
  /** When set and on the Workspace domain, the event is created on this user's calendar (they become host). */
  hostEmail?: string | null;
  /** Scheduled appointment — uses slot time in Calendar fallback */
  scheduledAt?: Date;
  durationMins?: number;
  kind?: "humanitarian" | "appointment";
};

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";
const MEET_SPACE_SCOPE = "https://www.googleapis.com/auth/meetings.space.created";

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

function workspaceDomain(): string {
  return process.env.GOOGLE_WORKSPACE_DOMAIN?.trim() || "doctor8.com.br";
}

function isWorkspaceEmail(email: string): boolean {
  const domain = workspaceDomain().toLowerCase();
  return email.trim().toLowerCase().endsWith(`@${domain}`);
}

function fallbackMeetLink(): string {
  const fixed = process.env.GOOGLE_MEET_DEFAULT_URL?.trim();
  if (fixed) return fixed;
  return "https://meet.google.com/new";
}

function uniqueEmails(...lists: (string | string[] | null | undefined)[]): string[] {
  const flat: (string | null | undefined)[] = [];
  for (const item of lists) {
    if (Array.isArray(item)) flat.push(...item);
    else flat.push(item);
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const email of flat) {
    const e = email?.trim().toLowerCase();
    if (!e || !e.includes("@") || seen.has(e)) continue;
    seen.add(e);
    out.push(e);
  }
  return out;
}

function resolveCalendarSubject(params: MeetLinkParams): string | null {
  const concierge = calendarUserEmail();
  const host = params.hostEmail?.trim();
  if (host && isWorkspaceEmail(host)) return host;
  return concierge;
}

type MeetJwtAuth = {
  getAccessToken(): Promise<string | { token?: string | null } | null | undefined>;
};

function buildJwt(subject: string, scopes: string[]): MeetJwtAuth | null {
  const sa = parseServiceAccountJson();
  if (!sa?.client_email || !sa?.private_key) return null;
  return new google.auth.JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes,
    subject,
  });
}

async function getAccessToken(auth: MeetJwtAuth): Promise<string | null> {
  const res = await auth.getAccessToken();
  const token = typeof res === "string" ? res : res?.token;
  return token ?? null;
}

type MeetSpaceResponse = {
  meetingUri?: string;
  meetingCode?: string;
};

/** Meet REST API — accessType OPEN lets anyone with the link join without host approval. */
async function createMeetViaMeetApi(
  accessType: "OPEN" | "TRUSTED",
): Promise<string | null> {
  const subject = calendarUserEmail();
  if (!subject) return null;

  const auth = buildJwt(subject, [MEET_SPACE_SCOPE]);
  if (!auth) return null;

  const token = await getAccessToken(auth);
  if (!token) return null;

  const res = await fetch("https://meet.googleapis.com/v2/spaces", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      config: {
        accessType,
        entryPointAccess: "ALL",
        moderation: "OFF",
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.warn(
      `[google-meet] Meet API spaces.create (${accessType}) failed:`,
      res.status,
      body.slice(0, 300),
    );
    return null;
  }

  const space = (await res.json()) as MeetSpaceResponse;
  if (space.meetingUri) return space.meetingUri;
  if (space.meetingCode) return `https://meet.google.com/${space.meetingCode}`;
  return null;
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
  const subject = resolveCalendarSubject(params);
  if (!subject) return null;

  const auth = buildJwt(subject, [CALENDAR_SCOPE]);
  if (!auth) return null;

  const calendar = google.calendar({
    version: "v3",
    auth: auth as Parameters<typeof google.calendar>[0]["auth"],
  });
  const isAppointment = params.kind === "appointment" && params.scheduledAt;
  const start = isAppointment ? params.scheduledAt! : new Date();
  const end = isAppointment
    ? new Date(start.getTime() + (params.durationMins ?? 30) * 60 * 1000)
    : new Date(start.getTime() + 60 * 60 * 1000);
  const prefix = isAppointment ? "appt" : "hum";
  const requestId = `${prefix}-${params.entryId}-${Date.now()}`;

  const concierge = calendarUserEmail();
  const attendees = uniqueEmails(
    params.attendeeEmails,
    params.hostEmail,
    concierge,
  ).map((email) => ({ email, responseStatus: "accepted" as const }));

  const summary = isAppointment
    ? `Doctor8 — consulta ${params.patientName}`
    : `Doctor8 humanitário — ${params.patientName}`;
  const description = isAppointment
    ? [
        "Consulta agendada Doctor8",
        `Paciente: ${params.patientName}`,
        `Profissional: ${params.volunteerName}`,
        `Consulta: ${params.entryId}`,
      ].join("\n")
    : [
        "Consulta humanitária Doctor8",
        `Paciente: ${params.patientName}`,
        `Voluntário: ${params.volunteerName}`,
        `Entrada: ${params.entryId}`,
      ].join("\n");

  const { data } = await calendar.events.insert({
    calendarId: "primary",
    conferenceDataVersion: 1,
    sendUpdates: "none",
    requestBody: {
      summary,
      description,
      start: { dateTime: start.toISOString(), timeZone: "America/Sao_Paulo" },
      end: { dateTime: end.toISOString(), timeZone: "America/Sao_Paulo" },
      anyoneCanAddSelf: true,
      guestsCanInviteOthers: true,
      guestsCanSeeOtherGuests: true,
      ...(attendees.length > 0 ? { attendees } : {}),
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

/**
 * Creates a unique Meet room. Prefers Meet API (OPEN access) so patient and
 * professional join without waiting for an organizer. Falls back to Calendar API
 * with attendees on the volunteer's calendar when they are on the Workspace domain.
 *
 * Domain delegation must include scopes:
 * - https://www.googleapis.com/auth/calendar
 * - https://www.googleapis.com/auth/meetings.space.created
 */
export async function createHumanitarianMeetLink(params: MeetLinkParams): Promise<string> {
  return createMeetLink({ ...params, kind: params.kind ?? "humanitarian" });
}

export async function createAppointmentMeetLink(params: {
  appointmentId: string;
  patientName: string;
  providerName: string;
  scheduledAt: Date;
  durationMins: number;
  attendeeEmails?: string[];
  hostEmail?: string | null;
}): Promise<string> {
  return createMeetLink({
    entryId: params.appointmentId,
    patientName: params.patientName,
    volunteerName: params.providerName,
    attendeeEmails: params.attendeeEmails,
    hostEmail: params.hostEmail,
    scheduledAt: params.scheduledAt,
    durationMins: params.durationMins,
    kind: "appointment",
  });
}

async function createMeetLink(params: MeetLinkParams): Promise<string> {
  const configured = parseServiceAccountJson() && calendarUserEmail();

  if (configured) {
    try {
      const openUrl = await createMeetViaMeetApi("OPEN");
      if (openUrl) return openUrl;

      const trustedUrl = await createMeetViaMeetApi("TRUSTED");
      if (trustedUrl) return trustedUrl;

      const calendarUrl = await createMeetViaCalendarApi(params);
      if (calendarUrl) return calendarUrl;

      console.error("[google-meet] All Meet creation methods returned no URL");
      throw new Error("MEET_CREATE_FAILED");
    } catch (err) {
      if (err instanceof Error && err.message === "MEET_CREATE_FAILED") throw err;
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[google-meet] Meet creation failed:", msg);
      throw new Error("MEET_CREATE_FAILED");
    }
  }

  console.warn("[google-meet] Using fallback link (service account or calendar user not configured)");
  return fallbackMeetLink();
}

export function isCalendarMeetConfigured(): boolean {
  const sa = parseServiceAccountJson();
  return Boolean(sa?.client_email && sa?.private_key && calendarUserEmail());
}
