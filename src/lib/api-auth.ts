// Unified API route authentication helpers.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { UserRole, OrganizationMemberRole } from "@prisma/client";
import {
  getOrganizationMembership,
  type OrganizationContext,
} from "@/lib/organization-auth";

export type ApiError = { error: NextResponse };

type AuthSession = NonNullable<Awaited<ReturnType<typeof auth>>>;

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
  return { session, userId: session.user.id };
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
