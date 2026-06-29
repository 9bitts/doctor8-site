import { NextRequest, NextResponse } from "next/server";
import { requireOrganizationApi, isApiError } from "@/lib/api-auth";
import { getOrganizationProfessionalIds } from "@/lib/organization-auth";
import { db } from "@/lib/db";
import { safeDecrypt } from "@/lib/sign-helpers";
import { filterPatientCharts } from "@/lib/patient-chart-search";
import { normalizeSearchQuery } from "@/lib/patient-record-search";

export async function GET(req: NextRequest) {
  const ctx = await requireOrganizationApi();
  if (isApiError(ctx)) return ctx.error;

  const professionalIds = await getOrganizationProfessionalIds(ctx.organizationId);
  if (professionalIds.length === 0) {
    return NextResponse.json({ patients: [], total: 0 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

  const recordsRaw = await db.patientRecord.findMany({
    where: {
      professionalId: { in: professionalIds },
      ...(q
        ? {
            OR: [
              { searchText: { contains: normalizeSearchQuery(q) } },
              { searchText: null },
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
    ...(q ? {} : { take: limit }),
  });

  const decrypted = recordsRaw.map((r) => ({
    id: r.id,
    firstName: safeDecrypt(r.firstName),
    lastName: safeDecrypt(r.lastName),
    email: r.email,
    professionalId: r.professionalId,
    professionalName: r.professional
      ? `Dr. ${r.professional.firstName} ${r.professional.lastName}`
      : "?",
    specialty: r.professional?.specialty ?? "",
    appointmentCount: r._count.medicalDocuments,
    updatedAt: r.updatedAt.toISOString(),
  }));

  const filtered = q
    ? filterPatientCharts(decrypted, q, limit)
    : decrypted;

  return NextResponse.json({
    patients: filtered.slice(0, limit),
    total: filtered.length,
  });
}
