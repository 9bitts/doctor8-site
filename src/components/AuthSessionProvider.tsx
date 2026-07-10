"use client";

import { SessionProvider } from "next-auth/react";
import SessionActivityKeepalive from "@/components/SessionActivityKeepalive";
import SessionInactivityWarning from "@/components/SessionInactivityWarning";
import SessionHealthGuard from "@/components/SessionHealthGuard";
import { SESSION_UPDATE_AGE_SECONDS } from "@/lib/session-inactivity-config";

export default function AuthSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider refetchInterval={SESSION_UPDATE_AGE_SECONDS}>
      <SessionHealthGuard />
      <SessionActivityKeepalive />
      <SessionInactivityWarning />
      {children}
    </SessionProvider>
  );
}
