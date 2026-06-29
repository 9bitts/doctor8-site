import { NextRequest, NextResponse } from "next/server";
import { requireOrganizationApi, isApiError } from "@/lib/api-auth";
import {
  getOrganizationProviderScopeIds,
  resolveProviderScopeFilter,
  scopeHasProviders,
} from "@/lib/organization-providers";
import { db } from "@/lib/db";
import { safeDecrypt } from "@/lib/sign-helpers";
import { providerScopeFromQuery } from "@/lib/work-context";

export async function GET(req: NextRequest) {
  const ctx = await requireOrganizationApi();
  if (isApiError(ctx)) return ctx.error;

  const allScope = await getOrganizationProviderScopeIds(ctx.organizationId);
  if (!scopeHasProviders(allScope)) {
    return NextResponse.json({ appointments: [], total: 0 });
  }

  const { searchParams } = new URL(req.url);
  const scopeKey = providerScopeFromQuery(
    searchParams.get("providerScope"),
    searchParams.get("professionalId"),
  );
  const scope = resolveProviderScopeFilter(allScope, scopeKey);

  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const from = fromParam ? new Date(fromParam) : new Date(new Date().setHours(0, 0, 0, 0));
  const to = toParam
    ? new Date(toParam)
    : new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);

  const orClauses: Array<Record<string, unknown>> = [];
  if (scope.professionalIds.length) {
    orClauses.push({ professionalId: { in: scope.professionalIds } });
  }
  if (scope.psychoanalystIds.length) {
    orClauses.push({ psychoanalystId: { in: scope.psychoanalystIds } });
  }
  if (scope.integrativeTherapistIds.length) {
    orClauses.push({ integrativeTherapistId: { in: scope.integrativeTherapistIds } });
  }

  const appointments = await db.appointment.findMany({
    where: {
      OR: orClauses,
      scheduledAt: { gte: from, lte: to },
      status: { not: "CANCELLED" },
    },
    include: {
      patient: { select: { firstName: true, lastName: true } },
      professional: {
        select: { id: true, firstName: true, lastName: true, specialty: true },
      },
      psychoanalyst: { select: { id: true, firstName: true, lastName: true } },
      integrativeTherapist: {
        select: { id: true, firstName: true, lastName: true, picsPractices: true },
      },
    },
    orderBy: { scheduledAt: "asc" },
    take: 200,
  });

  return NextResponse.json({
    appointments: appointments.map((a) => {
      let professionalName = "?";
      let professionalId: string | null = a.professionalId;
      let specialty = "";

      if (a.professional) {
        professionalName = `Dr. ${a.professional.firstName} ${a.professional.lastName}`;
        specialty = a.professional.specialty ?? "";
      } else if (a.psychoanalyst) {
        professionalName = `${a.psychoanalyst.firstName} ${a.psychoanalyst.lastName}`;
        professionalId = a.psychoanalystId;
        specialty = "Psicanálise";
      } else if (a.integrativeTherapist) {
        professionalName = `${a.integrativeTherapist.firstName} ${a.integrativeTherapist.lastName}`;
        professionalId = a.integrativeTherapistId;
        specialty = a.integrativeTherapist.picsPractices[0] ?? "Terapia integrativa";
      }

      return {
        id: a.id,
        scheduledAt: a.scheduledAt.toISOString(),
        durationMins: a.durationMins,
        type: a.type,
        status: a.status,
        priceAmount: a.priceAmount,
        currency: a.currency,
        patientName: a.patient
          ? `${safeDecrypt(a.patient.firstName)} ${safeDecrypt(a.patient.lastName)}`.trim()
          : "?",
        professionalName,
        professionalId,
        specialty,
      };
    }),
    total: appointments.length,
    from: from.toISOString(),
    to: to.toISOString(),
  });
}
