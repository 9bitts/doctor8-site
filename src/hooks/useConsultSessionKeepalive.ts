"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import type { VideoConsultData } from "@/components/VideoConsultRoom";

const KEEPALIVE_MS = 4 * 60 * 1000;

/** Keeps auth session alive while user is in an active video consultation. */
export function useConsultSessionKeepalive(data: VideoConsultData | null) {
  const { update, status } = useSession();

  useEffect(() => {
    if (!data || status !== "authenticated") return;

    const kind = data.kind || "appointment";
    const id = data.appointmentId || data.queueId || data.entryId;
    if (!id) return;

    const ping = async () => {
      try {
        const res = await fetch("/api/session/consult-keepalive", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind, id }),
        });
        if (res.ok) await update({ consultActive: true });
      } catch {
        /* non-blocking */
      }
    };

    void ping();
    const interval = setInterval(() => void ping(), KEEPALIVE_MS);
    return () => clearInterval(interval);
  }, [data, status, update]);
}
