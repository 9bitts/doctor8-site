import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePharmacyStore } from "@/lib/pharmacy-store-auth";
import { db } from "@/lib/db";

const patchSchema = z.object({
  priceCents: z.number().int().positive().optional(),
  stockQty: z.number().int().min(0).optional().nullable(),
  ean: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  available: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requirePharmacyStore();
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await db.pharmacyStoreInventoryItem.findFirst({
    where: { id, pharmacyStoreId: ctx.pharmacyStoreId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });
  }

  const item = await db.pharmacyStoreInventoryItem.update({
    where: { id },
    data: parsed.data,
    include: {
      drugCatalog: {
        select: {
          id: true,
          name: true,
          activeIngredient: true,
          presentation: true,
          manufacturer: true,
          ggremCode: true,
        },
      },
    },
  });

  return NextResponse.json({ item });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requirePharmacyStore();
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const existing = await db.pharmacyStoreInventoryItem.findFirst({
    where: { id, pharmacyStoreId: ctx.pharmacyStoreId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });
  }

  await db.pharmacyStoreInventoryItem.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
