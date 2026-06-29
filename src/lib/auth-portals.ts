export type LoginAccent = "emerald" | "violet" | "teal" | "indigo" | "rose";
export type PortalHeaderIcon = "brain" | "leaf" | "building" | "heart";

// Login is unified into a single screen. All former per-role portal URLs now
// resolve to /login; legacy /login/<portal> paths are redirected by middleware.
export const LOGIN = "/login";

/** @deprecated Use LOGIN — kept so existing imports keep resolving to /login. */
export const MAIN_LOGIN = LOGIN;
export const PATIENT_LOGIN = LOGIN;
export const DOCTOR_LOGIN = LOGIN;
export const PSYCHOLOGIST_LOGIN = LOGIN;
export const PSYCHOANALYST_LOGIN = LOGIN;
export const INTEGRATIVE_THERAPIST_LOGIN = LOGIN;
export const ORGANIZATION_LOGIN = LOGIN;
export const ANGEL_LOGIN = LOGIN;

export const PROFESSIONAL_REGISTER = "/register/professional/signup";
export const PSYCHOLOGIST_REGISTER =
  "/register/professional/signup?portal=psychologist";
export const PSYCHOANALYST_REGISTER =
  "/register/professional/signup?role=PSYCHOANALYST";
export const INTEGRATIVE_REGISTER =
  "/register/professional/signup?role=INTEGRATIVE_THERAPIST";
export const ORGANIZATION_REGISTER = "/register/organization";
export const ANGEL_REGISTER = "/register/angel";

/** Unauthenticated redirect target — always the unified login. */
export function resolveLoginPathForPathname(_pathname: string): string {
  return LOGIN;
}

/** Sign-out destination — always the unified login. */
export function resolveLoginPathForSession(
  _role?: string | null,
  _pathname?: string,
  _isPsychologistPortal?: boolean,
): string {
  return LOGIN;
}

/** Accent + back link for forgot-password flow (single login → emerald). */
export function resolveForgotPasswordContext(_from: string | null | undefined): {
  loginPath: string;
  accent: LoginAccent;
} {
  return { loginPath: LOGIN, accent: "emerald" };
}

export function buildForgotPasswordHref(opts?: {
  email?: string;
  from?: string;
}): string {
  const sp = new URLSearchParams();
  if (opts?.email) sp.set("email", opts.email.trim().toLowerCase());
  if (opts?.from) sp.set("from", opts.from);
  const path = opts?.email ? "/forgot-password/method" : "/forgot-password";
  const qs = sp.toString();
  return qs ? `${path}?${qs}` : path;
}

export function buildLoginHref(
  loginPath: string,
  opts?: { resetSuccess?: boolean; callbackUrl?: string },
): string {
  const sp = new URLSearchParams();
  if (opts?.resetSuccess) sp.set("reset", "success");
  if (opts?.callbackUrl) sp.set("callbackUrl", opts.callbackUrl);
  const qs = sp.toString();
  return qs ? `${loginPath}?${qs}` : loginPath;
}

/** Only allow internal login paths in email links and redirects. */
export function sanitizeLoginFrom(from: string | null | undefined): string | undefined {
  if (!from?.startsWith("/login")) return undefined;
  return from;
}

/** Post-auth login path from a dashboard callback (single login → /login). */
export function resolveLoginPathFromCallback(_callbackUrl: string | null | undefined): string {
  return LOGIN;
}

export function resolveVerifyFrom(opts: {
  from?: string | null;
  callbackUrl?: string | null;
}): string {
  const safeFrom = sanitizeLoginFrom(opts.from ?? undefined);
  if (safeFrom) return safeFrom;
  return LOGIN;
}

export function buildVerifyQueryString(opts: {
  email?: string;
  callbackUrl?: string;
  from?: string;
}): string {
  const sp = new URLSearchParams();
  if (opts.email) sp.set("email", opts.email.trim().toLowerCase());
  if (opts.callbackUrl) sp.set("callbackUrl", opts.callbackUrl);
  const safeFrom = sanitizeLoginFrom(opts.from);
  if (safeFrom) sp.set("from", safeFrom);
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export function buildVerifyAccountHref(opts: {
  email: string;
  callbackUrl?: string;
  from?: string;
}): string {
  return `/verify-account${buildVerifyQueryString(opts)}`;
}

export function buildVerifyEmailHref(opts: {
  email?: string;
  callbackUrl?: string;
  from?: string;
  error?: string;
}): string {
  const sp = new URLSearchParams();
  if (opts.email) sp.set("email", opts.email.trim().toLowerCase());
  if (opts.callbackUrl) sp.set("callbackUrl", opts.callbackUrl);
  const safeFrom = sanitizeLoginFrom(opts.from);
  if (safeFrom) sp.set("from", safeFrom);
  if (opts.error) sp.set("error", opts.error);
  const qs = sp.toString();
  return qs ? `/verify-email?${qs}` : "/verify-email";
}

export function buildVerifyConfirmedHref(from?: string | null): string {
  const safeFrom = sanitizeLoginFrom(from);
  return safeFrom
    ? `/verify-email/confirmed?from=${encodeURIComponent(safeFrom)}`
    : "/verify-email/confirmed";
}

/** Registration return-to login path — single login. */
export function resolveLoginPathForRegistration(
  _role: string,
  _professionalKind?: string | null,
): string {
  return LOGIN;
}

export function appendEmailQueryParam(url: string, key: string, value: string): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}
