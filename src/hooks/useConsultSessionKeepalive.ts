"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import type { VideoConsultData } from "@/components/VideoConsultRoom";

const KEEPALIVE_MS = 4 * 60 * 1000;
const MIN_PING_GAP_MS = 60_000;
const MIN_SESSION_UPDATE_GAP_MS = KEEPALIVE_MS - 30_000;

function consultKeyFromData(data: VideoConsultData | null): string | null {
  if (!data) return null;
  const kind = data.kind || "appointment";
  const id = data.appointmentId || data.queueId || data.entryId;
  if (!id) return null;
  return `${kind}:${id}`;
}

/** Keeps auth session alive while user is in an active video consultation. */
export function useConsultSessionKeepalive(
  data: VideoConsultData | null,
  enabled = true,
) {
  const { update, status } = useSession();
  const updateRef = useRef(update);
  const lastPingRef = useRef(0);
  const lastSessionUpdateRef = useRef(0);
  const consecutive403Ref = useRef(0);
  const consultKey = consultKeyFromData(data);

  useEffect(() => {
    updateRef.current = update;
  }, [update]);

  useEffect(() => {
    if (!enabled || !consultKey || status !== "authenticated") return;

    const sep = consultKey.indexOf(":");
    const kind = consultKey.slice(0, sep);
    const id = consultKey.slice(sep + 1);

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
      if (now - lastPingRef.current < MIN_PING_GAP_MS) return;
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
        if (!res.ok) return;

        if (now - lastSessionUpdateRef.current < MIN_SESSION_UPDATE_GAP_MS) return;
        lastSessionUpdateRef.current = now;
        await updateRef.current({ consultActive: true });
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
  }, [consultKey, enabled, status]);
}
