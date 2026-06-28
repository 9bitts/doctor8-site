import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getSmartClientId,
  isRedirectUriAllowed,
  isSmartClientIdAllowed,
} from "@/lib/fhir/smart-oauth";

async function oauthError(
  redirectUri: string | null,
  clientId: string,
  error: string,
  description: string,
  state?: string | null,
) {
  if (!redirectUri || !(await isRedirectUriAllowed(redirectUri, clientId))) {
    return NextResponse.json({ error, error_description: description }, { status: 400 });
  }
  const url = new URL(redirectUri);
  url.searchParams.set("error", error);
  url.searchParams.set("error_description", description);
  if (state) url.searchParams.set("state", state);
  return NextResponse.redirect(url);
}

/** SMART authorize ? PKCE + authorization code for patient apps. */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const redirectUri = sp.get("redirect_uri");
  const state = sp.get("state");
  const clientId = sp.get("client_id") || getSmartClientId();
  const responseType = sp.get("response_type");
  const scope = sp.get("scope") || "patient/*.read";
  const codeChallenge = sp.get("code_challenge");
  const codeChallengeMethod = sp.get("code_challenge_method");

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://app.doctor8.org").replace(/\/$/, "");

  if (!redirectUri || !(await isRedirectUriAllowed(redirectUri, clientId))) {
    return NextResponse.json({ error: "invalid_request", error_description: "redirect_uri not allowed" }, { status: 400 });
  }
  if (responseType !== "code") {
    return oauthError(redirectUri, clientId, "unsupported_response_type", "Only code is supported.", state);
  }
  if (!(await isSmartClientIdAllowed(clientId))) {
    return oauthError(redirectUri, clientId, "invalid_client", "Unknown client_id.", state);
  }
  if (!codeChallenge || codeChallengeMethod !== "S256") {
    return oauthError(redirectUri, clientId, "invalid_request", "PKCE S256 code_challenge required.", state);
  }

  const session = await auth();
  if (!session?.user) {
    const resumeUrl = `/api/fhir/smart/authorize?${sp.toString()}`;
    const login = new URL("/login", appUrl);
    login.searchParams.set("callbackUrl", resumeUrl);
    return NextResponse.redirect(login);
  }

  if (session.user.role !== "PATIENT") {
    return oauthError(redirectUri, clientId, "access_denied", "Only patient accounts can authorize FHIR access.", state);
  }

  const patient = await db.patientProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!patient) {
    return oauthError(redirectUri, clientId, "access_denied", "Patient profile required.", state);
  }

  const consentUrl = new URL("/patient/fhir-authorize", appUrl);
  consentUrl.search = sp.toString();
  return NextResponse.redirect(consentUrl);
}
