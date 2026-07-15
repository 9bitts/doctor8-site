import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { stripe, getOrCreateStripeCustomer } from "@/lib/stripe";
import {
  getConsultationPaymentMethodTypes,
  type ConsultationPaymentMethod,
} from "@/lib/stripe-payment-methods";
import { getAppUrl } from "@/lib/email-core";
import {
  fulfillImportOrderPayment,
  parseImportOrderMeta,
} from "@/lib/fulfill-import-order";

const bodySchema = z.object({
  paymentMethod: z.enum(["card", "pix", "boleto", "all"]).default("all"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  const paymentMethod: ConsultationPaymentMethod = parsed.success
    ? parsed.data.paymentMethod
    : "all";

  const order = await db.importOrder.findFirst({
    where: { id, patientUserId: ctx.userId },
    include: { product: { select: { name: true } } },
  });
  if (!order) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }
  if (order.status !== "PAYMENT_PENDING") {
    return NextResponse.json({ error: "Pedido não está aguardando pagamento" }, { status: 400 });
  }
  if (order.feeBrlCents < 50) {
    return NextResponse.json({ error: "Taxa inválida para cobrança" }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { id: ctx.userId },
    select: { email: true },
  });
  const patient = await db.patientProfile.findUnique({
    where: { userId: ctx.userId },
    select: { firstName: true, lastName: true },
  });
  if (!user?.email || !patient) {
    return NextResponse.json({ error: "Perfil incompleto" }, { status: 400 });
  }

  if (order.stripePaymentIntentId) {
    const existing = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
    if (existing.status === "succeeded") {
      const meta = parseImportOrderMeta({
        type: "import_order",
        importOrderId: order.id,
        patientUserId: ctx.userId,
      });
      if (meta) {
        const updated = await fulfillImportOrderPayment(meta, existing.amount, {
          stripePaymentIntentId: existing.id,
        });
        return NextResponse.json({ alreadyPaid: true, orderId: order.id, order: updated });
      }
    }
  }

  const customerId = await getOrCreateStripeCustomer(
    ctx.userId,
    user.email,
    `${patient.firstName} ${patient.lastName}`.trim(),
  );

  const appUrl = getAppUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    payment_method_types: getConsultationPaymentMethodTypes("brl", paymentMethod) as (
      | "card"
      | "pix"
      | "boleto"
    )[],
    line_items: [
      {
        price_data: {
          currency: "brl",
          product_data: {
            name: `Doctor8 Importação — taxa ${order.feePercent}% · ${order.product.name}`,
            description: "Taxa de plataforma Doctor8 (produto Zephra USD à parte)",
          },
          unit_amount: order.feeBrlCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      type: "import_order",
      importOrderId: order.id,
      patientUserId: ctx.userId,
    },
    success_url: `${appUrl}/patient/importacao/${order.id}?paid=1`,
    cancel_url: `${appUrl}/patient/importacao/${order.id}?cancelled=1`,
  });

  await db.importOrder.update({
    where: { id: order.id },
    data: { stripeCheckoutSessionId: session.id },
  });

  return NextResponse.json({
    checkoutUrl: session.url,
    orderId: order.id,
    amountCents: order.feeBrlCents,
    paymentMethod,
  });
}
