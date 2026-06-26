// src/middleware.ts
// Route protection — redirects unauthenticated users to login
// HIPAA: enforces session timeout and role-based access

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Public routes — no login required
const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/register/organization",
  "/register/organization/staff",
  "/callback",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/auth/magic",
  "/privacy",
  "/terms",
  "/hipaa",
  "/dr/",        // short links → canonical public profiles
  "/especialistas/", // public professional directory + profiles
  "/embed/",       // embeddable booking widget (iframe)
  "/share/",     // shared medical records (token-based)
  "/club/join",  // buying club invite landing (public)
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => {
    // "/" must be exact — every path starts with "/"
    if (route === "/") return pathname === "/";
    return pathname === route || pathname.startsWith(route);
  });
}

// Role-based route prefixes
const PATIENT_ROUTES = ["/patient"];
const PROFESSIONAL_ROUTES = ["/professional"];
const PSYCHOANALYST_ROUTES = ["/psychoanalyst"];
const ORGANIZATION_ROUTES = ["/organization"];
const ADMIN_ROUTES = ["/admin"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  if (pathname.startsWith("/embed/")) {
    const res = NextResponse.next();
    res.headers.delete("X-Frame-Options");
    res.headers.set("Content-Security-Policy", "frame-ancestors *");
    return res;
  }

  if (isPublicRoute(pathname)) return NextResponse.next();

  // Allow API auth routes
  if (pathname.startsWith("/api/auth")) return NextResponse.next();

  // Public organization staff registration
  if (pathname.startsWith("/api/auth/register-organization-staff")) return NextResponse.next();

  // Public read-only APIs (professional profiles, slots)
  if (pathname.startsWith("/api/public/")) return NextResponse.next();

  // CNPJ lookup during registration
  if (pathname.startsWith("/api/cnpj/")) return NextResponse.next();

  // Public buying-club invite preview
  if (pathname.startsWith("/api/buying-club/public")) return NextResponse.next();

  // Redirect to login if not authenticated
  if (!session?.user) {
    const clubToken = req.nextUrl.searchParams.get("club");
    if (clubToken && pathname.includes("/buying-club")) {
      return NextResponse.redirect(new URL(`/club/join?club=${clubToken}`, req.url));
    }
    const drugId = req.nextUrl.searchParams.get("drug");
    if (drugId && pathname.includes("/buying-club")) {
      return NextResponse.redirect(new URL(`/club/join?drug=${drugId}`, req.url));
    }

    const loginUrl = new URL("/login", req.url);
    const callbackUrl = pathname + req.nextUrl.search;
    loginUrl.searchParams.set("callbackUrl", callbackUrl);
    return NextResponse.redirect(loginUrl);
  }

  const { role } = session.user as { role: string };

  // Role-based protection
  if (ADMIN_ROUTES.some((r) => pathname.startsWith(r)) && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  if (
    PROFESSIONAL_ROUTES.some((r) => pathname.startsWith(r)) &&
    role !== "PROFESSIONAL" &&
    role !== "ADMIN"
  ) {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  if (
    PSYCHOANALYST_ROUTES.some((r) => pathname.startsWith(r)) &&
    role !== "PSYCHOANALYST" &&
    role !== "ADMIN"
  ) {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  if (
    PATIENT_ROUTES.some((r) => pathname.startsWith(r)) &&
    role !== "PATIENT" &&
    role !== "ADMIN"
  ) {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  if (
    ORGANIZATION_ROUTES.some((r) => pathname.startsWith(r)) &&
    role !== "ORGANIZATION" &&
    role !== "ADMIN"
  ) {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
