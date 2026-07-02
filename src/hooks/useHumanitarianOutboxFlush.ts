"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { flushHumanitarianOutbox } from "@/lib/humanitarian/outbox";

/** Auto-flush humanitarian outbox when connectivity returns. */
export function useHumanitarianOutboxFlush(onFlushed?: () => void) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [pending, setPending] = useState(0);

  useEffect(() => {
    if (!userId) return;

    async function run() {
      if (!userId) return;
      const n = await flushHumanitarianOutbox(userId);
      if (n > 0) onFlushed?.();
      setPending(0);
    }

    const sync = () => {
      if (navigator.onLine) run();
    };

    sync();
    window.addEventListener("online", sync);
    return () => window.removeEventListener("online", sync);
  }, [onFlushed, userId]);
}
