import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { intakeFormBodySchema } from "@/lib/pharmacy/types";
import { requireChartAccess, requirePharmacistProfessional } from "@/lib/pharmacy/pharmacy-api";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requirePharmacistProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional, session } = ctx;

  const access = await requireChartAccess(professional.id, params.id, false, session.user.id);
  if ("error" in access) return access.error;

  const forms = await db.pharmacyIntakeForm.findMany({
    where: { patientRecordId: params.id },
    orderBy: { sentAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    forms: forms.map((f) => ({
      id: f.id,
      status: f.status,
      responses: f.responses,
      appointmentId: f.appointmentId,
      sentAt: f.sentAt.toISOString(),
      completedAt: f.completedAt?.toISOString() ?? null,
    })),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requirePharmacistProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional, session } = ctx;

  const access = await requireChartAccess(professional.id, params.id, true, session.user.id);
  if ("error" in access) return access.error;

  const body = await req.json().catch(() => ({}));
  const parsed = intakeFormBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const form = await db.pharmacyIntakeForm.create({
    data: {
      patientRecordId: params.id,
      professionalId: professional.id,
      appointmentId: parsed.data.appointmentId ?? null,
      status: "PENDING",
    },
  });

  return NextResponse.json(
    {
      id: form.id,
      status: form.status,
      sentAt: form.sentAt.toISOString(),
    },
    { status: 201 },
  );
}
