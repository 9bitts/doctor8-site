"use client";

import { SessionProvider } from "next-auth/react";
import SessionActivityKeepalive from "@/components/SessionActivityKeepalive";

export default function AuthSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider refetchInterval={0}>
      <SessionActivityKeepalive />
      {children}
    </SessionProvider>
  );
}
