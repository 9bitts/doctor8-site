// POST — patient accepts or rejects a connection request.
import { NextRequest, NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { linkDb } from "@/lib/patient-professional-link-db";
import { createAuditLog } from "@/lib/audit";
import { AuditAction } from "@prisma/client";
import { z } from "zod";

const schema = z.object({
  action: z.enum(["accept", "reject"]),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const link = await linkDb().findUnique({ where: { id: params.id } });
  if (!link || link.patientUserId !== ctx.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (link.status !== "PENDING") {
    return NextResponse.json({ id: link.id, status: link.status });
  }

  const newStatus = parsed.data.action === "accept" ? "ACCEPTED" : "REJECTED";
  const updated = await linkDb().update({
    where: { id: link.id },
    data: {
      status: newStatus,
      respondedAt: new Date(),
    },
  });

  await createAuditLog({
    userId: ctx.userId,
    action: AuditAction.UPDATE_RECORD,
    resource: "PatientProfessionalLink",
    resourceId: link.id,
    details: { status: newStatus },
  });

  return NextResponse.json({ id: updated.id, status: updated.status });
}
