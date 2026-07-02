// POST — patient revokes an accepted connection.
import { NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { linkDb } from "@/lib/patient-professional-link-db";
import { createAuditLog } from "@/lib/audit";
import { AuditAction } from "@prisma/client";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const link = await linkDb().findUnique({ where: { id: params.id } });
  if (!link || link.patientUserId !== ctx.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (link.status !== "ACCEPTED") {
    return NextResponse.json({ error: "Link is not active" }, { status: 400 });
  }

  const updated = await linkDb().update({
    where: { id: link.id },
    data: {
      status: "REVOKED",
      respondedAt: new Date(),
    },
  });

  await createAuditLog({
    userId: ctx.userId,
    action: AuditAction.UPDATE_RECORD,
    resource: "PatientProfessionalLink",
    resourceId: link.id,
    details: { status: "REVOKED" },
  });

  return NextResponse.json({ id: updated.id, status: updated.status });
}
