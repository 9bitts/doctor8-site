"use client";

import { syncPushSubscription } from "@/lib/push-subscribe-client";
import { useEffect } from "react";

/** Registers push subscription when the user already granted notification permission. */
export default function PushSubscribe() {
  useEffect(() => {
    syncPushSubscription();
  }, []);

  return null;
}
