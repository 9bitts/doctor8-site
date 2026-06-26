import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOrganization } from "@/lib/organization-auth";

export async function GET() {
  const ctx = await requireOrganization();
  if ("error" in ctx) return ctx.error;

  const professionals = await db.organizationProfessional.findMany({
    where: { organizationId: ctx.organizationId },
    include: {
      professional: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          specialty: true,
          licenseNumber: true,
          user: { select: { email: true } },
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  return NextResponse.json({
    professionals: professionals.map((p) => ({
      id: p.id,
      professionalId: p.professionalId,
      name: `${p.professional.firstName} ${p.professional.lastName}`,
      specialty: p.professional.specialty,
      licenseNumber: p.professional.licenseNumber,
      email: p.professional.user.email,
      repassePercent: p.repassePercent,
      status: p.status,
      joinedAt: p.joinedAt.toISOString(),
    })),
    inviteCode: ctx.organization.inviteCode,
  });
}
