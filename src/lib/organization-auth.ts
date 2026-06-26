// Organization access helpers ? RBAC for CNPJ clinic accounts

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import type { OrganizationMemberRole } from "@prisma/client";

const FINANCE_ROLES: OrganizationMemberRole[] = ["OWNER", "ADMIN", "FINANCE", "ACCOUNTANT"];
const TEAM_ROLES: OrganizationMemberRole[] = ["OWNER", "ADMIN", "HR"];
const RECEPTION_ROLES: OrganizationMemberRole[] = ["OWNER", "ADMIN", "RECEPTIONIST"];

export type OrganizationContext = {
  userId: string;
  organizationId: string;
  memberRole: OrganizationMemberRole;
  organization: {
    id: string;
    nomeFantasia: string;
    cnpj: string;
    currency: string;
    inviteCode: string;
  };
};

export async function getOrganizationMembership(userId: string) {
  return db.organizationMember.findFirst({
    where: { userId, status: "ACTIVE" },
    include: {
      organization: {
        select: {
          id: true,
          nomeFantasia: true,
          razaoSocial: true,
          cnpj: true,
          currency: true,
          inviteCode: true,
          slug: true,
          contactEmail: true,
          contactPhone: true,
          logoUrl: true,
          addressStreet: true,
          addressNumber: true,
          addressComplement: true,
          addressNeighborhood: true,
          addressCity: true,
          addressState: true,
          addressZip: true,
          responsibleFirstName: true,
          responsibleLastName: true,
        },
      },
    },
  });
}

export async function getOrganizationProfessionalIds(organizationId: string): Promise<string[]> {
  const links = await db.organizationProfessional.findMany({
    where: { organizationId, status: "ACTIVE" },
    select: { professionalId: true },
  });
  return links.map((l) => l.professionalId);
}

export async function requireOrganization(
  allowedRoles?: OrganizationMemberRole[],
): Promise<OrganizationContext | { error: NextResponse }> {
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

export function canManageTeam(role: OrganizationMemberRole): boolean {
  return TEAM_ROLES.includes(role);
}

export function canViewFinance(role: OrganizationMemberRole): boolean {
  return FINANCE_ROLES.includes(role);
}

export function canManageReception(role: OrganizationMemberRole): boolean {
  return RECEPTION_ROLES.includes(role);
}
