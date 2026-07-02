"use client";
// Sends periodic heartbeat while a professional has the dashboard or JIT video room open.

import { useEffect } from "react";

const HEARTBEAT_INTERVAL_MS = 60_000;

export default function JitSessionHeartbeat({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;

    let intervalId: ReturnType<typeof setInterval> | undefined;

    function ping() {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      fetch("/api/jit/session/heartbeat", { method: "POST" }).catch(() => {});
    }

    ping();
    intervalId = setInterval(ping, HEARTBEAT_INTERVAL_MS);

    function onVisible() {
      if (document.visibilityState === "visible") ping();
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled]);

  return null;
}
