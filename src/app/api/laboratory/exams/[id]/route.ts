import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireLaboratory } from "@/lib/laboratory-auth";
import { db } from "@/lib/db";

type RouteParams = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  priceCents: z.number().int().positive().optional(),
  available: z.boolean().optional(),
  internalCode: z.string().optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const ctx = await requireLaboratory(undefined, { requireActive: true });
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await db.laboratoryExamItem.findFirst({
    where: { id, laboratoryId: ctx.laboratoryId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const item = await db.laboratoryExamItem.update({
    where: { id },
    data: {
      ...(parsed.data.priceCents !== undefined ? { priceCents: parsed.data.priceCents } : {}),
      ...(parsed.data.available !== undefined ? { available: parsed.data.available } : {}),
      ...(parsed.data.internalCode !== undefined ? { internalCode: parsed.data.internalCode } : {}),
    },
    include: {
      examCatalog: { select: { id: true, name: true, category: true, code: true } },
    },
  });

  return NextResponse.json({ item });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const ctx = await requireLaboratory(undefined, { requireActive: true });
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const existing = await db.laboratoryExamItem.findFirst({
    where: { id, laboratoryId: ctx.laboratoryId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.laboratoryExamItem.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
