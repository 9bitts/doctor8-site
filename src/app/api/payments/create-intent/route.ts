// Creates a Stripe PaymentIntent for a consultation booking.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe, getOrCreateStripeCustomer, getCurrency } from "@/lib/stripe";
import { getConsultationPaymentMethodTypes } from "@/lib/stripe-payment-methods";
import { getUnifiedProvider, type ProviderType } from "@/lib/providers";
import { z } from "zod";

const schema = z.object({
  professionalId: z.string().optional(),
  psychoanalystId: z.string().optional(),
  providerType: z.enum(["health", "psychoanalyst"]).default("health"),
  scheduledAt: z.string().datetime(),
  type: z.enum(["TELECONSULT", "IN_PERSON"]),
  paymentMethod: z.enum(["card", "pix", "paypal"]).default("card"),
  serviceId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { scheduledAt, type, providerType } = parsed.data;
  const providerId =
    providerType === "psychoanalyst"
      ? parsed.data.psychoanalystId || parsed.data.professionalId
      : parsed.data.professionalId || parsed.data.psychoanalystId;

  if (!providerId) {
    return NextResponse.json({ error: "Provider id required" }, { status: 400 });
  }

  const provider = await getUnifiedProvider(providerId, providerType as ProviderType);
  if (!provider) return NextResponse.json({ error: "Professional not found" }, { status: 404 });

  const patient = await db.patientProfile.findUnique({
    where: { userId: session.user.id },
    select: { firstName: true, lastName: true },
  });
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, region: true },
  });
  if (!patient || !user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  let currency = (provider.currency || getCurrency(user.region || "US")).toLowerCase();

  let amount = provider.consultPrice;
  if (parsed.data.serviceId) {
    const svc = await db.providerService.findFirst({
      where: {
        id: parsed.data.serviceId,
        isActive: true,
        ...(providerType === "psychoanalyst"
          ? { psychoanalystId: providerId }
          : { professionalId: providerId }),
      },
    });
    if (svc?.priceCents != null) amount = svc.priceCents;
    if (svc?.currency) currency = svc.currency.toLowerCase();
  }

  const { paymentMethod } = parsed.data;
  if (currency === "brl" && paymentMethod !== "card") {
    return NextResponse.json(
      { error: "Use checkout for PIX or boleto.", useCheckout: true },
      { status: 400 },
    );
  }

  const customerId = await getOrCreateStripeCustomer(
    session.user.id,
    user.email,
    `${patient.firstName} ${patient.lastName}`
  );

  const providerName = `${provider.firstName} ${provider.lastName}`;
  const metaKey = providerType === "psychoanalyst" ? "psychoanalystId" : "professionalId";

  const intent = await stripe.paymentIntents.create({
    amount,
    currency,
    customer: customerId,
    payment_method_types: getConsultationPaymentMethodTypes(currency, "card"),
    metadata: {
      userId: session.user.id,
      providerType,
      [metaKey]: providerId,
      scheduledAt,
      type,
      patientName: `${patient.firstName} ${patient.lastName}`,
      doctorName: providerName,
    },
    description: `Doctor8 - Consultation with ${providerName} - ${new Date(scheduledAt).toLocaleDateString()}`,
  });

  return NextResponse.json({
    clientSecret: intent.client_secret,
    intentId: intent.id,
    amount,
    currency,
    professional: {
      name: providerName,
      specialty: provider.specialty,
      providerType,
    },
  });
}
