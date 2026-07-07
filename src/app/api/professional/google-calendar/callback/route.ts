import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/encryption";
import {
  encryptToken,
  exchangeGoogleCalendarCode,
  isGoogleCalendarOAuthConfigured,
} from "@/lib/google-calendar-oauth";
import { syncProfessionalGoogleCalendar } from "@/lib/google-calendar-sync";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://doctor8.app";
  const redirectSettings = `${base}/psychologist/settings/calendar`;

  if (!code || !state || !isGoogleCalendarOAuthConfigured()) {
    return NextResponse.redirect(`${redirectSettings}?gcal=error`);
  }

  let payload: { userId: string; professionalId: string; ts: number };
  try {
    payload = JSON.parse(decrypt(state));
  } catch {
    return NextResponse.redirect(`${redirectSettings}?gcal=error`);
  }

  if (Date.now() - payload.ts > 15 * 60 * 1000) {
    return NextResponse.redirect(`${redirectSettings}?gcal=expired`);
  }

  try {
    const tokens = await exchangeGoogleCalendarCode(code);
    await db.professionalGoogleCalendar.upsert({
      where: { professionalId: payload.professionalId },
      create: {
        professionalId: payload.professionalId,
        refreshToken: encryptToken(tokens.refreshToken),
        accessToken: tokens.accessToken ? encryptToken(tokens.accessToken) : null,
        tokenExpiresAt: tokens.expiresAt,
      },
      update: {
        refreshToken: encryptToken(tokens.refreshToken),
        accessToken: tokens.accessToken ? encryptToken(tokens.accessToken) : null,
        tokenExpiresAt: tokens.expiresAt,
        syncEnabled: true,
      },
    });

    await syncProfessionalGoogleCalendar(payload.professionalId).catch(() => {});

    return NextResponse.redirect(`${redirectSettings}?gcal=connected`);
  } catch {
    return NextResponse.redirect(`${redirectSettings}?gcal=error`);
  }
}
