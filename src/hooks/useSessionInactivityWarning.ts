"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import {
  INACTIVITY_THRESHOLD_MS,
  INACTIVITY_WARNING_COUNTDOWN_MS,
  SESSION_INTERACTION_EVENTS,
} from "@/lib/session-inactivity-config";
import { playInactivityAlertTone } from "@/lib/session-inactivity-sound";
import { resolveLoginPathForSession } from "@/lib/auth-portals";
import { clearSensitiveClientState } from "@/lib/logout-cleanup";

const CHECK_INTERVAL_MS = 1_000;

function isInactivityWarningSuppressed(pathname: string): boolean {
  if (pathname.startsWith("/video/")) return true;
  if (pathname.startsWith("/login")) return true;
  if (pathname.startsWith("/register")) return true;
  if (pathname.startsWith("/signup")) return true;
  if (pathname.startsWith("/auth/")) return true;
  if (pathname.startsWith("/verify-")) return true;
  if (pathname.startsWith("/forgot-password")) return true;
  if (pathname.startsWith("/reset-password")) return true;
  return false;
}

export function useSessionInactivityWarning(enabled = true) {
  const { update, status } = useSession();
  const pathname = usePathname();
  const updateRef = useRef(update);
  const lastInteractionRef = useRef(Date.now());
  const warningOpenRef = useRef(false);
  const loggingOutRef = useRef(false);

  const [warningOpen, setWarningOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(
    Math.ceil(INACTIVITY_WARNING_COUNTDOWN_MS / 1000),
  );

  useEffect(() => {
    updateRef.current = update;
  }, [update]);

  useEffect(() => {
    warningOpenRef.current = warningOpen;
  }, [warningOpen]);

  const performLogout = useCallback(async () => {
    if (loggingOutRef.current) return;
    loggingOutRef.current = true;
    setWarningOpen(false);
    clearSensitiveClientState();
    await signOut({ callbackUrl: resolveLoginPathForSession() });
  }, []);

  const continueSession = useCallback(async () => {
    lastInteractionRef.current = Date.now();
    setWarningOpen(false);
    setSecondsLeft(Math.ceil(INACTIVITY_WARNING_COUNTDOWN_MS / 1000));
    try {
      await updateRef.current({ activityActive: true });
    } catch {
      /* non-blocking */
    }
  }, []);

  useEffect(() => {
    if (!enabled || status !== "authenticated") return;
    if (isInactivityWarningSuppressed(pathname)) return;

    function markInteraction() {
      if (warningOpenRef.current) return;
      lastInteractionRef.current = Date.now();
    }

    for (const event of SESSION_INTERACTION_EVENTS) {
      window.addEventListener(event, markInteraction, { passive: true });
    }

    return () => {
      for (const event of SESSION_INTERACTION_EVENTS) {
        window.removeEventListener(event, markInteraction);
      }
    };
  }, [enabled, pathname, status]);

  useEffect(() => {
    if (!enabled || status !== "authenticated") return;
    if (isInactivityWarningSuppressed(pathname)) return;

    lastInteractionRef.current = Date.now();

    const interval = setInterval(() => {
      if (warningOpenRef.current) return;

      const idleMs = Date.now() - lastInteractionRef.current;
      if (idleMs >= INACTIVITY_THRESHOLD_MS) {
        setWarningOpen(true);
        setSecondsLeft(Math.ceil(INACTIVITY_WARNING_COUNTDOWN_MS / 1000));
        playInactivityAlertTone();
      }
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [enabled, pathname, status]);

  useEffect(() => {
    if (!warningOpen) return;

    const tick = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(tick);
          void performLogout();
          return 0;
        }
        if (prev === 11) {
          playInactivityAlertTone();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(tick);
  }, [performLogout, warningOpen]);

  useEffect(() => {
    if (!enabled || status !== "authenticated") {
      setWarningOpen(false);
    }
  }, [enabled, status]);

  return {
    warningOpen,
    secondsLeft,
    continueSession,
    performLogout,
  };
}
