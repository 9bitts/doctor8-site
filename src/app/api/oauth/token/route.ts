import { NextRequest, NextResponse } from "next/server";
import { getSsoClient, verifySsoClientSecret } from "@/lib/sso/sso-clients";
import { consumeSsoAuthorizationCode } from "@/lib/sso/sso-codes";
import { ACCESS_TOKEN_TTL_SEC, issueAccessToken, issueIdToken } from "@/lib/sso/sso-jwt";
import { getSsoUserClaims } from "@/lib/sso/sso-userinfo";
import { verifyPkce } from "@/lib/sso/sso-pkce";

async function parseBody(req: NextRequest): Promise<URLSearchParams> {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const json = (await req.json()) as Record<string, string>;
    return new URLSearchParams(json);
  }
  const text = await req.text();
  return new URLSearchParams(text);
}

function readClientAuth(req: NextRequest, body: URLSearchParams) {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Basic ")) {
    const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf8");
    const sep = decoded.indexOf(":");
    if (sep >= 0) {
      return {
        clientId: decoded.slice(0, sep),
        clientSecret: decoded.slice(sep + 1),
      };
    }
  }
  return {
    clientId: body.get("client_id") ?? "",
    clientSecret: body.get("client_secret") ?? "",
  };
}

/** OIDC token endpoint — authorization code → id_token + access_token. */
export async function POST(req: NextRequest) {
  const body = await parseBody(req);
  const grantType = body.get("grant_type");
  const code = body.get("code");
  const redirectUri = body.get("redirect_uri");
  const { clientId, clientSecret } = readClientAuth(req, body);

  if (grantType !== "authorization_code") {
    return NextResponse.json({ error: "unsupported_grant_type" }, { status: 400 });
  }
  if (!clientId || !getSsoClient(clientId)) {
    return NextResponse.json({ error: "invalid_client" }, { status: 401 });
  }
  if (!verifySsoClientSecret(clientId, clientSecret)) {
    return NextResponse.json({ error: "invalid_client" }, { status: 401 });
  }
  if (!code || !redirectUri) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const meta = await consumeSsoAuthorizationCode(code, clientId, redirectUri);
  if (!meta) {
    return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
  }

  const codeVerifier = body.get("code_verifier");
  if (meta.codeChallenge) {
    if (!codeVerifier || meta.codeChallengeMethod !== "S256") {
      return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
    }
    if (!verifyPkce(codeVerifier, meta.codeChallenge)) {
      return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
    }
  }

  const claims = await getSsoUserClaims(meta.userId);
  if (!claims) {
    return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
  }

  const idToken = issueIdToken({
    sub: claims.sub,
    aud: clientId,
    email: claims.email,
    emailVerified: claims.email_verified,
    name: claims.name,
    picture: claims.picture,
    role: claims.role,
    verified: claims.verified,
    nonce: meta.nonce,
  });

  const accessToken = issueAccessToken({
    sub: claims.sub,
    aud: clientId,
    scope: meta.scope,
  });

  return NextResponse.json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_TTL_SEC,
    id_token: idToken,
    scope: meta.scope,
  });
}
