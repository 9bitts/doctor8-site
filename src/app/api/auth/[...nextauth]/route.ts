// src/app/api/auth/[...nextauth]/route.ts
// This file exposes the NextAuth handlers as API routes.
// Without it, /api/auth/* endpoints (signin, callback, session) return 404.
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
