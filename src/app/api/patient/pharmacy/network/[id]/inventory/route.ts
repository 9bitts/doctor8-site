import { NextRequest, NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import {
  getPharmacyStoreInventoryPrices,
  isPharmacyNetworkPublic,
  type MedicationLine,
} from "@/lib/pharmacy-network/quote";

type RouteParams = { params: Promise<{ id: string }> };

function parseMedications(raw: string | null): MedicationLine[] | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as { name: string; dosage?: string; presentation?: string }[];
    if (!Array.isArray(parsed)) return undefined;
    return parsed
      .filter((m) => typeof m.name === "string" && m.name.trim())
      .map((m) => ({
        name: m.name,
        dosage: m.dosage,
        presentation: m.presentation ?? m.dosage,
      }));
  } catch {
    return undefined;
  }
}

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const networkPublic = await isPharmacyNetworkPublic();
  if (!networkPublic) {
    return NextResponse.json({ error: "Rede indisponível" }, { status: 403 });
  }

  const { id } = await params;
  const store = await db.pharmacyStore.findFirst({
    where: { id, status: "ACTIVE" },
    select: {
      id: true,
      nomeFantasia: true,
      addressStreet: true,
      addressNumber: true,
      addressNeighborhood: true,
      addressCity: true,
      addressState: true,
      addressZip: true,
      acceptsPickup: true,
      acceptsDelivery: true,
      contactPhone: true,
    },
  });

  if (!store) {
    return NextResponse.json({ error: "Farmácia não encontrada" }, { status: 404 });
  }

  const drugQ = req.nextUrl.searchParams.get("drugQ")?.trim() || undefined;
  const medications = parseMedications(req.nextUrl.searchParams.get("medications"));
  const items = await getPharmacyStoreInventoryPrices(id, drugQ, medications);

  return NextResponse.json({
    store,
    items: items.map((item) => ({
      ...item,
      priceFormatted: formatCents(item.priceCents),
    })),
  });
}
