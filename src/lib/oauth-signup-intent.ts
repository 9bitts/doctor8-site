import { createHmac, timingSafeEqual } from "crypto";

export const OAUTH_SIGNUP_ROLE_COOKIE = "oauth_signup_role";
export const OAUTH_SIGNUP_ROLE_MAX_AGE_SECONDS = 600;

export type SignupRole =
  | "PATIENT"
  | "PROFESSIONAL"
  | "PSYCHOANALYST"
  | "INTEGRATIVE_THERAPIST";

export type SignupProfessionalKind = "psychologist" | null;

const VALID_ROLES = new Set<string>([
  "PATIENT",
  "PROFESSIONAL",
  "PSYCHOANALYST",
  "INTEGRATIVE_THERAPIST",
]);

const VALID_KINDS = new Set<string>(["", "psychologist"]);

function signingSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required");
  return secret;
}

function signPayload(payload: string): string {
  return createHmac("sha256", signingSecret()).update(payload).digest("base64url");
}

export function createSignupRoleToken(
  role: SignupRole,
  professionalKind: SignupProfessionalKind = null,
  phoneE164: string | null = null,
): string {
  const exp = Math.floor(Date.now() / 1000) + OAUTH_SIGNUP_ROLE_MAX_AGE_SECONDS;
  const kind = professionalKind ?? "";
  const phone = (phoneE164 || "").replace(/\D/g, "");
  const payload = `${role}:${kind}:${phone}:${exp}`;
  return `${payload}.${signPayload(payload)}`;
}

export type ParsedSignupIntent = {
  role: SignupRole;
  professionalKind: SignupProfessionalKind;
  phoneE164: string | null;
};

export function parseSignupRoleToken(token: string | undefined): ParsedSignupIntent | null {
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

  const parts = payload.split(":");
  if (parts.length < 2) return null;

  let role: string;
  let kind: string;
  let phone: string;
  let expStr: string;

  if (parts.length === 4) {
    [role, kind, phone, expStr] = parts;
  } else if (parts.length === 3) {
    [role, kind, expStr] = parts;
    phone = "";
  } else if (parts.length === 2) {
    [role, expStr] = parts;
    kind = "";
    phone = "";
  } else {
    return null;
  }

  const exp = Number.parseInt(expStr, 10);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;
  if (!VALID_ROLES.has(role)) return null;
  if (!VALID_KINDS.has(kind)) return null;

  return {
    role: role as SignupRole,
    professionalKind: kind === "psychologist" ? "psychologist" : null,
    phoneE164: phone || null,
  };
}
