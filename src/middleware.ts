// src/middleware.ts
// Route protection — redirects unauthenticated users to login
// HIPAA: enforces session timeout and role-based access

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { isPathAllowedForRole, resolveRoleHome } from "@/lib/role-home";
import { resolveLoginPathForPathname } from "@/lib/auth-portals";
import { sessionProfileIncomplete } from "@/lib/user-profile-complete";
import {
  humanitarianReturnPathFromCallback,
  humanitarianReturnPathFromPathname,
  isHumanitarianPatientPath,
  stampHumanitarianOriginOnResponse,
} from "@/lib/humanitarian/origin-cookie";

const PRIVATE_CACHE_CONTROL = "private, no-store";

// Legacy per-role login URLs — unified into a single /login (kept working
// because these links were publicly shared and bookmarked).
const LEGACY_LOGIN_PATHS = [
  "/login/medico",
  "/login/paciente",
  "/login/psicologo",
  "/login/psicanalista",
  "/login/terapeuta-integrativo",
  "/login/organizacao",
  "/login/anjo",
];

// Public routes — no login required
const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/register/angel",
  "/register/professional",
  "/sos-venezuela",
  "/register/organization",
  "/register/organization/staff",
  "/register/success",
  "/callback",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/verify-account",
  "/verify-sms",
  "/signup/role",
  "/auth/magic",
  "/unauthorized",
  "/privacy",
  "/terms",
  "/hipaa",
  "/dr/",        // short links → canonical public profiles
  "/especialistas/", // public professional directory + profiles
  "/embed/",       // embeddable booking widget (iframe)
  "/share/",     // shared medical records (token-based)
  "/club/join",  // buying club invite landing (public)
  "/anfiteatro/", // virtual amphitheater invite (public → register → meeting rooms)
  "/.well-known/", // SMART on FHIR discovery
  "/fhir/",        // FHIR metadata (public read)
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => {
    // "/" must be exact — every path starts with "/"
    if (route === "/") return pathname === "/";
    return pathname === route || pathname.startsWith(route);
  });
}

function isPublicApi(pathname: string): boolean {
  return (
    pathname.startsWith("/api/auth")
    || pathname.startsWith("/api/public/")
    || pathname.startsWith("/api/fhir/smart/")
    || pathname.startsWith("/api/cnpj/")
    || pathname.startsWith("/api/buying-club/public")
    || pathname.startsWith("/api/support")
    || pathname.startsWith("/api/payments/webhook")
    || pathname.startsWith("/api/webhooks/")
    || pathname.startsWith("/api/cron/")
    || pathname.startsWith("/api/reminders/")
    || pathname.startsWith("/api/shared/")
  );
}

function isPrivateApi(pathname: string): boolean {
  return pathname.startsWith("/api/") && !isPublicApi(pathname);
}

// Role-based route prefixes
const PATIENT_ROUTES = ["/patient"];
const PROFESSIONAL_ROUTES = ["/professional"];
const PSYCHOLOGIST_ROUTES = ["/psychologist"];
const PSYCHOANALYST_ROUTES = ["/psychoanalyst"];
const INTEGRATIVE_THERAPIST_ROUTES = ["/integrative-therapist"];
const ORGANIZATION_ROUTES = ["/organization"];
const ANGEL_ROUTES = ["/humanitarian/angel"];
const VOLUNTEER_ROUTES = ["/humanitarian/volunteer"];
const HUMANITARIAN_ROUTES = ["/humanitarian"];
const ADMIN_ROUTES = ["/admin"];

const AUTHENTICATED_DASHBOARD_PREFIXES = [
  ...PATIENT_ROUTES,
  ...PROFESSIONAL_ROUTES,
  ...PSYCHOLOGIST_ROUTES,
  ...PSYCHOANALYST_ROUTES,
  ...INTEGRATIVE_THERAPIST_ROUTES,
  ...ORGANIZATION_ROUTES,
  ...HUMANITARIAN_ROUTES,
  ...ANGEL_ROUTES,
  ...VOLUNTEER_ROUTES,
  ...ADMIN_ROUTES,
];

function isAuthenticatedDashboard(pathname: string): boolean {
  return AUTHENTICATED_DASHBOARD_PREFIXES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function withPrivateCacheHeaders(
  response: NextResponse,
  pathname: string,
  authenticated: boolean,
): NextResponse {
  if (authenticated && isAuthenticatedDashboard(pathname)) {
    response.headers.set("Cache-Control", PRIVATE_CACHE_CONTROL);
  } else if (isPrivateApi(pathname)) {
    response.headers.set("Cache-Control", PRIVATE_CACHE_CONTROL);
  }
  return response;
}

function maybeStampHumanitarianOrigin(
  response: NextResponse,
  pathname: string,
): NextResponse {
  const fromPath = humanitarianReturnPathFromPathname(pathname);
  if (fromPath) {
    stampHumanitarianOriginOnResponse(response, fromPath);
  }
  return response;
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const authenticated = Boolean(session?.user);

  if (pathname.startsWith("/embed/")) {
    const res = NextResponse.next();
    res.headers.delete("X-Frame-Options");
    res.headers.set("Content-Security-Policy", "frame-ancestors *");
    return res;
  }

  if (pathname === "/register") {
    const role = req.nextUrl.searchParams.get("role");
    if (role === "PROFESSIONAL" || role === "PSYCHOANALYST" || role === "INTEGRATIVE_THERAPIST") {
      const url = req.nextUrl.clone();
      url.pathname = "/register/professional/signup";
      return NextResponse.redirect(url);
    }
  }

  if (pathname === "/register/professional") {
    const role = req.nextUrl.searchParams.get("role");
    if (role === "PROFESSIONAL" || role === "PSYCHOANALYST" || role === "INTEGRATIVE_THERAPIST") {
      const url = req.nextUrl.clone();
      url.pathname = "/register/professional/signup";
      return NextResponse.redirect(url);
    }
  }

  // Redirect legacy per-role login URLs to the unified login (preserve query).
  if (LEGACY_LOGIN_PATHS.includes(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Already-authenticated users shouldn't see the login screen — send them to
  // their dashboard so they don't get stuck on a form they don't need.
  if (pathname === "/login" && session?.user) {
    if (sessionProfileIncomplete(session.user)) {
      return NextResponse.redirect(new URL("/signup/role", req.url));
    }
    const { role, professionalSpecialty } = session.user as {
      role: string;
      professionalSpecialty?: string | null;
    };
    return NextResponse.redirect(
      new URL(resolveRoleHome(role, professionalSpecialty), req.url),
    );
  }

  if (
    session?.user
    && (pathname === "/register" || pathname.startsWith("/register/"))
    && pathname !== "/register/success"
  ) {
    if (sessionProfileIncomplete(session.user)) {
      return NextResponse.redirect(new URL("/signup/role", req.url));
    }
    const { role, professionalSpecialty } = session.user as {
      role: string;
      professionalSpecialty?: string | null;
    };
    return NextResponse.redirect(
      new URL(resolveRoleHome(role, professionalSpecialty), req.url),
    );
  }

  if (
    session?.user?.id &&
    pathname !== "/signup/role" &&
    isAuthenticatedDashboard(pathname)
  ) {
    if (sessionProfileIncomplete(session.user)) {
      return NextResponse.redirect(new URL("/signup/role", req.url));
    }
  }

  if (isPublicRoute(pathname)) {
    if (pathname === "/login" || pathname === "/register" || pathname.startsWith("/register/")) {
      return NextResponse.next();
    }
    const publicHumPath = humanitarianReturnPathFromPathname(pathname);
    if (publicHumPath) {
      return maybeStampHumanitarianOrigin(NextResponse.next(), pathname);
    }
    return NextResponse.next();
  }

  // Allow API auth routes
  if (pathname.startsWith("/api/auth")) return NextResponse.next();

  // Public read-only APIs (professional profiles, slots)
  if (pathname.startsWith("/api/public/")) return NextResponse.next();

  // FHIR SMART discovery (no PHI)
  if (pathname.startsWith("/api/fhir/smart/")) return NextResponse.next();

  // CNPJ lookup during registration
  if (pathname.startsWith("/api/cnpj/")) return NextResponse.next();

  // Public buying-club invite preview
  if (pathname.startsWith("/api/buying-club/public")) return NextResponse.next();

  // Public support chat (rate-limited in route handler)
  if (pathname.startsWith("/api/support")) return NextResponse.next();

  // Webhooks & scheduled jobs (verified inside route handlers)
  if (pathname.startsWith("/api/payments/webhook")) return NextResponse.next();
  if (pathname.startsWith("/api/webhooks/")) return NextResponse.next();
  if (pathname.startsWith("/api/cron/")) return NextResponse.next();
  if (pathname.startsWith("/api/reminders/")) return NextResponse.next();

  // Token-based shared records (no session)
  if (pathname.startsWith("/api/shared/")) return NextResponse.next();

  // Redirect to login if not authenticated (pages only — APIs return JSON)
  if (!session?.user) {
    if (pathname.startsWith("/api/")) {
      return withPrivateCacheHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        pathname,
        false,
      );
    }

    const clubToken = req.nextUrl.searchParams.get("club");
    if (clubToken && pathname.includes("/buying-club")) {
      return NextResponse.redirect(new URL(`/club/join?club=${clubToken}`, req.url));
    }
    const drugId = req.nextUrl.searchParams.get("drug");
    if (drugId && pathname.includes("/buying-club")) {
      return NextResponse.redirect(new URL(`/club/join?drug=${drugId}`, req.url));
    }

    const loginPath = resolveLoginPathForPathname(pathname);
    const loginUrl = new URL(loginPath, req.url);
    const callbackUrl = pathname + req.nextUrl.search;
    loginUrl.searchParams.set("callbackUrl", callbackUrl);
    const loginRedirect = NextResponse.redirect(loginUrl);
    return maybeStampHumanitarianOrigin(loginRedirect, pathname);
  }

  const { role, professionalSpecialty } = session.user as {
    role: string;
    professionalSpecialty?: string | null;
  };
  const isApi = pathname.startsWith("/api/");

  function denyWrongRole(): NextResponse {
    if (isApi) {
      return withPrivateCacheHeaders(
        NextResponse.json({ error: "Forbidden" }, { status: 403 }),
        pathname,
        authenticated,
      );
    }
    if (!role) {
      const loginPath = resolveLoginPathForPathname(pathname);
      return NextResponse.redirect(new URL(loginPath, req.url));
    }
    const home = resolveRoleHome(role, professionalSpecialty);
    if (pathname === home || pathname.startsWith(`${home}/`)) {
      return withPrivateCacheHeaders(NextResponse.next(), pathname, authenticated);
    }
    return NextResponse.redirect(new URL(home, req.url));
  }

  // Role-based protection
  if (ADMIN_ROUTES.some((r) => pathname.startsWith(r)) && role !== "ADMIN") {
    return denyWrongRole();
  }

  if (
    PROFESSIONAL_ROUTES.some((r) => pathname.startsWith(r)) &&
    role !== "PROFESSIONAL" &&
    role !== "ADMIN"
  ) {
    return denyWrongRole();
  }

  if (
    PSYCHOLOGIST_ROUTES.some((r) => pathname.startsWith(r)) &&
    role !== "PROFESSIONAL" &&
    role !== "ADMIN"
  ) {
    return denyWrongRole();
  }

  if (
    PSYCHOANALYST_ROUTES.some((r) => pathname.startsWith(r)) &&
    role !== "PSYCHOANALYST" &&
    role !== "ADMIN"
  ) {
    return denyWrongRole();
  }

  if (
    INTEGRATIVE_THERAPIST_ROUTES.some((r) => pathname.startsWith(r)) &&
    role !== "INTEGRATIVE_THERAPIST" &&
    role !== "ADMIN"
  ) {
    return denyWrongRole();
  }

  if (
    PATIENT_ROUTES.some((r) => pathname.startsWith(r)) &&
    role !== "PATIENT" &&
    role !== "ADMIN"
  ) {
    return denyWrongRole();
  }

  if (
    ORGANIZATION_ROUTES.some((r) => pathname.startsWith(r)) &&
    role !== "ORGANIZATION" &&
    role !== "ADMIN"
  ) {
    return denyWrongRole();
  }

  if (
    ANGEL_ROUTES.some((r) => pathname.startsWith(r)) &&
    role !== "ANGEL" &&
    role !== "ADMIN"
  ) {
    return denyWrongRole();
  }

  if (
    VOLUNTEER_ROUTES.some((r) => pathname.startsWith(r)) &&
    role !== "PROFESSIONAL" &&
    role !== "PSYCHOANALYST" &&
    role !== "INTEGRATIVE_THERAPIST" &&
    role !== "ADMIN"
  ) {
    return denyWrongRole();
  }

  if (role === "ANGEL" && isHumanitarianPatientPath(pathname)) {
    const home = resolveRoleHome(role, professionalSpecialty);
    return NextResponse.redirect(new URL(home, req.url));
  }

  return withPrivateCacheHeaders(NextResponse.next(), pathname, authenticated);
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|icons/|branding/|manifest.webmanifest|api/webhooks).*)",
  ],
};
