"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import type { VideoConsultData } from "@/components/VideoConsultRoom";

const KEEPALIVE_MS = 4 * 60 * 1000;

/** Keeps auth session alive while user is in an active video consultation. */
export function useConsultSessionKeepalive(data: VideoConsultData | null) {
  const { update, status } = useSession();
  const updateRef = useRef(update);
  const lastPingRef = useRef(0);
  const consecutive403Ref = useRef(0);

  useEffect(() => {
    updateRef.current = update;
  }, [update]);

  useEffect(() => {
    if (!data || status !== "authenticated") return;

    const kind = data.kind || "appointment";
    const id = data.appointmentId || data.queueId || data.entryId;
    if (!id) return;

    let interval: ReturnType<typeof setInterval> | null = null;
    let stopped = false;

    const stopKeepalive = () => {
      stopped = true;
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const ping = async () => {
      if (stopped) return;

      const now = Date.now();
      if (now - lastPingRef.current < 60_000) return;
      lastPingRef.current = now;

      try {
        const res = await fetch("/api/session/consult-keepalive", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind, id }),
        });

        if (res.status === 403) {
          consecutive403Ref.current += 1;
          if (consecutive403Ref.current >= 2) {
            stopKeepalive();
          }
          return;
        }

        consecutive403Ref.current = 0;
        if (res.ok) await updateRef.current({ consultActive: true });
      } catch {
        /* non-blocking */
      }
    };

    void ping();
    interval = setInterval(() => void ping(), KEEPALIVE_MS);

    return () => {
      stopKeepalive();
      consecutive403Ref.current = 0;
    };
  }, [data, status]);
}
