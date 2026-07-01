"use client";

import { useEffect } from "react";
import PwaUpdatePrompt from "@/components/humanitarian/PwaUpdatePrompt";

/** Registers the humanitarian PWA service worker (no-op if unsupported). */
export default function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      /* private mode or blocked */
    });
  }, []);

  return <PwaUpdatePrompt />;
}
