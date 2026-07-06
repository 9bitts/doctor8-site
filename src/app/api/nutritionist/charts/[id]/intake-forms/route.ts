import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  requireChartAccess,
  requireNutritionProfessional,
} from "@/lib/nutrition/nutrition-api";

const createSchema = z.object({
  appointmentId: z.string().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireNutritionProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional, session } = ctx;

  const access = await requireChartAccess(professional.id, params.id, false, session.user.id);
  if ("error" in access) return access.error;

  const forms = await db.nutritionIntakeForm.findMany({
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
  const ctx = await requireNutritionProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional, session } = ctx;

  const access = await requireChartAccess(professional.id, params.id, true, session.user.id);
  if ("error" in access) return access.error;

  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const form = await db.nutritionIntakeForm.create({
    data: {
      patientRecordId: params.id,
      professionalId: professional.id,
      appointmentId: parsed.data.appointmentId ?? null,
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
