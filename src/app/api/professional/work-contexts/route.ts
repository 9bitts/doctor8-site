import { NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { getClinicForProfessional } from "@/lib/chart-access";

export async function GET() {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const [clinicMembership, orgLinks] = await Promise.all([
    getClinicForProfessional(ctx.professional.id),
    db.organizationProfessional.findMany({
      where: { professionalId: ctx.professional.id, status: "ACTIVE" },
      include: {
        organization: { select: { id: true, nomeFantasia: true } },
      },
      orderBy: { joinedAt: "asc" },
    }),
  ]);

  return NextResponse.json({
    clinic: clinicMembership
      ? { id: clinicMembership.clinic.id, name: clinicMembership.clinic.name }
      : null,
    organizations: orgLinks.map((l) => ({
      id: l.organization.id,
      nomeFantasia: l.organization.nomeFantasia,
    })),
  });
}
