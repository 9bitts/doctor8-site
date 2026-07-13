// src/lib/admin.ts
// Helper to guard admin-only API routes and pages.
// Returns the session if the user is an ADMIN, otherwise null.
import { auth } from "@/lib/auth";

/** Admin patient monitoring pages and APIs — ADMIN only. */
export function isPatientAdminPath(pathname: string): boolean {
  return (
    pathname === "/admin/patients"
    || pathname.startsWith("/admin/patients/")
    || pathname.startsWith("/api/admin/patients")
  );
}

/** Angel dashboard pages (follow-up + guide). */
export function isAngelDashboardPath(pathname: string): boolean {
  return (
    pathname === "/admin/angel"
    || pathname.startsWith("/admin/angel/")
  );
}

export async function getAdminSession() {
  const session = await auth();
  if (!session?.user) return null;
  if (session.user.role !== "ADMIN") return null;
  return session;
}

/** Angel volunteer dashboard session — ANGEL and ADMIN. */
export async function getAngelSession() {
  const session = await auth();
  if (!session?.user) return null;
  if (session.user.role !== "ANGEL" && session.user.role !== "ADMIN") return null;
  return session;
}
