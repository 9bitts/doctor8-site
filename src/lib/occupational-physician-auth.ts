import { db } from "@/lib/db";

export type OccupationalPhysicianLink = {
  id: string;
  employerCompanyId: string;
  email: string;
  fullName: string | null;
  crm: string | null;
  status: string;
  company: {
    id: string;
    nomeFantasia: string;
    razaoSocial: string;
    cnpj: string;
    slug: string;
  };
};

export async function getOccupationalPhysicianLinks(
  userId: string,
): Promise<OccupationalPhysicianLink[]> {
  const rows = await db.employerOccupationalPhysician.findMany({
    where: { userId, status: "ACTIVE" },
    include: {
      employerCompany: {
        select: {
          id: true,
          nomeFantasia: true,
          razaoSocial: true,
          cnpj: true,
          slug: true,
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  return rows.map((row) => ({
    id: row.id,
    employerCompanyId: row.employerCompanyId,
    email: row.email,
    fullName: row.fullName,
    crm: row.crm,
    status: row.status,
    company: row.employerCompany,
  }));
}

export async function userHasCompanyAccess(
  userId: string,
  employerCompanyId: string,
): Promise<boolean> {
  const link = await db.employerOccupationalPhysician.findFirst({
    where: {
      userId,
      employerCompanyId,
      status: "ACTIVE",
    },
    select: { id: true },
  });
  return Boolean(link);
}
