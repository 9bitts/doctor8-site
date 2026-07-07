import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireDentalChartAccess, requireDentistProfessional } from "@/lib/dentistry/dentistry-api";

const patchSchema = z.object({
  status: z.enum(["DRAFT", "PRESENTED", "APPROVED", "IN_PROGRESS", "COMPLETED", "REJECTED"]).optional(),
  patientApproved: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; planId: string } },
) {
  const ctx = await requireDentistProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional, session } = ctx;

  const access = await requireDentalChartAccess(professional.id, params.id, true, session.user.id);
  if ("error" in access) return access.error;

  const plan = await db.dentalTreatmentPlan.findFirst({
    where: { id: params.planId, patientRecordId: params.id, professionalId: professional.id },
  });
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await db.dentalTreatmentPlan.update({
    where: { id: params.planId },
    data: {
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.patientApproved !== undefined ? {
        patientApproved: parsed.data.patientApproved,
        approvedAt: parsed.data.patientApproved ? new Date() : null,
        status: parsed.data.patientApproved ? "APPROVED" : plan.status,
      } : {}),
    },
  });

  return NextResponse.json({ id: updated.id, status: updated.status, patientApproved: updated.patientApproved });
}
