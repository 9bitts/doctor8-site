"use client";

import { useSessionActivityKeepalive } from "@/hooks/useSessionActivityKeepalive";

export default function SessionActivityKeepalive() {
  useSessionActivityKeepalive(true);
  return null;
}
