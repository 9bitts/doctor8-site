import { NextRequest, NextResponse } from "next/server";
import { requireOrganizationApi, isApiError } from "@/lib/api-auth";
import {
  getOrganizationProviderScopeIds,
  resolveProviderScopeFilter,
  scopeHasProviders,
} from "@/lib/organization-providers";
import { db } from "@/lib/db";
import { safeDecrypt } from "@/lib/sign-helpers";
import { filterPatientCharts } from "@/lib/patient-chart-search";
import { normalizeSearchQuery } from "@/lib/patient-record-search";
import { providerScopeFromQuery } from "@/lib/work-context";
import type { ProviderType } from "@prisma/client";

type PatientRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  providerType: ProviderType;
  professionalId: string;
  professionalName: string;
  specialty: string;
  appointmentCount: number;
  updatedAt: string;
};

function dedupeKey(email: string | null, providerId: string, fallbackId: string): string {
  return `${(email || fallbackId).toLowerCase()}|${providerId}`;
}

export async function GET(req: NextRequest) {
  const ctx = await requireOrganizationApi();
  if (isApiError(ctx)) return ctx.error;

  const allScope = await getOrganizationProviderScopeIds(ctx.organizationId);
  if (!scopeHasProviders(allScope)) {
    return NextResponse.json({ patients: [], total: 0 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
  const scopeKey = providerScopeFromQuery(
    searchParams.get("providerScope"),
    searchParams.get("professionalId"),
  );
  const scope = resolveProviderScopeFilter(allScope, scopeKey);

  const rows: PatientRow[] = [];
  const seen = new Set<string>();

  if (scope.professionalIds.length > 0) {
    const recordsRaw = await db.patientRecord.findMany({
      where: {
        professionalId: { in: scope.professionalIds },
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

    for (const r of recordsRaw) {
      const key = dedupeKey(r.email, r.professionalId, r.id);
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        id: r.id,
        firstName: safeDecrypt(r.firstName),
        lastName: safeDecrypt(r.lastName),
        email: r.email,
        providerType: "HEALTH",
        professionalId: r.professionalId,
        professionalName: r.professional
          ? `Dr. ${r.professional.firstName} ${r.professional.lastName}`
          : "?",
        specialty: r.professional?.specialty ?? "",
        appointmentCount: r._count.medicalDocuments,
        updatedAt: r.updatedAt.toISOString(),
      });
    }
  }

  if (scope.psychoanalystIds.length > 0) {
    const analysands = await db.analysandRecord.findMany({
      where: { psychoanalystId: { in: scope.psychoanalystIds } },
      include: {
        psychoanalyst: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { medicalDocuments: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: q ? 200 : limit * 2,
    });

    for (const r of analysands) {
      const key = dedupeKey(r.email, r.psychoanalystId, r.id);
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        id: r.id,
        firstName: safeDecrypt(r.firstName),
        lastName: safeDecrypt(r.lastName),
        email: r.email,
        providerType: "PSYCHOANALYST",
        professionalId: r.psychoanalystId,
        professionalName: r.psychoanalyst
          ? `${r.psychoanalyst.firstName} ${r.psychoanalyst.lastName}`
          : "?",
        specialty: "Psicanálise",
        appointmentCount: r._count.medicalDocuments,
        updatedAt: r.updatedAt.toISOString(),
      });
    }
  }

  if (scope.integrativeTherapistIds.length > 0) {
    const clients = await db.integrativeClientRecord.findMany({
      where: { integrativeTherapistId: { in: scope.integrativeTherapistIds } },
      include: {
        integrativeTherapist: {
          select: { id: true, firstName: true, lastName: true, picsPractices: true },
        },
        _count: { select: { medicalDocuments: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: q ? 200 : limit * 2,
    });

    for (const r of clients) {
      const key = dedupeKey(r.email, r.integrativeTherapistId, r.id);
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        id: r.id,
        firstName: safeDecrypt(r.firstName),
        lastName: safeDecrypt(r.lastName),
        email: r.email,
        providerType: "INTEGRATIVE_THERAPIST",
        professionalId: r.integrativeTherapistId,
        professionalName: r.integrativeTherapist
          ? `${r.integrativeTherapist.firstName} ${r.integrativeTherapist.lastName}`
          : "?",
        specialty: r.integrativeTherapist?.picsPractices[0] ?? "Terapia integrativa",
        appointmentCount: r._count.medicalDocuments,
        updatedAt: r.updatedAt.toISOString(),
      });
    }
  }

  const appointmentOr: Array<Record<string, unknown>> = [];
  if (scope.professionalIds.length) {
    appointmentOr.push({ professionalId: { in: scope.professionalIds } });
  }
  if (scope.psychoanalystIds.length) {
    appointmentOr.push({ psychoanalystId: { in: scope.psychoanalystIds } });
  }
  if (scope.integrativeTherapistIds.length) {
    appointmentOr.push({ integrativeTherapistId: { in: scope.integrativeTherapistIds } });
  }

  if (appointmentOr.length > 0) {
    const recentAppointments = await db.appointment.findMany({
      where: {
        OR: appointmentOr,
        status: { not: "CANCELLED" },
      },
      orderBy: { scheduledAt: "desc" },
      take: 150,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, userId: true } },
        professional: {
          select: { id: true, firstName: true, lastName: true, specialty: true },
        },
        psychoanalyst: { select: { id: true, firstName: true, lastName: true } },
        integrativeTherapist: {
          select: { id: true, firstName: true, lastName: true, picsPractices: true },
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

    for (const a of recentAppointments) {
      if (!a.patient) continue;

      let providerType: ProviderType = "HEALTH";
      let providerId = a.professionalId;
      let providerName = "?";
      let specialty = "";

      if (a.professionalId && a.professional) {
        providerType = "HEALTH";
        providerId = a.professionalId;
        providerName = `Dr. ${a.professional.firstName} ${a.professional.lastName}`;
        specialty = a.professional.specialty ?? "";
      } else if (a.psychoanalystId && a.psychoanalyst) {
        providerType = "PSYCHOANALYST";
        providerId = a.psychoanalystId;
        providerName = `${a.psychoanalyst.firstName} ${a.psychoanalyst.lastName}`;
        specialty = "Psicanálise";
      } else if (a.integrativeTherapistId && a.integrativeTherapist) {
        providerType = "INTEGRATIVE_THERAPIST";
        providerId = a.integrativeTherapistId;
        providerName = `${a.integrativeTherapist.firstName} ${a.integrativeTherapist.lastName}`;
        specialty = a.integrativeTherapist.picsPractices[0] ?? "Terapia integrativa";
      }

      if (!providerId) continue;

      const email = a.patient.userId ? usersById.get(a.patient.userId) ?? null : null;
      const key = dedupeKey(email, providerId, a.patient.id);
      if (seen.has(key)) continue;
      seen.add(key);

      rows.push({
        id: `appt-${a.patient.id}-${providerId}`,
        firstName: safeDecrypt(a.patient.firstName),
        lastName: safeDecrypt(a.patient.lastName),
        email,
        providerType,
        professionalId: providerId,
        professionalName: providerName,
        specialty,
        appointmentCount: 0,
        updatedAt: a.scheduledAt.toISOString(),
      });
    }
  }

  rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const filtered = q ? filterPatientCharts(rows, q, limit) : rows;

  return NextResponse.json({
    patients: filtered.slice(0, limit),
    total: filtered.length,
  });
}
