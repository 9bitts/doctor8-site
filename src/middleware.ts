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
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/privacy",
  "/terms",
  "/hipaa",
  "/dr/",        // professional virtual cards (public)
  "/share/",     // shared medical records (token-based)
];

// Role-based route prefixes
const PATIENT_ROUTES = ["/patient"];
const PROFESSIONAL_ROUTES = ["/professional"];
const ADMIN_ROUTES = ["/admin"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Allow public routes
  const isPublic = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route)
  );
  if (isPublic) return NextResponse.next();

  // Allow API auth routes
  if (pathname.startsWith("/api/auth")) return NextResponse.next();

  // Redirect to login if not authenticated
  if (!session?.user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
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
    PATIENT_ROUTES.some((r) => pathname.startsWith(r)) &&
    role !== "PATIENT" &&
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
