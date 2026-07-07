import { google } from "googleapis";
import { encrypt, decrypt } from "@/lib/encryption";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const CALENDAR_READONLY = "https://www.googleapis.com/auth/calendar.readonly";

export function isGoogleCalendarOAuthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim(),
  );
}

function redirectUri(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://doctor8.app";
  return `${base}/api/professional/google-calendar/callback`;
}

export function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri(),
  );
}

export function buildGoogleCalendarAuthUrl(state: string): string {
  const client = createOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [CALENDAR_SCOPE, CALENDAR_READONLY],
    state,
  });
}

export async function exchangeGoogleCalendarCode(code: string) {
  const client = createOAuth2Client();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error("NO_REFRESH_TOKEN");
  }
  return {
    refreshToken: tokens.refresh_token,
    accessToken: tokens.access_token ?? null,
    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
  };
}

export function encryptToken(token: string): string {
  return encrypt(token);
}

export function decryptToken(encrypted: string): string {
  try {
    return decrypt(encrypted);
  } catch {
    return encrypted;
  }
}

export async function getAuthorizedCalendarClient(refreshTokenEnc: string, accessTokenEnc?: string | null) {
  const client = createOAuth2Client();
  client.setCredentials({
    refresh_token: decryptToken(refreshTokenEnc),
    access_token: accessTokenEnc ? decryptToken(accessTokenEnc) : undefined,
  });
  return { client, calendar: google.calendar({ version: "v3", auth: client }) };
}
