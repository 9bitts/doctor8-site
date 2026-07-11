import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { requirePharmacyStore } from "@/lib/pharmacy-store-auth";
import { db } from "@/lib/db";
import { getMedicinaNaturalItemBySlug } from "@/lib/medicina-natural-catalog/search-server";

export async function GET(req: NextRequest) {
  const ctx = await requirePharmacyStore();
  if ("error" in ctx) return ctx.error;

  const q = req.nextUrl.searchParams.get("q")?.trim().toLowerCase() || "";
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") || "50", 10)));
  const skip = (page - 1) * limit;

  const where: Prisma.PharmacyStoreInventoryItemWhereInput = {
    pharmacyStoreId: ctx.pharmacyStoreId,
    ...(q
      ? {
          OR: [
            {
              drugCatalog: {
                OR: [
                  { searchName: { contains: q } },
                  { searchIngredient: { contains: q } },
                  { name: { contains: q, mode: "insensitive" } },
                ],
              },
            },
            { mnSlug: { contains: q } },
            { mnDisplayName: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    db.pharmacyStoreInventoryItem.findMany({
      where,
      include: {
        drugCatalog: {
          select: {
            id: true,
            name: true,
            activeIngredient: true,
            presentation: true,
            manufacturer: true,
            ggremCode: true,
            controlled: true,
            prescriptionType: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
    }),
    db.pharmacyStoreInventoryItem.count({ where }),
  ]);

  return NextResponse.json({
    items: items.map((item) => ({
      id: item.id,
      drugCatalogId: item.drugCatalogId,
      mnSlug: item.mnSlug,
      mnDisplayName: item.mnDisplayName,
      priceCents: item.priceCents,
      stockQty: item.stockQty,
      available: item.available,
      ean: item.ean,
      sku: item.sku,
      updatedAt: item.updatedAt.toISOString(),
      drug: item.drugCatalog,
    })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

const drugCreateSchema = z.object({
  drugCatalogId: z.string().min(1),
  priceCents: z.number().int().positive(),
  stockQty: z.number().int().min(0).optional(),
  ean: z.string().optional(),
  sku: z.string().optional(),
  available: z.boolean().optional(),
});

const mnCreateSchema = z.object({
  mnSlug: z.string().min(1),
  mnDisplayName: z.string().optional(),
  priceCents: z.number().int().positive(),
  stockQty: z.number().int().min(0).optional(),
  ean: z.string().optional(),
  sku: z.string().optional(),
  available: z.boolean().optional(),
});

const createSchema = z.union([drugCreateSchema, mnCreateSchema]);

export async function POST(req: NextRequest) {
  const ctx = await requirePharmacyStore();
  if ("error" in ctx) return ctx.error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if ("mnSlug" in parsed.data) {
    const mn = await getMedicinaNaturalItemBySlug(parsed.data.mnSlug);
    if (!mn) {
      return NextResponse.json({ error: "Item não encontrado no catálogo Medicina Natural" }, { status: 404 });
    }

    const item = await db.pharmacyStoreInventoryItem.upsert({
      where: {
        pharmacyStoreId_mnSlug: {
          pharmacyStoreId: ctx.pharmacyStoreId,
          mnSlug: parsed.data.mnSlug,
        },
      },
      create: {
        pharmacyStoreId: ctx.pharmacyStoreId,
        mnSlug: parsed.data.mnSlug,
        mnDisplayName: parsed.data.mnDisplayName || mn.nome,
        priceCents: parsed.data.priceCents,
        stockQty: parsed.data.stockQty,
        ean: parsed.data.ean,
        sku: parsed.data.sku,
        available: parsed.data.available ?? true,
      },
      update: {
        mnDisplayName: parsed.data.mnDisplayName || mn.nome,
        priceCents: parsed.data.priceCents,
        stockQty: parsed.data.stockQty,
        ean: parsed.data.ean,
        sku: parsed.data.sku,
        available: parsed.data.available ?? true,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  }

  const drug = await db.drugCatalog.findFirst({
    where: { id: parsed.data.drugCatalogId, active: true, country: "BR" },
  });
  if (!drug) {
    return NextResponse.json({ error: "Medicamento não encontrado no catálogo" }, { status: 404 });
  }

  const item = await db.pharmacyStoreInventoryItem.upsert({
    where: {
      pharmacyStoreId_drugCatalogId: {
        pharmacyStoreId: ctx.pharmacyStoreId,
        drugCatalogId: parsed.data.drugCatalogId,
      },
    },
    create: {
      pharmacyStoreId: ctx.pharmacyStoreId,
      drugCatalogId: parsed.data.drugCatalogId,
      priceCents: parsed.data.priceCents,
      stockQty: parsed.data.stockQty,
      ean: parsed.data.ean,
      sku: parsed.data.sku,
      available: parsed.data.available ?? true,
    },
    update: {
      priceCents: parsed.data.priceCents,
      stockQty: parsed.data.stockQty,
      ean: parsed.data.ean,
      sku: parsed.data.sku,
      available: parsed.data.available ?? true,
    },
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

  return NextResponse.json({ item }, { status: 201 });
}
