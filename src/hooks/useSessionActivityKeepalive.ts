"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

const EXTEND_INTERVAL_MS = 60_000;
const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "scroll"] as const;

/** Keeps auth session alive while the user is active (sliding inactivity window). */
export function useSessionActivityKeepalive(enabled = true) {
  const { update, status } = useSession();
  const updateRef = useRef(update);
  const lastExtendRef = useRef(0);
  const lastActivityRef = useRef(Date.now());
  const pathname = usePathname();

  useEffect(() => {
    updateRef.current = update;
  }, [update]);

  useEffect(() => {
    if (!enabled || status !== "authenticated") return;

    function markActivity() {
      lastActivityRef.current = Date.now();
    }

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, markActivity, { passive: true });
    }

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, markActivity);
      }
    };
  }, [enabled, status]);

  useEffect(() => {
    if (!enabled || status !== "authenticated") return;

    async function maybeExtend() {
      const now = Date.now();
      if (now - lastExtendRef.current < EXTEND_INTERVAL_MS) return;
      if (now - lastActivityRef.current > EXTEND_INTERVAL_MS) return;

      lastExtendRef.current = now;
      try {
        await updateRef.current({ activityActive: true });
      } catch {
        /* non-blocking */
      }
    }

    lastActivityRef.current = Date.now();
    void maybeExtend();

    const interval = setInterval(() => void maybeExtend(), EXTEND_INTERVAL_MS);

    function onVisible() {
      if (document.visibilityState === "visible") {
        lastActivityRef.current = Date.now();
        void maybeExtend();
      }
    }

    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, status, pathname]);
}
