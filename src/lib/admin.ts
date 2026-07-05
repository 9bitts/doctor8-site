// src/lib/admin.ts
// Helper to guard admin-only API routes and pages.
// Returns the session if the user is an ADMIN, otherwise null.
import { auth } from "@/lib/auth";

export const PATIENT_ADMIN_ROLES = ["ADMIN", "ANGEL"] as const;
export type PatientAdminRole = (typeof PATIENT_ADMIN_ROLES)[number];

export function isPatientAdminRole(role: string | undefined | null): role is PatientAdminRole {
  return role === "ADMIN" || role === "ANGEL";
}

/** Admin patient monitoring pages and APIs — ADMIN and ANGEL volunteers. */
export function isPatientAdminPath(pathname: string): boolean {
  return (
    pathname === "/admin/patients"
    || pathname.startsWith("/admin/patients/")
    || pathname.startsWith("/api/admin/patients")
  );
}

/** Angel dashboard pages (patient monitoring + follow-up). */
export function isAngelDashboardPath(pathname: string): boolean {
  return (
    isPatientAdminPath(pathname)
    || pathname === "/admin/angel"
    || pathname.startsWith("/admin/angel/")
  );
}

export async function getAdminSession() {
  const session = await auth();
  if (!session?.user) return null;
  if (session.user.role !== "ADMIN") return null;
  return session;
}

/** Patient monitoring dashboard — full admin access or Angel (patients only). */
export async function getPatientAdminSession() {
  const session = await auth();
  if (!session?.user) return null;
  if (!isPatientAdminRole(session.user.role)) return null;
  return session;
}
