import { NextRequest, NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { fulfillPharmacyOrderPayment, parsePharmacyOrderMeta } from "@/lib/fulfill-pharmacy-order";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const { id } = await params;
  const order = await db.pharmacyOrder.findFirst({
    where: { id, patientUserId: ctx.userId },
  });
  if (!order) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }
  if (order.status === "PAID" || order.status === "CONFIRMED") {
    return NextResponse.json({ order, alreadyPaid: true });
  }
  if (!order.stripePaymentIntentId) {
    return NextResponse.json({ error: "Pagamento não iniciado" }, { status: 400 });
  }

  const intent = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
  if (intent.status !== "succeeded") {
    return NextResponse.json({ error: "Pagamento pendente", status: intent.status }, { status: 402 });
  }

  const meta = parsePharmacyOrderMeta(intent.metadata as Record<string, string>);
  if (!meta) {
    return NextResponse.json({ error: "Metadata inválida" }, { status: 400 });
  }

  const updated = await fulfillPharmacyOrderPayment(meta, intent.amount);
  return NextResponse.json({ order: updated });
}
