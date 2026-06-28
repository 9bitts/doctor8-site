import crypto from "crypto";
import { db } from "@/lib/db";
import {
  isRedirectUriAllowedForClient,
  isRegisteredSmartClient,
} from "@/lib/fhir/smart-oauth-clients";

const CODE_TTL_MS = 10 * 60 * 1000;
export const ACCESS_TOKEN_TTL_SEC = 3600;
export const REFRESH_TOKEN_TTL_SEC = 30 * 24 * 3600;

export function getSmartClientId(): string {
  return process.env.SMART_OAUTH_CLIENT_ID?.trim() || "doctor8-public";
}

function envRedirectAllowlist(): string[] {
  return (process.env.SMART_OAUTH_REDIRECT_URIS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function localhostRedirectAllowed(uri: string): boolean {
  try {
    const u = new URL(uri);
    return u.hostname === "localhost" || u.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export async function isSmartClientIdAllowed(clientId: string): Promise<boolean> {
  if (clientId === getSmartClientId()) return true;
  return isRegisteredSmartClient(clientId);
}

export async function isRedirectUriAllowed(uri: string, clientId?: string): Promise<boolean> {
  if (clientId && (await isRedirectUriAllowedForClient(clientId, uri))) {
    return true;
  }

  const allowlist = envRedirectAllowlist();
  if (allowlist.length === 0) {
    return localhostRedirectAllowed(uri);
  }
  return allowlist.includes(uri);
}

export function sha256Base64Url(input: string): string {
  return crypto.createHash("sha256").update(input).digest("base64url");
}

export function verifyPkce(verifier: string, challenge: string): boolean {
  return sha256Base64Url(verifier) === challenge;
}

function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

type TokenBundle = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scope: string;
  patientId: string;
};

async function issueTokenPair(params: {
  clientId: string;
  userId: string;
  patientId: string;
  scope: string;
}): Promise<TokenBundle> {
  const accessToken = randomToken(48);
  const refreshToken = randomToken(48);
  const accessExpires = new Date(Date.now() + ACCESS_TOKEN_TTL_SEC * 1000);
  const refreshExpires = new Date(Date.now() + REFRESH_TOKEN_TTL_SEC * 1000);

  const accessRow = await db.smartAccessToken.create({
    data: {
      token: accessToken,
      clientId: params.clientId,
      userId: params.userId,
      patientId: params.patientId,
      scope: params.scope,
      expiresAt: accessExpires,
    },
  });

  await db.smartRefreshToken.create({
    data: {
      token: refreshToken,
      accessTokenId: accessRow.id,
      clientId: params.clientId,
      userId: params.userId,
      patientId: params.patientId,
      scope: params.scope,
      expiresAt: refreshExpires,
    },
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SEC,
    scope: params.scope,
    patientId: params.patientId,
  };
}

export async function createAuthorizationCode(params: {
  clientId: string;
  userId: string;
  patientId: string;
  redirectUri: string;
  scope: string;
  codeChallenge: string;
}): Promise<string> {
  const code = randomToken(32);
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  await db.smartAuthorizationCode.create({
    data: {
      code,
      clientId: params.clientId,
      userId: params.userId,
      patientId: params.patientId,
      redirectUri: params.redirectUri,
      scope: params.scope,
      codeChallenge: params.codeChallenge,
      expiresAt,
    },
  });

  return code;
}

export async function exchangeAuthorizationCode(params: {
  code: string;
  clientId: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<
  | ({ ok: true } & TokenBundle)
  | { ok: false; error: string; description: string }
> {
  const row = await db.smartAuthorizationCode.findUnique({
    where: { code: params.code },
  });

  if (!row || row.usedAt || row.expiresAt < new Date()) {
    return { ok: false, error: "invalid_grant", description: "Authorization code invalid or expired." };
  }
  if (row.clientId !== params.clientId) {
    return { ok: false, error: "invalid_client", description: "Unknown client_id." };
  }
  if (row.redirectUri !== params.redirectUri) {
    return { ok: false, error: "invalid_grant", description: "redirect_uri mismatch." };
  }
  if (!verifyPkce(params.codeVerifier, row.codeChallenge)) {
    return { ok: false, error: "invalid_grant", description: "PKCE verification failed." };
  }

  await db.smartAuthorizationCode.update({
    where: { id: row.id },
    data: { usedAt: new Date() },
  });

  const tokens = await issueTokenPair({
    clientId: row.clientId,
    userId: row.userId,
    patientId: row.patientId,
    scope: row.scope,
  });

  return { ok: true, ...tokens };
}

export async function exchangeRefreshToken(params: {
  refreshToken: string;
  clientId: string;
}): Promise<
  | ({ ok: true } & TokenBundle)
  | { ok: false; error: string; description: string }
> {
  const row = await db.smartRefreshToken.findUnique({
    where: { token: params.refreshToken },
  });

  if (!row || row.revokedAt || row.expiresAt < new Date()) {
    return { ok: false, error: "invalid_grant", description: "Refresh token invalid or expired." };
  }
  if (row.clientId !== params.clientId) {
    return { ok: false, error: "invalid_client", description: "Unknown client_id." };
  }

  await db.smartRefreshToken.update({
    where: { id: row.id },
    data: { revokedAt: new Date() },
  });

  const tokens = await issueTokenPair({
    clientId: row.clientId,
    userId: row.userId,
    patientId: row.patientId,
    scope: row.scope,
  });

  return { ok: true, ...tokens };
}

export type SmartTokenContext = {
  userId: string;
  patientId: string;
  scope: string;
  clientId: string;
};

export async function validateAccessToken(token: string): Promise<SmartTokenContext | null> {
  const row = await db.smartAccessToken.findUnique({ where: { token } });
  if (!row || row.expiresAt < new Date()) return null;
  return {
    userId: row.userId,
    patientId: row.patientId,
    scope: row.scope,
    clientId: row.clientId,
  };
}

export function bearerTokenFromRequest(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7).trim() || null;
}

export function scopeAllowsPatientRead(scope: string): boolean {
  return scope.includes("patient/*.read") || scope.includes("patient/Patient.read");
}

function tokenResponse(bundle: TokenBundle) {
  return {
    access_token: bundle.accessToken,
    refresh_token: bundle.refreshToken,
    token_type: "Bearer",
    expires_in: bundle.expiresIn,
    scope: bundle.scope,
    patient: bundle.patientId,
  };
}

export { tokenResponse };
