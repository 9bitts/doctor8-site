import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { NUTRITION_INTAKE_QUESTIONS } from "@/lib/nutrition/intake-questions";

const submitSchema = z.record(z.union([z.string(), z.number(), z.boolean()]));

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const form = await db.nutritionIntakeForm.findFirst({
    where: {
      id: params.id,
      patientRecord: { linkedUserId: ctx.userId },
    },
    include: {
      professional: { select: { firstName: true, lastName: true } },
    },
  });

  if (!form) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: form.id,
    status: form.status,
    responses: form.responses,
    sentAt: form.sentAt.toISOString(),
    completedAt: form.completedAt?.toISOString() ?? null,
    professionalName: `${form.professional.firstName} ${form.professional.lastName}`.trim(),
    questions: NUTRITION_INTAKE_QUESTIONS,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const form = await db.nutritionIntakeForm.findFirst({
    where: {
      id: params.id,
      status: "PENDING",
      patientRecord: { linkedUserId: ctx.userId },
    },
  });

  if (!form) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = submitSchema.safeParse(body.responses ?? body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await db.nutritionIntakeForm.update({
    where: { id: form.id },
    data: {
      status: "COMPLETED",
      responses: parsed.data,
      completedAt: new Date(),
    },
  });

  return NextResponse.json({
    id: updated.id,
    status: updated.status,
    completedAt: updated.completedAt?.toISOString(),
  });
}
