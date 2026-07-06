import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { carePlanBodySchema } from "@/lib/nursing/care-plan-types";
import { requireChartAccess, requireNurseProfessional } from "@/lib/nursing/nursing-api";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireNurseProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional, session } = ctx;

  const access = await requireChartAccess(professional.id, params.id, false, session.user.id);
  if ("error" in access) return access.error;

  const plans = await db.nursingCarePlan.findMany({
    where: { patientRecordId: params.id },
    orderBy: { updatedAt: "desc" },
    take: 30,
  });

  return NextResponse.json({
    plans: plans.map((p) => ({
      id: p.id,
      title: p.title,
      diagnoses: p.diagnoses,
      interventions: p.interventions,
      notes: p.notes,
      isActive: p.isActive,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireNurseProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional, session } = ctx;

  const access = await requireChartAccess(professional.id, params.id, true, session.user.id);
  if ("error" in access) return access.error;

  const body = await req.json();
  const parsed = carePlanBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const plan = await db.nursingCarePlan.create({
    data: {
      patientRecordId: params.id,
      professionalId: professional.id,
      title: parsed.data.title,
      diagnoses: parsed.data.diagnoses,
      interventions: parsed.data.interventions,
      notes: parsed.data.notes ?? null,
    },
  });

  return NextResponse.json(
    {
      id: plan.id,
      title: plan.title,
      createdAt: plan.createdAt.toISOString(),
    },
    { status: 201 },
  );
}
