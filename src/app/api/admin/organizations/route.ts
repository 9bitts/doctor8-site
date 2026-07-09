import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { mapOwnerVerificationFields } from "@/lib/b2b-admin";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organizations = await db.organization.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      cnpj: true,
      nomeFantasia: true,
      razaoSocial: true,
      slug: true,
      contactEmail: true,
      contactPhone: true,
      addressCity: true,
      addressState: true,
      createdAt: true,
      members: {
        where: { role: "OWNER" },
        take: 1,
        select: {
          user: {
            select: {
              id: true,
              email: true,
              emailVerified: true,
              phoneVerified: true,
              lockedUntil: true,
            },
          },
        },
      },
      _count: {
        select: {
          members: true,
          professionals: true,
          employees: true,
        },
      },
    },
  });

  return NextResponse.json({
    organizations: organizations.map((org) => {
      const owner = org.members[0]?.user;
      return {
        id: org.id,
        cnpj: org.cnpj,
        nomeFantasia: org.nomeFantasia,
        razaoSocial: org.razaoSocial,
        slug: org.slug,
        contactEmail: org.contactEmail,
        contactPhone: org.contactPhone,
        addressCity: org.addressCity,
        addressState: org.addressState,
        memberCount: org._count.members,
        professionalCount: org._count.professionals,
        employeeCount: org._count.employees,
        ...mapOwnerVerificationFields(owner, org.contactEmail),
        createdAt: org.createdAt.toISOString(),
      };
    }),
  });
}
