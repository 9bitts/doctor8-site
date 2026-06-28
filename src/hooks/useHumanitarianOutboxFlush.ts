"use client";

import { useEffect, useState } from "react";
import { flushHumanitarianOutbox } from "@/lib/humanitarian/outbox";

/** Auto-flush humanitarian outbox when connectivity returns. */
export function useHumanitarianOutboxFlush(onFlushed?: () => void) {
  const [pending, setPending] = useState(0);

  useEffect(() => {
    async function run() {
      const n = await flushHumanitarianOutbox();
      if (n > 0) onFlushed?.();
      setPending(0);
    }

    const sync = () => {
      if (navigator.onLine) run();
    };

    sync();
    window.addEventListener("online", sync);
    return () => window.removeEventListener("online", sync);
  }, [onFlushed]);
}
