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

const bodySchema = z.object({
  paymentMethod: z.enum(["card", "pix", "boleto", "all"]).default("card"),
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
    : "card";

  const order = await db.pharmacyOrder.findFirst({
    where: { id, patientUserId: ctx.userId },
    include: { pharmacyStore: { select: { nomeFantasia: true } } },
  });
  if (!order) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }
  if (order.status !== "PENDING_PAYMENT") {
    return NextResponse.json({ error: "Pedido já pago ou cancelado" }, { status: 400 });
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

  const customerId = await getOrCreateStripeCustomer(
    ctx.userId,
    user.email,
    `${patient.firstName} ${patient.lastName}`.trim(),
  );

  if (order.stripePaymentIntentId && paymentMethod === "card") {
    const existing = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
    if (existing.status === "succeeded") {
      const { fulfillPharmacyOrderPayment } = await import("@/lib/fulfill-pharmacy-order");
      const updated = await fulfillPharmacyOrderPayment(
        {
          type: "pharmacy_order",
          pharmacyOrderId: order.id,
          patientUserId: ctx.userId,
          pharmacyStoreId: order.pharmacyStoreId,
        },
        existing.amount,
      );
      return NextResponse.json({
        clientSecret: existing.client_secret,
        orderId: order.id,
        alreadyPaid: true,
        order: updated,
      });
    }
    if (existing.client_secret && existing.payment_method_types?.includes("card")) {
      return NextResponse.json({
        clientSecret: existing.client_secret,
        orderId: order.id,
        amountCents: order.totalCents,
        paymentMethod: "card",
      });
    }
  }

  if (paymentMethod !== "card") {
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
              name: `Doctor8 Farmácias — ${order.pharmacyStore.nomeFantasia}`,
            },
            unit_amount: order.totalCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "pharmacy_order",
        pharmacyOrderId: order.id,
        patientUserId: ctx.userId,
        pharmacyStoreId: order.pharmacyStoreId,
      },
      success_url: `${appUrl}/patient/pharmacy/orders?paid=${order.id}`,
      cancel_url: `${appUrl}/patient/pharmacy/buy?cancelled=1`,
    });
    return NextResponse.json({
      checkoutUrl: session.url,
      orderId: order.id,
      paymentMethod,
    });
  }

  const intent = await stripe.paymentIntents.create({
    amount: order.totalCents,
    currency: "brl",
    customer: customerId,
    payment_method_types: getConsultationPaymentMethodTypes("brl", "card"),
    metadata: {
      type: "pharmacy_order",
      pharmacyOrderId: order.id,
      patientUserId: ctx.userId,
      pharmacyStoreId: order.pharmacyStoreId,
    },
    description: `Doctor8 Farmácias — ${order.pharmacyStore.nomeFantasia}`,
  });

  await db.pharmacyOrder.update({
    where: { id: order.id },
    data: { stripePaymentIntentId: intent.id },
  });

  return NextResponse.json({
    clientSecret: intent.client_secret,
    orderId: order.id,
    amountCents: order.totalCents,
    paymentMethod: "card",
  });
}
