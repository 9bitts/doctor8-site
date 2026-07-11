import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfessional } from "@/lib/psychology-api";
import { db } from "@/lib/db";
import { TEMPLATE_CATEGORIES } from "@/lib/clinical-template-utils";
import { prescriptionMedicationItemSchema } from "@/lib/prescription-medication-schema";

const medicationItemSchema = prescriptionMedicationItemSchema;

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  medications: z.array(medicationItemSchema).min(1).optional(),
  instructions: z.string().optional(),
  validDays: z.number().min(1).max(365).optional(),
  templateCategory: z.enum([TEMPLATE_CATEGORIES.RX_POSTOP]).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional } = ctx;

  const existing = await db.prescriptionTemplate.findFirst({
    where: { id: params.id, professionalId: professional.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.medications) {
    data.medications = parsed.data.medications as object;
  }

  const updated = await db.prescriptionTemplate.update({
    where: { id: existing.id },
    data,
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    templateCategory: updated.templateCategory,
    medications: updated.medications,
    instructions: updated.instructions || "",
    validDays: updated.validDays,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional } = ctx;

  const existing = await db.prescriptionTemplate.findFirst({
    where: { id: params.id, professionalId: professional.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.prescriptionTemplate.delete({ where: { id: existing.id } });
  return NextResponse.json({ success: true });
}
