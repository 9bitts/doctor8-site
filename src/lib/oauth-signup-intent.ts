import { createHmac, timingSafeEqual } from "crypto";

export const OAUTH_SIGNUP_ROLE_COOKIE = "oauth_signup_role";
export const OAUTH_SIGNUP_ROLE_MAX_AGE_SECONDS = 600;

export type SignupRole =
  | "PATIENT"
  | "PROFESSIONAL"
  | "PSYCHOANALYST"
  | "INTEGRATIVE_THERAPIST";

const VALID_ROLES = new Set<string>([
  "PATIENT",
  "PROFESSIONAL",
  "PSYCHOANALYST",
  "INTEGRATIVE_THERAPIST",
]);

function signingSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required");
  return secret;
}

function signPayload(payload: string): string {
  return createHmac("sha256", signingSecret()).update(payload).digest("base64url");
}

export function createSignupRoleToken(role: SignupRole): string {
  const exp = Math.floor(Date.now() / 1000) + OAUTH_SIGNUP_ROLE_MAX_AGE_SECONDS;
  const payload = `${role}:${exp}`;
  return `${payload}.${signPayload(payload)}`;
}

export function parseSignupRoleToken(token: string | undefined): SignupRole | null {
  if (!token) return null;

  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;

  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expected = signPayload(payload);

  try {
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
  } catch {
    return null;
  }

  const [role, expStr] = payload.split(":");
  const exp = Number.parseInt(expStr, 10);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;
  if (!VALID_ROLES.has(role)) return null;

  return role as SignupRole;
}
