import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireIntegrativeTherapist } from "@/lib/integrative-therapist-api";

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireIntegrativeTherapist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { therapist } = ctx as Exclude<typeof ctx, { error: NextResponse }>;
  const { id } = await params;

  const existing = await db.prescriptionTemplate.findFirst({
    where: { id, integrativeTherapistId: therapist.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await db.prescriptionTemplate.update({
    where: { id: existing.id },
    data: parsed.data,
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    medications: updated.medications,
    instructions: updated.instructions || "",
    validDays: updated.validDays,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireIntegrativeTherapist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { therapist } = ctx as Exclude<typeof ctx, { error: NextResponse }>;
  const { id } = await params;

  const existing = await db.prescriptionTemplate.findFirst({
    where: { id, integrativeTherapistId: therapist.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.prescriptionTemplate.delete({ where: { id: existing.id } });
  return NextResponse.json({ success: true });
}
