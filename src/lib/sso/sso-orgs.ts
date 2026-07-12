import { db } from "@/lib/db";

export type B2BOrganizationOption = {
  id: string;
  name: string;
  cnpj: string;
  memberRole: string;
};

const B2B_ROLES = new Set([
  "ORGANIZATION",
  "EMPLOYER",
  "PHARMACY_STORE",
  "LABORATORY",
]);

export function isB2BSsoRole(role: string): boolean {
  return B2B_ROLES.has(role);
}

export async function listB2BOrganizations(
  userId: string,
  role: string,
): Promise<B2BOrganizationOption[]> {
  if (!B2B_ROLES.has(role)) return [];

  switch (role) {
    case "ORGANIZATION": {
      const members = await db.organizationMember.findMany({
        where: { userId, status: "ACTIVE" },
        orderBy: { joinedAt: "asc" },
        include: { organization: true },
      });
      return members.map((m) => ({
        id: m.organizationId,
        name: m.organization.nomeFantasia,
        cnpj: m.organization.cnpj,
        memberRole: m.role,
      }));
    }
    case "EMPLOYER": {
      const members = await db.employerMember.findMany({
        where: { userId, status: "ACTIVE" },
        orderBy: { joinedAt: "asc" },
        include: { employerCompany: true },
      });
      return members.map((m) => ({
        id: m.employerCompanyId,
        name: m.employerCompany.nomeFantasia,
        cnpj: m.employerCompany.cnpj,
        memberRole: m.role,
      }));
    }
    case "PHARMACY_STORE": {
      const members = await db.pharmacyStoreMember.findMany({
        where: { userId, status: "ACTIVE" },
        orderBy: { joinedAt: "asc" },
        include: { pharmacyStore: true },
      });
      return members.map((m) => ({
        id: m.pharmacyStoreId,
        name: m.pharmacyStore.nomeFantasia,
        cnpj: m.pharmacyStore.cnpj,
        memberRole: m.role,
      }));
    }
    case "LABORATORY": {
      const members = await db.laboratoryMember.findMany({
        where: { userId, status: "ACTIVE" },
        orderBy: { joinedAt: "asc" },
        include: { laboratory: true },
      });
      return members.map((m) => ({
        id: m.laboratoryId,
        name: m.laboratory.nomeFantasia,
        cnpj: m.laboratory.cnpj,
        memberRole: m.role,
      }));
    }
    default:
      return [];
  }
}

export async function userHasB2BOrganizationAccess(
  userId: string,
  role: string,
  organizationId: string,
): Promise<boolean> {
  const orgs = await listB2BOrganizations(userId, role);
  return orgs.some((org) => org.id === organizationId);
}
