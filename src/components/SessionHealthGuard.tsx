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

const REDIRECT_CONFIRM_MS = 1_500;

function isDashboardPath(pathname: string): boolean {
  return DASHBOARD_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Redirects to login when the client detects an expired session on protected routes. */
export default function SessionHealthGuard() {
  const { status } = useSession();
  const pathname = usePathname();
  const wasAuthenticatedRef = useRef(false);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      wasAuthenticatedRef.current = true;
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
      return;
    }

    if (status === "loading") return;
    if (!wasAuthenticatedRef.current) return;
    if (!isDashboardPath(pathname)) return;
    if (redirectTimerRef.current) return;

    redirectTimerRef.current = setTimeout(() => {
      redirectTimerRef.current = null;
      const returnUrl = pathname + window.location.search;
      const loginPath = resolveLoginPathForSession(undefined, pathname);
      const loginUrl = `${loginPath}?callbackUrl=${encodeURIComponent(returnUrl)}&reason=session_expired`;
      window.location.replace(loginUrl);
    }, REDIRECT_CONFIRM_MS);

    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
    };
  }, [pathname, status]);

  return null;
}
