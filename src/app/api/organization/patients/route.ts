import { NextRequest, NextResponse } from "next/server";
import { requireOrganization, getOrganizationProfessionalIds } from "@/lib/organization-auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const ctx = await requireOrganization();
  if ("error" in ctx) return ctx.error;

  const professionalIds = await getOrganizationProfessionalIds(ctx.organizationId);
  if (professionalIds.length === 0) {
    return NextResponse.json({ patients: [], total: 0 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim().toLowerCase() || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

  const records = await db.patientRecord.findMany({
    where: {
      professionalId: { in: professionalIds },
      ...(q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      professional: {
        select: { id: true, firstName: true, lastName: true, specialty: true },
      },
      _count: { select: { medicalDocuments: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  return NextResponse.json({
    patients: records.map((r) => ({
      id: r.id,
      firstName: r.firstName,
      lastName: r.lastName,
      email: r.email,
      professionalId: r.professionalId,
      professionalName: r.professional
        ? `Dr. ${r.professional.firstName} ${r.professional.lastName}`
        : "?",
      specialty: r.professional?.specialty ?? "",
      appointmentCount: r._count.medicalDocuments,
      updatedAt: r.updatedAt.toISOString(),
    })),
    total: records.length,
  });
}
