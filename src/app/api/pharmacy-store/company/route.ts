import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePharmacyStore } from "@/lib/pharmacy-store-auth";
import { db } from "@/lib/db";
import { geocodeAddress } from "@/lib/pharmacy-network/geocode";

export async function GET() {
  const ctx = await requirePharmacyStore();
  if ("error" in ctx) return ctx.error;

  const membership = await db.pharmacyStoreMember.findFirst({
    where: { userId: ctx.userId, status: "ACTIVE" },
    include: { pharmacyStore: true },
  });
  if (!membership) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const store = membership.pharmacyStore;
  const inventoryCount = await db.pharmacyStoreInventoryItem.count({
    where: { pharmacyStoreId: store.id, available: true },
  });

  return NextResponse.json({
    store: {
      id: store.id,
      cnpj: store.cnpj,
      razaoSocial: store.razaoSocial,
      nomeFantasia: store.nomeFantasia,
      slug: store.slug,
      status: store.status,
      contactEmail: store.contactEmail,
      contactPhone: store.contactPhone,
      responsibleFirstName: store.responsibleFirstName,
      responsibleLastName: store.responsibleLastName,
      addressStreet: store.addressStreet,
      addressNumber: store.addressNumber,
      addressComplement: store.addressComplement,
      addressNeighborhood: store.addressNeighborhood,
      addressCity: store.addressCity,
      addressState: store.addressState,
      addressZip: store.addressZip,
      acceptsPickup: store.acceptsPickup,
      acceptsDelivery: store.acceptsDelivery,
      deliveryRadiusKm: store.deliveryRadiusKm,
      platformFeeCents: store.platformFeeCents,
    },
    memberRole: membership.role,
    inventoryCount,
  });
}

const patchSchema = z.object({
  nomeFantasia: z.string().min(2).max(120).optional(),
  contactPhone: z.string().optional(),
  addressStreet: z.string().optional(),
  addressNumber: z.string().optional(),
  addressComplement: z.string().optional(),
  addressNeighborhood: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().max(2).optional(),
  addressZip: z.string().optional(),
  acceptsPickup: z.boolean().optional(),
  acceptsDelivery: z.boolean().optional(),
  deliveryRadiusKm: z.number().min(0).max(100).optional().nullable(),
});

export async function PATCH(req: NextRequest) {
  const ctx = await requirePharmacyStore(["OWNER", "ADMIN"], { requireActive: true });
  if ("error" in ctx) return ctx.error;

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const store = await db.pharmacyStore.update({
    where: { id: ctx.pharmacyStoreId },
    data: {
      ...(data.nomeFantasia !== undefined ? { nomeFantasia: data.nomeFantasia } : {}),
      ...(data.contactPhone !== undefined ? { contactPhone: data.contactPhone } : {}),
      ...(data.addressStreet !== undefined ? { addressStreet: data.addressStreet } : {}),
      ...(data.addressNumber !== undefined ? { addressNumber: data.addressNumber } : {}),
      ...(data.addressComplement !== undefined ? { addressComplement: data.addressComplement } : {}),
      ...(data.addressNeighborhood !== undefined ? { addressNeighborhood: data.addressNeighborhood } : {}),
      ...(data.addressCity !== undefined ? { addressCity: data.addressCity } : {}),
      ...(data.addressState !== undefined ? { addressState: data.addressState } : {}),
      ...(data.addressZip !== undefined ? { addressZip: data.addressZip?.replace(/\D/g, "") } : {}),
      ...(data.acceptsPickup !== undefined ? { acceptsPickup: data.acceptsPickup } : {}),
      ...(data.acceptsDelivery !== undefined ? { acceptsDelivery: data.acceptsDelivery } : {}),
      ...(data.deliveryRadiusKm !== undefined ? { deliveryRadiusKm: data.deliveryRadiusKm } : {}),
    },
  });

  const geo = await geocodeAddress({
    street: store.addressStreet,
    number: store.addressNumber,
    neighborhood: store.addressNeighborhood,
    city: store.addressCity,
    state: store.addressState,
    zip: store.addressZip,
  });
  if (geo) {
    await db.pharmacyStore.update({
      where: { id: store.id },
      data: { latitude: geo.latitude, longitude: geo.longitude },
    });
  }

  const updated = await db.pharmacyStore.findUnique({ where: { id: store.id } });
  return NextResponse.json({ store: updated ?? store });
}
