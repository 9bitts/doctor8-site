"use client";

import { useEffect } from "react";

/** Scroll to #appt-{id} or ?id= after notifications / reminders deep links. */
export default function AppointmentsAnchorScroll({
  queryId,
  hashPrefix = "appt-",
  ready = true,
}: {
  queryId?: string | null;
  hashPrefix?: string;
  ready?: boolean;
}) {
  useEffect(() => {
    if (!ready) return;

    const fromQuery = queryId?.trim();
    const fromHash =
      typeof window !== "undefined" && window.location.hash.startsWith(`#${hashPrefix}`)
        ? window.location.hash.slice(1)
        : null;
    const targetId = fromQuery ? `${hashPrefix}${fromQuery}` : fromHash;
    if (!targetId) return;

    let cancelled = false;
    let attempts = 0;

    const tryScroll = () => {
      if (cancelled) return;
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-brand-400", "ring-offset-2");
        window.setTimeout(() => {
          el.classList.remove("ring-2", "ring-brand-400", "ring-offset-2");
        }, 4000);
        return;
      }
      attempts += 1;
      if (attempts < 12) window.setTimeout(tryScroll, 250);
    };

    tryScroll();
    return () => {
      cancelled = true;
    };
  }, [queryId, hashPrefix, ready]);

  return null;
}
