import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getSsoAccessDeniedMessage,
  getSsoRolesForClient,
  ssoAppUrl,
} from "@/lib/sso/sso-config";
import { getSsoClient, isSsoRedirectUriAllowed } from "@/lib/sso/sso-clients";
import { createSsoAuthorizationCode } from "@/lib/sso/sso-codes";

async function oauthError(
  redirectUri: string | null,
  clientId: string,
  error: string,
  description: string,
  state?: string | null
) {
  if (!redirectUri || !isSsoRedirectUriAllowed(clientId, redirectUri)) {
    return NextResponse.json({ error, error_description: description }, { status: 400 });
  }
  const url = new URL(redirectUri);
  url.searchParams.set("error", error);
  url.searchParams.set("error_description", description);
  if (state) url.searchParams.set("state", state);
  return NextResponse.redirect(url);
}

/** OIDC authorization endpoint — SSO for eight and other trusted apps. */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const redirectUri = sp.get("redirect_uri");
  const state = sp.get("state");
  const clientId = sp.get("client_id");
  const responseType = sp.get("response_type");
  const scope = sp.get("scope") || "openid email profile";
  const nonce = sp.get("nonce");
  const codeChallenge = sp.get("code_challenge");
  const codeChallengeMethod = sp.get("code_challenge_method");

  if (!clientId || !getSsoClient(clientId)) {
    return NextResponse.json({ error: "invalid_client" }, { status: 400 });
  }
  if (!redirectUri || !isSsoRedirectUriAllowed(clientId, redirectUri)) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "redirect_uri not allowed" },
      { status: 400 }
    );
  }
  if (responseType !== "code") {
    return oauthError(redirectUri, clientId, "unsupported_response_type", "Only code is supported.", state);
  }
  if (!scope.includes("openid")) {
    return oauthError(redirectUri, clientId, "invalid_scope", "openid scope is required.", state);
  }

  const appUrl = ssoAppUrl();

  function resumeAuthorizeUrl(): string {
    const resumeParams = new URLSearchParams(sp);
    resumeParams.delete("prompt");
    return `/api/oauth/authorize?${resumeParams.toString()}`;
  }

  const prompt = sp.get("prompt");
  const forceLogin = prompt?.split(/\s+/).includes("login") ?? false;

  if (forceLogin) {
    const login = new URL("/login", appUrl);
    login.searchParams.set("callbackUrl", resumeAuthorizeUrl());
    return NextResponse.redirect(login);
  }

  const session = await auth();

  if (!session?.user?.id) {
    const login = new URL("/login", appUrl);
    login.searchParams.set("callbackUrl", resumeAuthorizeUrl());
    return NextResponse.redirect(login);
  }

  const dbUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  const role = dbUser?.role ?? session.user.role;

  if (!role || !getSsoRolesForClient(clientId).has(role)) {
    return oauthError(
      redirectUri,
      clientId,
      "access_denied",
      getSsoAccessDeniedMessage(clientId),
      state
    );
  }

  const code = await createSsoAuthorizationCode({
    clientId,
    userId: session.user.id,
    redirectUri,
    scope,
    nonce,
    codeChallenge,
    codeChallengeMethod,
  });

  const callback = new URL(redirectUri);
  callback.searchParams.set("code", code);
  if (state) callback.searchParams.set("state", state);
  return NextResponse.redirect(callback);
}
