import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfessional } from "@/lib/psychology-api";
import { db } from "@/lib/db";

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  documentType: z.enum([
    "CERTIFICATE", "REFERRAL", "CLINICAL_NOTE", "OTHER",
  ]).optional(),
  title: z.string().min(1).max(300).optional(),
  body: z.string().min(1).max(50000).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional } = ctx;

  const existing = await db.documentTemplate.findFirst({
    where: { id: params.id, professionalId: professional.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await db.documentTemplate.update({
    where: { id: existing.id },
    data: parsed.data,
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    documentType: updated.documentType,
    title: updated.title,
    body: updated.body,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional } = ctx;

  const existing = await db.documentTemplate.findFirst({
    where: { id: params.id, professionalId: professional.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.documentTemplate.delete({ where: { id: existing.id } });
  return NextResponse.json({ success: true });
}
