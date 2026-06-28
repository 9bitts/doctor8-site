import { NextRequest, NextResponse } from "next/server";
import { exchangeAuthorizationCode, getSmartClientId } from "@/lib/fhir/smart-oauth";

function parseFormBody(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of raw.split("&")) {
    const [k, v] = part.split("=");
    if (k) out[decodeURIComponent(k.replace(/\+/g, " "))] = decodeURIComponent((v || "").replace(/\+/g, " "));
  }
  return out;
}

/** SMART token ? authorization_code + PKCE for public clients. */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const ct = req.headers.get("content-type") || "";
  const body = ct.includes("application/json")
    ? (JSON.parse(raw || "{}") as Record<string, string>)
    : parseFormBody(raw);

  const grantType = body.grant_type;
  if (grantType !== "authorization_code") {
    return NextResponse.json(
      { error: "unsupported_grant_type", error_description: "Only authorization_code is supported." },
      { status: 400 },
    );
  }

  const code = body.code;
  const redirectUri = body.redirect_uri;
  const clientId = body.client_id || getSmartClientId();
  const codeVerifier = body.code_verifier;

  if (!code || !redirectUri || !codeVerifier) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "code, redirect_uri, and code_verifier are required." },
      { status: 400 },
    );
  }

  const result = await exchangeAuthorizationCode({
    code,
    clientId,
    redirectUri,
    codeVerifier,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, error_description: result.description },
      { status: 400 },
    );
  }

  return NextResponse.json({
    access_token: result.accessToken,
    token_type: "Bearer",
    expires_in: result.expiresIn,
    scope: result.scope,
    patient: result.patientId,
  });
}
