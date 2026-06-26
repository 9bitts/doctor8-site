// Stripe Checkout for consultations (PIX, boleto, card in BRL).

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe, getOrCreateStripeCustomer } from "@/lib/stripe";
import { getUnifiedProvider, type ProviderType } from "@/lib/providers";
import {
  getConsultationPaymentMethodTypes,
  needsBrazilTaxId,
  type ConsultationPaymentMethod,
} from "@/lib/stripe-payment-methods";
import { z } from "zod";

const schema = z.object({
  professionalId: z.string().optional(),
  psychoanalystId: z.string().optional(),
  providerType: z.enum(["health", "psychoanalyst"]).default("health"),
  scheduledAt: z.string().datetime(),
  type: z.enum(["TELECONSULT", "IN_PERSON"]),
  paymentMethod: z.enum(["card", "pix", "boleto", "all"]).default("all"),
  serviceId: z.string().optional(),
  serviceName: z.string().optional(),
  visitReason: z.string().max(2000).optional(),
  healthPlanSlug: z.string().max(80).optional(),
  healthPlanLabel: z.string().max(120).optional(),
  acceptedCancellationPolicy: z.boolean(),
  bookingSource: z
    .enum(["patient_panel", "public_profile", "public_search", "public_embed", "referral"])
    .optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  if (!parsed.data.acceptedCancellationPolicy) {
    return NextResponse.json(
      { error: { general: ["Cancellation policy must be accepted."] } },
      { status: 400 },
    );
  }

  const { scheduledAt, type, providerType, paymentMethod } = parsed.data;
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

  let amount = provider.consultPrice;
  let currency = (provider.currency || "BRL").toLowerCase();
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

  if (currency !== "brl") {
    return NextResponse.json(
      { error: "Hosted checkout with PIX/boleto is only available for BRL." },
      { status: 400 },
    );
  }

  const customerId = await getOrCreateStripeCustomer(
    session.user.id,
    user.email,
    `${patient.firstName} ${patient.lastName}`,
  );

  const providerName = `${provider.firstName} ${provider.lastName}`;
  const metaKey = providerType === "psychoanalyst" ? "psychoanalystId" : "professionalId";
  const durationMins =
    providerType === "psychoanalyst" && "sessionDurationMins" in provider
      ? String((provider as { sessionDurationMins: number }).sessionDurationMins)
      : "30";

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.doctor8.org";
  const methodTypes = getConsultationPaymentMethodTypes(
    currency,
    paymentMethod as ConsultationPaymentMethod,
  );

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    payment_method_types: methodTypes as ("card" | "pix" | "boleto")[],
    line_items: [
      {
        price_data: {
          currency,
          unit_amount: amount,
          product_data: {
            name: `Consulta Doctor8 - ${providerName}`,
            description: `${new Date(scheduledAt).toLocaleString("pt-BR")} - ${type}`,
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/patient/appointments?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/patient/appointments?checkout=cancelled`,
    metadata: {
      kind: "consultation",
      userId: session.user.id,
      providerType,
      [metaKey]: providerId,
      scheduledAt,
      type,
      patientName: `${patient.firstName} ${patient.lastName}`,
      doctorName: providerName,
      providerSpecialty: provider.specialty,
      durationMins,
      visitReason: parsed.data.visitReason?.trim() || "",
      healthPlanSlug: parsed.data.healthPlanSlug || "particular",
      healthPlanLabel: parsed.data.healthPlanLabel || "Particular",
      serviceId: parsed.data.serviceId || "",
      serviceName: parsed.data.serviceName || "",
      acceptedCancellationPolicy: String(parsed.data.acceptedCancellationPolicy),
      bookingSource: parsed.data.bookingSource || "patient_panel",
    },
    ...(needsBrazilTaxId(currency)
      ? {
          tax_id_collection: { enabled: true },
          billing_address_collection: "required" as const,
        }
      : {}),
  });

  return NextResponse.json({ checkoutUrl: checkoutSession.url });
}
