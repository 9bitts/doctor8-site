import { PSYCHOLOGIST_HOME } from "@/lib/psychologist-portal";

export type LoginAccent = "emerald" | "violet" | "teal" | "indigo" | "rose";
export type PortalHeaderIcon = "brain" | "leaf" | "building" | "heart";

export const MAIN_LOGIN = "/login";
export const PSYCHOLOGIST_LOGIN = "/login/psicologo";
export const PSYCHOANALYST_LOGIN = "/login/psicanalista";
export const INTEGRATIVE_THERAPIST_LOGIN = "/login/terapeuta-integrativo";
export const ORGANIZATION_LOGIN = "/login/organizacao";
export const ANGEL_LOGIN = "/login/anjo";

export const PROFESSIONAL_REGISTER = "/register/professional/signup";
export const PSYCHOLOGIST_REGISTER =
  "/register/professional/signup?portal=psychologist";
export const PSYCHOANALYST_REGISTER =
  "/register/professional/signup?role=PSYCHOANALYST";
export const INTEGRATIVE_REGISTER =
  "/register/professional/signup?role=INTEGRATIVE_THERAPIST";
export const ORGANIZATION_REGISTER = "/register/organization";
export const ANGEL_REGISTER = "/register/angel";

export type PortalId =
  | "psychologist"
  | "psychoanalyst"
  | "integrative-therapist"
  | "organization"
  | "angel";

export interface PortalLoginConfig {
  id: PortalId;
  loginPath: string;
  accent: LoginAccent;
  homePath: string;
  defaultRegisterPath: string;
  taglineKey: string;
  roleOnlyKey: string;
  allowedRoles: string[];
  oauthPortal: string;
  headerIcon: PortalHeaderIcon;
  footerLinkClass: string;
  footerLabelKey: string;
}

export const PORTAL_LOGINS: PortalLoginConfig[] = [
  {
    id: "psychologist",
    loginPath: PSYCHOLOGIST_LOGIN,
    accent: "violet",
    homePath: PSYCHOLOGIST_HOME,
    defaultRegisterPath: PSYCHOLOGIST_REGISTER,
    taglineKey: "login.psychologistTagline",
    roleOnlyKey: "login.psychologistOnly",
    allowedRoles: ["PROFESSIONAL"],
    oauthPortal: "psychologist",
    headerIcon: "brain",
    footerLinkClass: "text-violet-400/90 hover:text-violet-300",
    footerLabelKey: "login.proPsychologistPortal",
  },
  {
    id: "psychoanalyst",
    loginPath: PSYCHOANALYST_LOGIN,
    accent: "violet",
    homePath: "/psychoanalyst",
    defaultRegisterPath: PSYCHOANALYST_REGISTER,
    taglineKey: "login.psychoanalystTagline",
    roleOnlyKey: "login.psychoanalystOnly",
    allowedRoles: ["PSYCHOANALYST"],
    oauthPortal: "psychoanalyst",
    headerIcon: "brain",
    footerLinkClass: "text-violet-400/90 hover:text-violet-300",
    footerLabelKey: "login.proPsychoanalystPortal",
  },
  {
    id: "integrative-therapist",
    loginPath: INTEGRATIVE_THERAPIST_LOGIN,
    accent: "teal",
    homePath: "/integrative-therapist",
    defaultRegisterPath: INTEGRATIVE_REGISTER,
    taglineKey: "login.integrativeTagline",
    roleOnlyKey: "login.integrativeOnly",
    allowedRoles: ["INTEGRATIVE_THERAPIST"],
    oauthPortal: "integrative-therapist",
    headerIcon: "leaf",
    footerLinkClass: "text-teal-400/90 hover:text-teal-300",
    footerLabelKey: "login.proIntegrativePortal",
  },
  {
    id: "organization",
    loginPath: ORGANIZATION_LOGIN,
    accent: "indigo",
    homePath: "/organization",
    defaultRegisterPath: ORGANIZATION_REGISTER,
    taglineKey: "login.organizationTagline",
    roleOnlyKey: "login.organizationOnly",
    allowedRoles: ["ORGANIZATION"],
    oauthPortal: "organization",
    headerIcon: "building",
    footerLinkClass: "text-indigo-400/90 hover:text-indigo-300",
    footerLabelKey: "login.proOrganizationPortal",
  },
  {
    id: "angel",
    loginPath: ANGEL_LOGIN,
    accent: "rose",
    homePath: "/humanitarian/angel",
    defaultRegisterPath: ANGEL_REGISTER,
    taglineKey: "login.angelTagline",
    roleOnlyKey: "login.angelOnly",
    allowedRoles: ["ANGEL"],
    oauthPortal: "angel",
    headerIcon: "heart",
    footerLinkClass: "text-rose-400/90 hover:text-rose-300",
    footerLabelKey: "login.proAngelPortal",
  },
];

export const PORTAL_BY_ID = Object.fromEntries(
  PORTAL_LOGINS.map((p) => [p.id, p]),
) as Record<PortalId, PortalLoginConfig>;

export const PORTAL_BY_PATH = Object.fromEntries(
  PORTAL_LOGINS.map((p) => [p.loginPath, p]),
) as Record<string, PortalLoginConfig>;

/** Unauthenticated redirect: pick the portal login matching the protected area. */
export function resolveLoginPathForPathname(pathname: string): string {
  if (pathname.startsWith("/psychologist")) return PSYCHOLOGIST_LOGIN;
  if (pathname.startsWith("/psychoanalyst")) return PSYCHOANALYST_LOGIN;
  if (pathname.startsWith("/integrative-therapist")) return INTEGRATIVE_THERAPIST_LOGIN;
  if (pathname.startsWith("/organization")) return ORGANIZATION_LOGIN;
  if (pathname.startsWith("/humanitarian/angel")) return ANGEL_LOGIN;
  return MAIN_LOGIN;
}

/** Sign-out destination for the active dashboard role / URL. */
export function resolveLoginPathForSession(
  role: string | undefined | null,
  pathname: string,
  isPsychologistPortal?: boolean,
): string {
  if (isPsychologistPortal || pathname.startsWith("/psychologist")) {
    return PSYCHOLOGIST_LOGIN;
  }
  switch (role) {
    case "PSYCHOANALYST":
      return PSYCHOANALYST_LOGIN;
    case "INTEGRATIVE_THERAPIST":
      return INTEGRATIVE_THERAPIST_LOGIN;
    case "ORGANIZATION":
      return ORGANIZATION_LOGIN;
    case "ANGEL":
      return ANGEL_LOGIN;
    case "PROFESSIONAL":
      return MAIN_LOGIN;
    default:
      return MAIN_LOGIN;
  }
}

/** Accent + back link for forgot-password flow based on originating login portal. */
export function resolveForgotPasswordContext(from: string | null | undefined): {
  loginPath: string;
  accent: LoginAccent;
} {
  const loginPath = from?.startsWith("/login") ? from : MAIN_LOGIN;
  const portal = PORTAL_BY_PATH[loginPath];
  return { loginPath, accent: portal?.accent ?? "emerald" };
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

/** Only allow internal login portal paths in email links and redirects. */
export function sanitizeLoginFrom(from: string | null | undefined): string | undefined {
  if (!from?.startsWith("/login")) return undefined;
  return from;
}

/** Derive portal login from a post-auth dashboard path. */
export function resolveLoginPathFromCallback(callbackUrl: string | null | undefined): string {
  if (!callbackUrl?.trim()) return MAIN_LOGIN;
  try {
    const raw = callbackUrl.trim();
    const path = raw.startsWith("/") ? raw.split("?")[0] : new URL(raw).pathname;
    return resolveLoginPathForPathname(path);
  } catch {
    return MAIN_LOGIN;
  }
}

export function resolveVerifyFrom(opts: {
  from?: string | null;
  callbackUrl?: string | null;
}): string {
  const safeFrom = sanitizeLoginFrom(opts.from ?? undefined);
  if (safeFrom) return safeFrom;
  return resolveLoginPathFromCallback(opts.callbackUrl);
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

export function resolveLoginPathForRegistration(
  role: string,
  professionalKind?: string | null,
): string {
  if (professionalKind === "psychologist") return PSYCHOLOGIST_LOGIN;
  switch (role) {
    case "PSYCHOANALYST":
      return PSYCHOANALYST_LOGIN;
    case "INTEGRATIVE_THERAPIST":
      return INTEGRATIVE_THERAPIST_LOGIN;
    case "ORGANIZATION":
      return ORGANIZATION_LOGIN;
    case "ANGEL":
      return ANGEL_LOGIN;
    default:
      return MAIN_LOGIN;
  }
}

export function appendEmailQueryParam(url: string, key: string, value: string): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}
