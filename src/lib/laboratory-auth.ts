import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import type { LaboratoryMemberRole } from "@prisma/client";
import {
  isLaboratoryActive,
  LABORATORY_WRITE_BLOCKED_MESSAGE,
} from "@/lib/laboratory-portal";

const ADMIN_ROLES: LaboratoryMemberRole[] = ["OWNER", "ADMIN"];

export { isLaboratoryActive, LABORATORY_WRITE_BLOCKED_MESSAGE };

export type RequireLaboratoryOptions = {
  requireActive?: boolean;
};

export type LaboratoryContext = {
  userId: string;
  laboratoryId: string;
  memberRole: LaboratoryMemberRole;
  lab: {
    id: string;
    nomeFantasia: string;
    cnpj: string;
    slug: string;
    status: string;
    labType: string;
  };
};

export async function getLaboratoryMembership(userId: string) {
  return db.laboratoryMember.findFirst({
    where: { userId, status: "ACTIVE" },
    include: {
      laboratory: {
        select: {
          id: true,
          nomeFantasia: true,
          razaoSocial: true,
          cnpj: true,
          slug: true,
          status: true,
          labType: true,
          contactEmail: true,
          contactPhone: true,
          addressStreet: true,
          addressNumber: true,
          addressComplement: true,
          addressNeighborhood: true,
          addressCity: true,
          addressState: true,
          addressZip: true,
          platformFeeCents: true,
          responsibleFirstName: true,
          responsibleLastName: true,
        },
      },
    },
  });
}

export async function requireLaboratory(
  allowedRoles?: LaboratoryMemberRole[],
  opts?: RequireLaboratoryOptions,
): Promise<LaboratoryContext | { error: NextResponse }> {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.user.role !== "LABORATORY" && session.user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const membership = await getLaboratoryMembership(session.user.id);
  if (!membership) {
    return { error: NextResponse.json({ error: "Laboratory not found" }, { status: 404 }) };
  }

  if (allowedRoles && !allowedRoles.includes(membership.role) && session.user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  if (
    opts?.requireActive &&
    !isLaboratoryActive(membership.laboratory.status) &&
    session.user.role !== "ADMIN"
  ) {
    return {
      error: NextResponse.json({ error: LABORATORY_WRITE_BLOCKED_MESSAGE }, { status: 403 }),
    };
  }

  return {
    userId: session.user.id,
    laboratoryId: membership.laboratoryId,
    memberRole: membership.role,
    lab: {
      id: membership.laboratory.id,
      nomeFantasia: membership.laboratory.nomeFantasia,
      cnpj: membership.laboratory.cnpj,
      slug: membership.laboratory.slug,
      status: membership.laboratory.status,
      labType: membership.laboratory.labType,
    },
  };
}

export function canManageLaboratoryExams(role: LaboratoryMemberRole): boolean {
  return ADMIN_ROLES.includes(role) || role === "STAFF";
}

export function canManageLaboratorySettings(role: LaboratoryMemberRole): boolean {
  return ADMIN_ROLES.includes(role);
}
