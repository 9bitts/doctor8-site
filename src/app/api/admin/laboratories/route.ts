import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const laboratories = await db.laboratory.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      cnpj: true,
      nomeFantasia: true,
      razaoSocial: true,
      slug: true,
      labType: true,
      status: true,
      platformFeeCents: true,
      addressCity: true,
      addressState: true,
      contactEmail: true,
      contactPhone: true,
      latitude: true,
      longitude: true,
      createdAt: true,
      _count: {
        select: {
          exams: true,
          members: true,
        },
      },
    },
  });

  return NextResponse.json({
    laboratories: laboratories.map((lab) => ({
      id: lab.id,
      cnpj: lab.cnpj,
      nomeFantasia: lab.nomeFantasia,
      razaoSocial: lab.razaoSocial,
      slug: lab.slug,
      labType: lab.labType,
      status: lab.status,
      platformFeeCents: lab.platformFeeCents,
      addressCity: lab.addressCity,
      addressState: lab.addressState,
      contactEmail: lab.contactEmail,
      contactPhone: lab.contactPhone,
      geocoded: lab.latitude != null && lab.longitude != null,
      examCount: lab._count.exams,
      memberCount: lab._count.members,
      createdAt: lab.createdAt.toISOString(),
    })),
  });
}
