import { NextRequest, NextResponse } from "next/server";

/** SMART authorize ? redirects to login; full OAuth client flow coming in a later phase. */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const redirectUri = sp.get("redirect_uri");
  const state = sp.get("state");
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://app.doctor8.org").replace(/\/$/, "");

  const callback = new URL("/patient/history", appUrl);
  const login = new URL("/login", appUrl);
  login.searchParams.set("callbackUrl", callback.pathname);
  if (state) login.searchParams.set("smart_state", state);
  if (redirectUri) login.searchParams.set("smart_redirect_uri", redirectUri);

  return NextResponse.redirect(login);
}
