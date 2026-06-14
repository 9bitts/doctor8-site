// src/app/api/admin/categories/[id]/route.ts
// ADMIN ONLY.
// PATCH  — edit a category (name, group, orders, icon, legacyType, active).
// DELETE — delete ONLY if it has no documents; otherwise refuse (deactivate instead).
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  groupName: z.string().min(1).max(120).optional(),
  groupOrder: z.number().int().min(0).max(999).optional(),
  itemOrder: z.number().int().min(0).max(999).optional(),
  legacyType: z.string().max(60).nullable().optional(),
  icon: z.string().max(60).nullable().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const existing = await db.category.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;

  const updated = await db.category.update({
    where: { id: params.id },
    data: {
      ...(d.name !== undefined ? { name: d.name } : {}),
      ...(d.groupName !== undefined ? { groupName: d.groupName } : {}),
      ...(d.groupOrder !== undefined ? { groupOrder: d.groupOrder } : {}),
      ...(d.itemOrder !== undefined ? { itemOrder: d.itemOrder } : {}),
      ...(d.legacyType !== undefined ? { legacyType: d.legacyType } : {}),
      ...(d.icon !== undefined ? { icon: d.icon } : {}),
      ...(d.active !== undefined ? { active: d.active } : {}),
    },
  });

  return NextResponse.json({ id: updated.id });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const count = await db.medicalDocument.count({ where: { categoryId: params.id } });
  if (count > 0) {
    return NextResponse.json(
      { error: `Esta categoria tem ${count} registro(s) e não pode ser excluída. Desative-a em vez disso.` },
      { status: 409 }
    );
  }

  await db.category.delete({ where: { id: params.id } });
  return NextResponse.json({ deleted: true });
}
