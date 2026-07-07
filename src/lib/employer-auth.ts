// Employer (B2B NR-1) access helpers — RBAC for corporate accounts

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import type { EmployerMemberRole } from "@prisma/client";

const SST_ROLES: EmployerMemberRole[] = ["OWNER", "ADMIN", "SST"];
const HR_ROLES: EmployerMemberRole[] = ["OWNER", "ADMIN", "HR", "SST"];
const ADMIN_ROLES: EmployerMemberRole[] = ["OWNER", "ADMIN"];

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

export async function getEmployerMembership(userId: string) {
  return db.employerMember.findFirst({
    where: { userId, status: "ACTIVE" },
    include: {
      employerCompany: {
        select: {
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
        },
      },
    },
  });
}

export async function requireEmployer(
  allowedRoles?: EmployerMemberRole[],
): Promise<EmployerContext | { error: NextResponse }> {
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

export function canManageEmployerTeam(role: EmployerMemberRole): boolean {
  return ADMIN_ROLES.includes(role);
}

export function canManageNr1(role: EmployerMemberRole): boolean {
  return SST_ROLES.includes(role);
}

export function canManageWorkforce(role: EmployerMemberRole): boolean {
  return HR_ROLES.includes(role);
}

export function canViewEmployerReports(role: EmployerMemberRole): boolean {
  return HR_ROLES.includes(role) || role === "VIEWER";
}
