import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { ImportOrderStatus } from "@prisma/client";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { recordImportOrderEvent } from "@/lib/import-order";

const patchSchema = z.object({
  action: z.enum([
    "approve_documents",
    "request_document_fix",
    "mark_anvisa_pending",
    "authorize_anvisa",
    "reject_anvisa",
    "mark_payment_pending",
    "mark_paid",
    "mark_ready_to_ship",
    "cancel",
  ]),
  anvisaInstrumentType: z.string().max(80).optional(),
  anvisaAuthorizationNumber: z.string().max(120).optional(),
  anvisaExpiresAt: z.string().datetime().optional(),
  anvisaRejectReason: z.string().max(1000).optional(),
  adminNotes: z.string().max(2000).optional(),
  paymentNotes: z.string().max(2000).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const order = await db.importOrder.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data = parsed.data;
  let nextStatus: ImportOrderStatus = order.status;
  const update: Record<string, unknown> = {};

  switch (data.action) {
    case "approve_documents":
      nextStatus = "DOCUMENTS_APPROVED";
      break;
    case "request_document_fix":
      nextStatus = "DOCUMENTS_NEEDS_FIX";
      break;
    case "mark_anvisa_pending":
      nextStatus = "ANVISA_PENDING";
      break;
    case "authorize_anvisa":
      if (!data.anvisaAuthorizationNumber?.trim()) {
        return NextResponse.json(
          { error: { anvisaAuthorizationNumber: ["Required"] } },
          { status: 400 },
        );
      }
      nextStatus = "PAYMENT_PENDING";
      update.anvisaInstrumentType = data.anvisaInstrumentType?.trim() || "SEI_EXCEPCIONALIDADE";
      update.anvisaAuthorizationNumber = data.anvisaAuthorizationNumber.trim();
      update.anvisaAuthorizedAt = new Date();
      if (data.anvisaExpiresAt) update.anvisaExpiresAt = new Date(data.anvisaExpiresAt);
      break;
    case "reject_anvisa":
      nextStatus = "ANVISA_REJECTED";
      update.anvisaRejectReason = data.anvisaRejectReason?.trim() || "Rejected";
      break;
    case "mark_payment_pending":
      nextStatus = "PAYMENT_PENDING";
      break;
    case "mark_paid":
      nextStatus = "PAID";
      update.paidAt = new Date();
      if (data.paymentNotes) update.paymentNotes = data.paymentNotes.trim();
      break;
    case "mark_ready_to_ship":
      nextStatus = "READY_TO_SHIP";
      break;
    case "cancel":
      nextStatus = "CANCELLED";
      break;
  }

  if (data.adminNotes !== undefined) {
    update.adminNotes = data.adminNotes.trim() || null;
  }

  const updated = await db.importOrder.update({
    where: { id },
    data: {
      ...update,
      status: nextStatus,
    },
  });

  await recordImportOrderEvent({
    orderId: id,
    fromStatus: order.status,
    toStatus: nextStatus,
    note: data.action,
    actorUserId: session.user.id,
  });

  if (order.status !== nextStatus) {
    const { notifyImportOrderTransition } = await import("@/lib/import-order-notify");
    notifyImportOrderTransition(id, order.status, nextStatus).catch((e) =>
      console.error("[IMPORT ORDER NOTIFY]", e),
    );
  }

  return NextResponse.json({ order: updated });
}
