import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { buildQuoteForStore, resolvePrescriptionDrugIds, calcDeliveryFeeCents } from "@/lib/pharmacy-network/quote";
import { ensurePrescriptionToken } from "@/lib/pharmacy-network/prescription-token";

const createSchema = z.object({
  pharmacyStoreId: z.string(),
  prescriptionId: z.string().optional(),
  drugCatalogIds: z.array(z.string()).optional(),
  medications: z
    .array(z.object({ name: z.string(), dosage: z.string().optional() }))
    .optional(),
  fulfillmentType: z.enum(["PICKUP", "DELIVERY"]).default("PICKUP"),
  patientCep: z.string().optional(),
  deliveryAddress: z
    .object({
      street: z.string().optional(),
      number: z.string().optional(),
      complement: z.string().optional(),
      neighborhood: z.string().optional(),
      city: z.string().optional(),
      state: z.string().max(2).optional(),
      zip: z.string().optional(),
    })
    .optional(),
});

export async function GET() {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const orders = await db.pharmacyOrder.findMany({
    where: { patientUserId: ctx.userId },
    include: {
      pharmacyStore: { select: { nomeFantasia: true, slug: true } },
      items: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ orders });
}

export async function POST(req: NextRequest) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const store = await db.pharmacyStore.findFirst({
    where: { id: parsed.data.pharmacyStoreId, status: "ACTIVE" },
    include: {
      inventory: {
        where: { available: true },
        include: {
          drugCatalog: { select: { id: true, name: true, presentation: true } },
        },
      },
    },
  });
  if (!store) {
    return NextResponse.json({ error: "Farmácia não encontrada" }, { status: 404 });
  }

  let drugCatalogIds = parsed.data.drugCatalogIds ?? [];
  let prescriptionId: string | undefined = parsed.data.prescriptionId;

  if (prescriptionId) {
    const rx = await db.prescription.findFirst({
      where: {
        id: prescriptionId,
        document: { patientId: ctx.patientProfileId },
      },
    });
    if (!rx) {
      return NextResponse.json({ error: "Prescrição inválida" }, { status: 400 });
    }
    const meds = (rx.medications as { name: string; dosage?: string }[]) || [];
    const resolved = await resolvePrescriptionDrugIds(
      meds.map((m) => ({ name: m.name, dosage: m.dosage })),
    );
    drugCatalogIds = resolved.map((r) => r.drugCatalogId);
  } else if (parsed.data.medications?.length) {
    const resolved = await resolvePrescriptionDrugIds(parsed.data.medications);
    drugCatalogIds = resolved.map((r) => r.drugCatalogId);
  }

  if (drugCatalogIds.length === 0) {
    return NextResponse.json({ error: "Nenhum medicamento para pedido" }, { status: 400 });
  }

  const quote = buildQuoteForStore(store, drugCatalogIds, null);
  if (!quote || quote.items.length === 0) {
    return NextResponse.json({ error: "Farmácia sem estoque para estes itens" }, { status: 400 });
  }

  const platformFeeCents = store.platformFeeCents;
  const subtotalCents = quote.subtotalCents;
  const deliveryFeeCents = calcDeliveryFeeCents(
    store.acceptsDelivery,
    parsed.data.fulfillmentType,
  );
  if (parsed.data.fulfillmentType === "DELIVERY" && deliveryFeeCents === 0) {
    return NextResponse.json({ error: "Farmácia não oferece entrega" }, { status: 400 });
  }
  const totalCents = subtotalCents + platformFeeCents + deliveryFeeCents;

  const order = await db.pharmacyOrder.create({
    data: {
      pharmacyStoreId: store.id,
      patientUserId: ctx.userId,
      prescriptionId: prescriptionId ?? null,
      status: "PENDING_PAYMENT",
      fulfillmentType: parsed.data.fulfillmentType,
      patientCep: parsed.data.patientCep?.replace(/\D/g, ""),
      deliveryAddressJson: parsed.data.deliveryAddress ?? undefined,
      subtotalCents,
      deliveryFeeCents,
      platformFeeCents,
      totalCents,
      items: {
        create: quote.items.map((item) => ({
          drugCatalogId: item.drugCatalogId,
          pharmacyInventoryItemId: item.inventoryItemId,
          unitPriceCents: item.unitPriceCents,
          drugName: item.drugName,
          presentation: item.presentation,
        })),
      },
    },
    include: { items: true, pharmacyStore: { select: { nomeFantasia: true } } },
  });

  if (prescriptionId) {
    const tokenRow = await ensurePrescriptionToken(prescriptionId);
    await db.pharmacyPrescriptionToken.update({
      where: { id: tokenRow.id },
      data: { pharmacyOrderId: order.id, pharmacyStoreId: store.id },
    });
  }

  return NextResponse.json({ order }, { status: 201 });
}
