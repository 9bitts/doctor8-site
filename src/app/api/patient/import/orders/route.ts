import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import {
  IMPORT_MAX_TREATMENT_DAYS,
  assignActiveDistributorId,
  computeFeeBrlCents,
  maxQuantityForProduct,
} from "@/lib/import-order";

const docSchema = z.object({
  kind: z.enum(["ID_DOCUMENT", "ADDRESS_PROOF", "MEDICAL_REPORT", "OTHER"]),
  fileKey: z.string().min(3).max(500),
  fileName: z.string().max(240).optional(),
  mimeType: z.string().max(120).optional(),
});

const createSchema = z.object({
  productId: z.string().min(1),
  prescriptionId: z.string().optional(),
  quantity: z.number().int().min(1).max(12).default(1),
  treatmentDays: z.number().int().min(1).max(IMPORT_MAX_TREATMENT_DAYS).default(90),
  shipName: z.string().min(2).max(200),
  shipCpf: z.string().max(20).optional(),
  shipPhone: z.string().max(30).optional(),
  shipLine1: z.string().min(2).max(200),
  shipLine2: z.string().max(200).optional(),
  shipCity: z.string().min(2).max(100),
  shipState: z.string().min(2).max(2),
  shipZip: z.string().min(4).max(20),
  patientNotes: z.string().max(2000).optional(),
  documents: z.array(docSchema).min(1).max(10),
});

export async function GET() {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const orders = await db.importOrder.findMany({
    where: { patientUserId: ctx.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      product: { select: { name: true, slug: true, strengthMg: true } },
      events: { orderBy: { createdAt: "asc" }, take: 40 },
      documents: { select: { id: true, kind: true, fileName: true, createdAt: true } },
    },
  });

  return NextResponse.json({ orders });
}

export async function POST(req: NextRequest) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const data = parsed.data;

  const product = await db.importProduct.findFirst({
    where: { id: data.productId, active: true },
  });
  if (!product) {
    return NextResponse.json({ error: { productId: ["Product not available"] } }, { status: 400 });
  }

  const maxQty = maxQuantityForProduct(product.daysPerUnit, data.treatmentDays);
  if (data.quantity > maxQty) {
    return NextResponse.json(
      { error: { quantity: [`Max quantity for this treatment window is ${maxQty}`] } },
      { status: 400 },
    );
  }

  // Validate prescription ownership if provided
  if (data.prescriptionId) {
    const rx = await db.prescription.findFirst({
      where: {
        id: data.prescriptionId,
        document: { patientId: ctx.patientProfileId },
      },
      select: { id: true, signatureStatus: true, signedFileUrl: true, validUntil: true },
    });
    if (!rx) {
      return NextResponse.json({ error: { prescriptionId: ["Prescription not found"] } }, { status: 404 });
    }
    if (rx.validUntil && rx.validUntil < new Date()) {
      return NextResponse.json({ error: { prescriptionId: ["Prescription expired"] } }, { status: 400 });
    }
    if (rx.signatureStatus !== "SIGNED" && !rx.signedFileUrl) {
      return NextResponse.json({ error: { prescriptionId: ["Prescription must be signed"] } }, { status: 400 });
    }
  }

  const prefix = `import-docs/${ctx.userId}`;
  for (const doc of data.documents) {
    if (!doc.fileKey.startsWith(prefix)) {
      return NextResponse.json({ error: { documents: ["Invalid document upload"] } }, { status: 400 });
    }
  }

  const hasId = data.documents.some((d) => d.kind === "ID_DOCUMENT");
  if (!hasId) {
    return NextResponse.json(
      { error: { documents: ["ID document is required"] } },
      { status: 400 },
    );
  }

  const distributorId = product.distributorId || (await assignActiveDistributorId());
  let feePercent = 15;
  if (distributorId) {
    const dist = await db.distributor.findUnique({
      where: { id: distributorId },
      select: { platformFeePercent: true, status: true },
    });
    if (dist?.status === "ACTIVE") feePercent = dist.platformFeePercent;
  }

  const feeBrlCents = computeFeeBrlCents({
    productUsdCents: product.priceUsdCents,
    shippingUsdCents: product.shippingUsdCents,
    quantity: data.quantity,
    feePercent,
  });

  const order = await db.$transaction(async (tx) => {
    const created = await tx.importOrder.create({
      data: {
        patientUserId: ctx.userId,
        prescriptionId: data.prescriptionId || null,
        productId: product.id,
        distributorId,
        status: "DOCUMENTS_SUBMITTED",
        quantity: data.quantity,
        treatmentDays: data.treatmentDays,
        productUsdCents: product.priceUsdCents,
        shippingUsdCents: product.shippingUsdCents,
        feePercent,
        feeBrlCents,
        shipName: data.shipName.trim(),
        shipCpf: data.shipCpf?.replace(/\D/g, "") || null,
        shipPhone: data.shipPhone?.trim() || null,
        shipLine1: data.shipLine1.trim(),
        shipLine2: data.shipLine2?.trim() || null,
        shipCity: data.shipCity.trim(),
        shipState: data.shipState.trim().toUpperCase(),
        shipZip: data.shipZip.replace(/\D/g, ""),
        shipCountry: "BR",
        patientNotes: data.patientNotes?.trim() || null,
        documents: {
          create: data.documents.map((d) => ({
            kind: d.kind,
            fileKey: d.fileKey,
            fileName: d.fileName || null,
            mimeType: d.mimeType || null,
            uploadedBy: ctx.userId,
          })),
        },
      },
      include: { product: { select: { name: true, slug: true } } },
    });

    await tx.importOrderEvent.create({
      data: {
        orderId: created.id,
        fromStatus: null,
        toStatus: "DOCUMENTS_SUBMITTED",
        note: "Patient submitted import request",
        actorUserId: ctx.userId,
      },
    });

    return created;
  });

  const { notifyImportOrderTransition } = await import("@/lib/import-order-notify");
  notifyImportOrderTransition(order.id, null, "DOCUMENTS_SUBMITTED").catch((e) =>
    console.error("[IMPORT ORDER NOTIFY]", e),
  );

  return NextResponse.json({ order }, { status: 201 });
}
