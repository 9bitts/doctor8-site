"use client";

import { SessionProvider } from "next-auth/react";
import SessionActivityKeepalive from "@/components/SessionActivityKeepalive";
import SessionInactivityWarning from "@/components/SessionInactivityWarning";

export default function AuthSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider refetchInterval={0}>
      <SessionActivityKeepalive />
      <SessionInactivityWarning />
      {children}
    </SessionProvider>
  );
}
