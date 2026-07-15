import { NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { maxQuantityForProduct } from "@/lib/import-order";

export async function GET() {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const products = await db.importProduct.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      activeIngredient: true,
      strengthMg: true,
      presentationMl: true,
      priceUsdCents: true,
      shippingUsdCents: true,
      daysPerUnit: true,
    },
  });

  return NextResponse.json({
    products: products.map((p) => ({
      ...p,
      maxQuantity: maxQuantityForProduct(p.daysPerUnit),
      priceUsd: p.priceUsdCents / 100,
      shippingUsd: p.shippingUsdCents / 100,
    })),
  });
}
