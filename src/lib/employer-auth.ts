// Employer (B2B NR-1) access helpers — RBAC for corporate accounts

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { employerCompanyIdFromCookies } from "@/lib/work-context";
import type { EmployerMemberRole } from "@prisma/client";

const SST_ROLES: EmployerMemberRole[] = ["OWNER", "ADMIN", "SST"];
const HR_ROLES: EmployerMemberRole[] = ["OWNER", "ADMIN", "HR", "SST"];
const ADMIN_ROLES: EmployerMemberRole[] = ["OWNER", "ADMIN"];

const companySelect = {
  id: true,
  nomeFantasia: true,
  razaoSocial: true,
  cnpj: true,
  slug: true,
  inviteCode: true,
  contactEmail: true,
  contactPhone: true,
  logoUrl: true,
  companySize: true,
  employeeCount: true,
  grauRisco: true,
  nr1ComplianceScore: true,
  lastPgrReviewAt: true,
  addressCity: true,
  addressState: true,
  responsibleFirstName: true,
  responsibleLastName: true,
} as const;

export type EmployerContext = {
  userId: string;
  employerCompanyId: string;
  memberRole: EmployerMemberRole;
  company: {
    id: string;
    nomeFantasia: string;
    cnpj: string;
    slug: string;
    inviteCode: string;
  };
};

export async function getEmployerMemberships(userId: string) {
  return db.employerMember.findMany({
    where: { userId, status: "ACTIVE" },
    include: { employerCompany: { select: companySelect } },
    orderBy: { invitedAt: "asc" },
  });
}

export async function getEmployerMembership(
  userId: string,
  selectedCompanyId?: string | null,
) {
  const memberships = await getEmployerMemberships(userId);
  if (!memberships.length) return null;

  if (selectedCompanyId) {
    const match = memberships.find((m) => m.employerCompanyId === selectedCompanyId);
    if (match) return match;
  }

  return memberships[0];
}

async function resolveSelectedEmployerCompanyId(explicitId?: string | null): Promise<string | undefined> {
  if (explicitId?.trim()) return explicitId.trim();
  const cookieStore = await cookies();
  return employerCompanyIdFromCookies((name) => cookieStore.get(name)?.value);
}

export async function requireEmployer(
  allowedRoles?: EmployerMemberRole[],
  selectedCompanyId?: string | null,
): Promise<EmployerContext | { error: NextResponse }> {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.user.role !== "EMPLOYER" && session.user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const companyId = await resolveSelectedEmployerCompanyId(selectedCompanyId);
  const membership = await getEmployerMembership(session.user.id, companyId);
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

export function canManageEmployerTeam(role: EmployerMemberRole): boolean {
  return ADMIN_ROLES.includes(role);
}

export function canManageNr1(role: EmployerMemberRole): boolean {
  return SST_ROLES.includes(role);
}

/** Step 1 master data: sectors, functions, GHE structure — RH + SST */
export function canManageStructure(role: EmployerMemberRole): boolean {
  return HR_ROLES.includes(role);
}

/** Step 3 PCMSO matrix — typically physician via portal; company SST/admin may draft */
export function canManagePcmso(role: EmployerMemberRole): boolean {
  return SST_ROLES.includes(role) || role === "HR";
}

/** Step 4 eSocial / CAT / certificates — RH + SST */
export function canManageEsocial(role: EmployerMemberRole): boolean {
  return HR_ROLES.includes(role);
}

export function canManageWorkforce(role: EmployerMemberRole): boolean {
  return HR_ROLES.includes(role);
}

export function canViewEmployerReports(role: EmployerMemberRole): boolean {
  return HR_ROLES.includes(role) || role === "VIEWER";
}

export { resolveSelectedEmployerCompanyId };
