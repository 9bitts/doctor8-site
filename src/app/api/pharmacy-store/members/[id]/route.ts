import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePharmacyStore } from "@/lib/pharmacy-store-auth";
import { db } from "@/lib/db";

const patchSchema = z.object({
  role: z.enum(["ADMIN", "STAFF"]).optional(),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requirePharmacyStore(["OWNER", "ADMIN"], { requireActive: true });
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const member = await db.pharmacyStoreMember.findFirst({
    where: { id, pharmacyStoreId: ctx.pharmacyStoreId },
  });
  if (!member) {
    return NextResponse.json({ error: "Membro não encontrado" }, { status: 404 });
  }
  if (member.role === "OWNER") {
    return NextResponse.json({ error: "Não é possível alterar o proprietário." }, { status: 400 });
  }

  const updated = await db.pharmacyStoreMember.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ member: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requirePharmacyStore(["OWNER", "ADMIN"], { requireActive: true });
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const member = await db.pharmacyStoreMember.findFirst({
    where: { id, pharmacyStoreId: ctx.pharmacyStoreId },
  });
  if (!member) {
    return NextResponse.json({ error: "Membro não encontrado" }, { status: 404 });
  }
  if (member.role === "OWNER") {
    return NextResponse.json({ error: "Não é possível remover o proprietário." }, { status: 400 });
  }

  await db.pharmacyStoreMember.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
