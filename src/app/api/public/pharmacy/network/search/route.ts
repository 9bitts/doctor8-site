import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  isPharmacyNetworkPublic,
  searchPharmacyQuotes,
} from "@/lib/pharmacy-network/quote";

const querySchema = z.object({
  q: z.string().min(2).max(120),
  cep: z.string().max(12).optional(),
  city: z.string().max(80).optional(),
  state: z.string().max(2).optional(),
});

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const networkPublic = await isPharmacyNetworkPublic();
  const q = parsed.data.q.trim();

  const drugs = await db.drugCatalog.findMany({
    where: {
      active: true,
      country: "BR",
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { searchName: { contains: q.toLowerCase() } },
        { searchIngredient: { contains: q.toLowerCase() } },
      ],
    },
    select: { id: true, name: true, presentation: true },
    take: 8,
  });

  if (drugs.length === 0) {
    return NextResponse.json({
      networkPublic,
      drugs: [],
      results: [],
      message: "Nenhum medicamento encontrado no catálogo.",
    });
  }

  const drugCatalogIds = drugs.map((d) => d.id);
  const quotes = await searchPharmacyQuotes({
    drugCatalogIds,
    cep: parsed.data.cep?.replace(/\D/g, ""),
    city: parsed.data.city,
    state: parsed.data.state,
    limit: 20,
  });

  return NextResponse.json({
    networkPublic,
    drugs,
    results: quotes.map((quote) => ({
      storeId: quote.pharmacyStoreId,
      nomeFantasia: quote.nomeFantasia,
      city: quote.addressCity,
      state: quote.addressState,
      neighborhood: quote.addressNeighborhood,
      distanceKm: quote.distanceKm,
      acceptsPickup: quote.acceptsPickup,
      acceptsDelivery: quote.acceptsDelivery,
      coveragePercent: quote.coveragePercent,
      subtotalFormatted: formatCents(quote.subtotalCents),
      subtotalCents: quote.subtotalCents,
      items: quote.items.map((i) => ({
        name: i.drugName,
        presentation: i.presentation,
        priceFormatted: formatCents(i.unitPriceCents),
        priceCents: i.unitPriceCents,
      })),
    })),
  });
}
