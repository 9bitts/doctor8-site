"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { resolveLoginPathForSession } from "@/lib/auth-portals";

const DASHBOARD_PREFIXES = [
  "/patient",
  "/professional",
  "/psychologist",
  "/psychoanalyst",
  "/integrative-therapist",
  "/nutritionist",
  "/nurse",
  "/pharmacist",
  "/dentist",
  "/admin",
  "/organization",
  "/employer",
  "/occupational-physician",
  "/pharmacy-store",
  "/laboratory",
  "/pharmacy-network",
  "/humanitarian",
  "/video",
] as const;

function isDashboardPath(pathname: string): boolean {
  return DASHBOARD_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Redirects to login when the client detects an expired session on protected routes. */
export default function SessionHealthGuard() {
  const { status, data: session } = useSession();
  const pathname = usePathname();
  const redirectingRef = useRef(false);

  useEffect(() => {
    if (status !== "unauthenticated") {
      redirectingRef.current = false;
      return;
    }
    if (!isDashboardPath(pathname)) return;
    if (redirectingRef.current) return;

    redirectingRef.current = true;
    const returnUrl = pathname + window.location.search;
    const loginPath = resolveLoginPathForSession(undefined, pathname);
    const loginUrl = `${loginPath}?callbackUrl=${encodeURIComponent(returnUrl)}&reason=session_expired`;
    window.location.replace(loginUrl);
  }, [pathname, session?.user?.role, status]);

  return null;
}
