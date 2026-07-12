import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { AuditAction } from "@prisma/client";
import {
  getSsoAccessDeniedMessage,
  getSsoRolesForClient,
  ssoAppUrl,
} from "@/lib/sso/sso-config";
import { getSsoClient, isSsoRedirectUriAllowed } from "@/lib/sso/sso-clients";
import { createSsoAuthorizationCode } from "@/lib/sso/sso-codes";
import {
  isB2BSsoRole,
  listB2BOrganizations,
  userHasB2BOrganizationAccess,
} from "@/lib/sso/sso-orgs";

const ACCOUNT_TYPE_VALUES = new Set(["CLINIC", "EMPLOYER", "PHARMACY", "LABORATORY"]);

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

function buildLoginRedirect(appUrl: string, callbackUrl: string, accountType: string | null) {
  if (accountType === "CLINIC") {
    const login = new URL("/login", appUrl);
    login.searchParams.set("portal", "organization");
    login.searchParams.set("callbackUrl", callbackUrl);
    return login;
  }
  if (accountType === "EMPLOYER") {
    const login = new URL("/empresas/login", appUrl);
    login.searchParams.set("callbackUrl", callbackUrl);
    return login;
  }
  if (accountType === "PHARMACY") {
    const login = new URL("/farmacias/login", appUrl);
    login.searchParams.set("callbackUrl", callbackUrl);
    return login;
  }
  if (accountType === "LABORATORY") {
    const login = new URL("/laboratorios/login", appUrl);
    login.searchParams.set("callbackUrl", callbackUrl);
    return login;
  }

  const login = new URL("/login", appUrl);
  login.searchParams.set("callbackUrl", callbackUrl);
  return login;
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
  const rawAccountType = sp.get("account_type");
  const accountType =
    rawAccountType && ACCOUNT_TYPE_VALUES.has(rawAccountType) ? rawAccountType : null;
  const selectedOrganizationId = sp.get("organization_id");

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
  const callbackUrl = resumeAuthorizeUrl();

  if (forceLogin) {
    return NextResponse.redirect(buildLoginRedirect(appUrl, callbackUrl, accountType));
  }

  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.redirect(buildLoginRedirect(appUrl, callbackUrl, accountType));
  }

  const dbUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  const role = dbUser?.role ?? session.user.role;

  if (!role || !getSsoRolesForClient(clientId).has(role)) {
    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.LOGIN_FAILED,
      resource: `SSO:${clientId}`,
      details: { reason: "access_denied", role },
    });
    return oauthError(
      redirectUri,
      clientId,
      "access_denied",
      getSsoAccessDeniedMessage(clientId),
      state
    );
  }

  let organizationId: string | null = selectedOrganizationId;

  if (isB2BSsoRole(role)) {
    const organizations = await listB2BOrganizations(session.user.id, role);

    if (organizations.length === 0) {
      return oauthError(
        redirectUri,
        clientId,
        "access_denied",
        "Nenhuma organização ativa vinculada à conta.",
        state
      );
    }

    if (organizations.length > 1) {
      if (!organizationId) {
        const selectOrg = new URL("/sso/select-org", appUrl);
        selectOrg.searchParams.set("resume", callbackUrl);
        return NextResponse.redirect(selectOrg);
      }

      const allowed = await userHasB2BOrganizationAccess(
        session.user.id,
        role,
        organizationId,
      );
      if (!allowed) {
        return oauthError(
          redirectUri,
          clientId,
          "access_denied",
          "Organização selecionada inválida.",
          state
        );
      }
    } else {
      organizationId = organizations[0]!.id;
    }
  }

  const code = await createSsoAuthorizationCode({
    clientId,
    userId: session.user.id,
    redirectUri,
    scope,
    nonce,
    codeChallenge,
    codeChallengeMethod,
    organizationId,
  });

  const callback = new URL(redirectUri);
  callback.searchParams.set("code", code);
  if (state) callback.searchParams.set("state", state);
  return NextResponse.redirect(callback);
}
