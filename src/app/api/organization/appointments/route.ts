import { NextRequest, NextResponse } from "next/server";
import { requireOrganizationApi, isApiError } from "@/lib/api-auth";
import { getOrganizationProfessionalIds } from "@/lib/organization-auth";
import { db } from "@/lib/db";
import { resolveOrgProfessionalFilter } from "@/lib/work-context";

export async function GET(req: NextRequest) {
  const ctx = await requireOrganizationApi();
  if (isApiError(ctx)) return ctx.error;

  const allProfessionalIds = await getOrganizationProfessionalIds(ctx.organizationId);
  if (allProfessionalIds.length === 0) {
    return NextResponse.json({ appointments: [], total: 0 });
  }

  const { searchParams } = new URL(req.url);
  const scopeProfessionalId = searchParams.get("professionalId")?.trim() || undefined;
  const professionalIds = resolveOrgProfessionalFilter(
    allProfessionalIds,
    scopeProfessionalId,
  );
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const from = fromParam ? new Date(fromParam) : new Date(new Date().setHours(0, 0, 0, 0));
  const to = toParam
    ? new Date(toParam)
    : new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);

  const appointments = await db.appointment.findMany({
    where: {
      professionalId: { in: professionalIds },
      scheduledAt: { gte: from, lte: to },
      status: { not: "CANCELLED" },
    },
    include: {
      patient: { select: { firstName: true, lastName: true } },
      professional: {
        select: { id: true, firstName: true, lastName: true, specialty: true },
      },
    },
    orderBy: { scheduledAt: "asc" },
    take: 200,
  });

  return NextResponse.json({
    appointments: appointments.map((a) => ({
      id: a.id,
      scheduledAt: a.scheduledAt.toISOString(),
      durationMins: a.durationMins,
      type: a.type,
      status: a.status,
      priceAmount: a.priceAmount,
      currency: a.currency,
      patientName: a.patient
        ? `${a.patient.firstName} ${a.patient.lastName}`
        : "?",
      professionalName: a.professional
        ? `Dr. ${a.professional.firstName} ${a.professional.lastName}`
        : "?",
      professionalId: a.professionalId,
      specialty: a.professional?.specialty ?? "",
    })),
    total: appointments.length,
    from: from.toISOString(),
    to: to.toISOString(),
  });
}
