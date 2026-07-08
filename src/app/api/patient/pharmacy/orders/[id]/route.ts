import { NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { prescriptionQrUrl } from "@/lib/pharmacy-network/prescription-token";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const { id } = await params;
  const order = await db.pharmacyOrder.findFirst({
    where: { id, patientUserId: ctx.userId },
    include: {
      pharmacyStore: { select: { nomeFantasia: true, slug: true, addressCity: true, addressState: true } },
      items: true,
      prescriptionToken: { select: { token: true, status: true } },
    },
  });
  if (!order) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    order: {
      ...order,
      validateUrl: order.prescriptionToken?.token
        ? prescriptionQrUrl(order.prescriptionToken.token)
        : null,
    },
  });
}
