import { NextRequest, NextResponse } from "next/server";
import { requireOrganizationApi, isApiError } from "@/lib/api-auth";
import { getOrganizationProfessionalIds } from "@/lib/organization-auth";
import { db } from "@/lib/db";
import { safeDecrypt } from "@/lib/sign-helpers";
import { filterPatientCharts } from "@/lib/patient-chart-search";
import { normalizeSearchQuery } from "@/lib/patient-record-search";
import { resolveOrgProfessionalFilter } from "@/lib/work-context";

export async function GET(req: NextRequest) {
  const ctx = await requireOrganizationApi();
  if (isApiError(ctx)) return ctx.error;

  const allProfessionalIds = await getOrganizationProfessionalIds(ctx.organizationId);
  if (allProfessionalIds.length === 0) {
    return NextResponse.json({ patients: [], total: 0 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
  const scopeProfessionalId = searchParams.get("professionalId")?.trim() || undefined;
  const professionalIds = resolveOrgProfessionalFilter(
    allProfessionalIds,
    scopeProfessionalId,
  );

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
    ...(q ? {} : { take: limit * 2 }),
  });

  const fromCharts = recordsRaw.map((r) => ({
    id: r.id,
    source: "chart" as const,
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

  // I5: include patients with appointments at linked doctors but no chart yet
  const recentAppointments = await db.appointment.findMany({
    where: {
      professionalId: { in: professionalIds },
      status: { not: "CANCELLED" },
    },
    orderBy: { scheduledAt: "desc" },
    take: 150,
    include: {
      patient: { select: { id: true, firstName: true, lastName: true, userId: true } },
      professional: {
        select: { id: true, firstName: true, lastName: true, specialty: true },
      },
    },
  });

  const appointmentUserIds = recentAppointments
    .map((a) => a.patient?.userId)
    .filter((id): id is string => !!id);
  const usersById = new Map(
    (
      await db.user.findMany({
        where: { id: { in: appointmentUserIds } },
        select: { id: true, email: true },
      })
    ).map((u) => [u.id, u.email] as const),
  );

  const chartKeys = new Set(
    fromCharts.map((p) => `${(p.email || "").toLowerCase()}|${p.professionalId}`),
  );

  const fromAppointments: typeof fromCharts = [];
  for (const a of recentAppointments) {
    if (!a.patient || !a.professionalId) continue;
    const email = a.patient.userId ? usersById.get(a.patient.userId) ?? null : null;
    const key = `${(email || a.patient.id).toLowerCase()}|${a.professionalId}`;
    if (chartKeys.has(key)) continue;
    chartKeys.add(key);

    fromAppointments.push({
      id: `appt-${a.patient.id}-${a.professionalId}`,
      source: "chart" as const,
      firstName: safeDecrypt(a.patient.firstName),
      lastName: safeDecrypt(a.patient.lastName),
      email,
      professionalId: a.professionalId,
      professionalName: a.professional
        ? `Dr. ${a.professional.firstName} ${a.professional.lastName}`
        : "?",
      specialty: a.professional?.specialty ?? "",
      appointmentCount: 0,
      updatedAt: a.scheduledAt.toISOString(),
    });
  }

  const decrypted = [...fromCharts, ...fromAppointments];

  const filtered = q
    ? filterPatientCharts(decrypted, q, limit)
    : decrypted;

  return NextResponse.json({
    patients: filtered.slice(0, limit).map(({ source: _s, ...rest }) => rest),
    total: filtered.length,
  });
}
