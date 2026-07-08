// Unified API route authentication helpers.

import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { UserRole, OrganizationMemberRole, EmployerMemberRole } from "@prisma/client";
import {
  getOrganizationMembership,
  type OrganizationContext,
} from "@/lib/organization-auth";
import {
  getEmployerMembership,
  type EmployerContext,
} from "@/lib/employer-auth";

export type ApiError = { error: NextResponse };

type AuthSession = Session;

export function isApiError(v: unknown): v is ApiError {
  return typeof v === "object" && v !== null && "error" in v;
}

/** Requires authenticated session; optional role allowlist (ADMIN always passes). */
export async function requireAuth(
  allowedRoles?: UserRole[],
): Promise<{ session: AuthSession; userId: string } | ApiError> {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (
    allowedRoles &&
    !allowedRoles.includes(session.user.role as UserRole) &&
    session.user.role !== "ADMIN"
  ) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session: session as AuthSession, userId: session.user.id };
}

export async function requirePatient(): Promise<
  { session: AuthSession; userId: string; patientProfileId: string } | ApiError
> {
  const ctx = await requireAuth(["PATIENT"]);
  if (isApiError(ctx)) return ctx;

  const profile = await db.patientProfile.findUnique({
    where: { userId: ctx.userId },
    select: { id: true },
  });
  if (!profile) {
    return { error: NextResponse.json({ error: "No profile" }, { status: 404 }) };
  }
  return { ...ctx, patientProfileId: profile.id };
}

export async function requireProfessionalApi(): Promise<
  | { session: AuthSession; userId: string; professional: { id: string; userId: string; firstName: string; lastName: string } }
  | ApiError
> {
  const ctx = await requireAuth(["PROFESSIONAL"]);
  if (isApiError(ctx)) return ctx;

  const professional = await db.professionalProfile.findUnique({
    where: { userId: ctx.userId },
    select: { id: true, userId: true, firstName: true, lastName: true },
  });
  if (!professional) {
    return { error: NextResponse.json({ error: "No profile" }, { status: 404 }) };
  }
  return { session: ctx.session, userId: ctx.userId, professional };
}

export async function requireOrganizationApi(
  allowedRoles?: OrganizationMemberRole[],
): Promise<OrganizationContext | ApiError> {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.user.role !== "ORGANIZATION" && session.user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const membership = await getOrganizationMembership(session.user.id);
  if (!membership) {
    return { error: NextResponse.json({ error: "Organization not found" }, { status: 404 }) };
  }
  if (allowedRoles && !allowedRoles.includes(membership.role) && session.user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return {
    userId: session.user.id,
    organizationId: membership.organizationId,
    memberRole: membership.role,
    organization: {
      id: membership.organization.id,
      nomeFantasia: membership.organization.nomeFantasia,
      cnpj: membership.organization.cnpj,
      currency: membership.organization.currency,
      inviteCode: membership.organization.inviteCode,
    },
  };
}

export async function requireEmployerApi(
  allowedRoles?: EmployerMemberRole[],
): Promise<EmployerContext | ApiError> {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.user.role !== "EMPLOYER" && session.user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const membership = await getEmployerMembership(session.user.id);
  if (!membership) {
    return { error: NextResponse.json({ error: "Employer company not found" }, { status: 404 }) };
  }
  if (allowedRoles && !allowedRoles.includes(membership.role) && session.user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return {
    userId: session.user.id,
    employerCompanyId: membership.employerCompanyId,
    memberRole: membership.role,
    company: {
      id: membership.employerCompany.id,
      nomeFantasia: membership.employerCompany.nomeFantasia,
      cnpj: membership.employerCompany.cnpj,
      slug: membership.employerCompany.slug,
      inviteCode: membership.employerCompany.inviteCode,
    },
  };
}

export async function requireOccupationalPhysicianApi(): Promise<
  | { userId: string; links: Awaited<ReturnType<typeof import("@/lib/occupational-physician-auth").getOccupationalPhysicianLinks>> }
  | ApiError
> {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (
    session.user.role !== "OCCUPATIONAL_PHYSICIAN" &&
    session.user.role !== "ADMIN"
  ) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const { getOccupationalPhysicianLinks } = await import("@/lib/occupational-physician-auth");
  const links = await getOccupationalPhysicianLinks(session.user.id);
  if (links.length === 0 && session.user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "No company links" }, { status: 404 }) };
  }

  return { userId: session.user.id, links };
}
