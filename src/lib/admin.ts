// src/lib/admin.ts
// Helper to guard admin-only API routes and pages.
// Returns the session if the user is an ADMIN, otherwise null.
import { auth } from "@/lib/auth";

export async function getAdminSession() {
  const session = await auth();
  if (!session?.user) return null;
  if (session.user.role !== "ADMIN") return null;
  return session;
}
