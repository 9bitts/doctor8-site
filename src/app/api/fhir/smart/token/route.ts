import { NextRequest, NextResponse } from "next/server";
import {
  exchangeAuthorizationCode,
  exchangeRefreshToken,
  getSmartClientId,
  tokenResponse,
} from "@/lib/fhir/smart-oauth";

function parseFormBody(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of raw.split("&")) {
    const [k, v] = part.split("=");
    if (k) out[decodeURIComponent(k.replace(/\+/g, " "))] = decodeURIComponent((v || "").replace(/\+/g, " "));
  }
  return out;
}

/** SMART token ? authorization_code + refresh_token for public clients. */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const ct = req.headers.get("content-type") || "";
  const body = ct.includes("application/json")
    ? (JSON.parse(raw || "{}") as Record<string, string>)
    : parseFormBody(raw);

  const grantType = body.grant_type;
  const clientId = body.client_id || getSmartClientId();

  if (grantType === "authorization_code") {
    const code = body.code;
    const redirectUri = body.redirect_uri;
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

    return NextResponse.json(tokenResponse(result));
  }

  if (grantType === "refresh_token") {
    const refreshToken = body.refresh_token;
    if (!refreshToken) {
      return NextResponse.json(
        { error: "invalid_request", error_description: "refresh_token is required." },
        { status: 400 },
      );
    }

    const result = await exchangeRefreshToken({ refreshToken, clientId });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, error_description: result.description },
        { status: 400 },
      );
    }

    return NextResponse.json(tokenResponse(result));
  }

  return NextResponse.json(
    { error: "unsupported_grant_type", error_description: "Supported: authorization_code, refresh_token." },
    { status: 400 },
  );
}
