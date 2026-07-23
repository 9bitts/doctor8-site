// Creates a Stripe PaymentIntent for a consultation booking.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe, getOrCreateStripeCustomer } from "@/lib/stripe";
import { getConsultationPaymentMethodTypes } from "@/lib/stripe-payment-methods";
import {
  appointmentProviderFilter,
  getUnifiedProvider,
  PROVIDER_TYPE_ENUM,
  providerIdMetadataKey,
  resolveBookingProviderId,
  type ProviderType,
} from "@/lib/providers";
import { assertPaidSlotBooking, VolunteerSlotBookingError } from "@/lib/volunteer-slot-booking";
import {
  normalizeCurrency,
  resolveProviderCurrency,
  toStripeCurrency,
} from "@/lib/billing-regions";
import {
  ProviderPayoutNotReadyError,
  requireActiveConnectForPaidConsultation,
} from "@/lib/consultation-connect-split";
import { z } from "zod";

const schema = z.object({
  professionalId: z.string().optional(),
  psychoanalystId: z.string().optional(),
  integrativeTherapistId: z.string().optional(),
  providerType: z.enum(PROVIDER_TYPE_ENUM).default("health"),
  scheduledAt: z.string().datetime(),
  type: z.enum(["TELECONSULT", "IN_PERSON"]),
  paymentMethod: z.enum(["card", "pix", "paypal"]).default("card"),
  serviceId: z.string().optional(),
});

const RETURN_NOT_ELIGIBLE_MESSAGE =
  "Retorno disponível apenas para pacientes com consulta concluída com este profissional nos últimos 30 dias.";

async function getProviderUserRegion(
  providerId: string,
  providerType: ProviderType,
): Promise<string | null> {
  if (providerType === "psychoanalyst") {
    const row = await db.psychoanalystProfile.findUnique({
      where: { id: providerId },
      select: { user: { select: { region: true } } },
    });
    return row?.user?.region ?? null;
  }
  if (providerType === "integrative") {
    const row = await db.integrativeTherapistProfile.findUnique({
      where: { id: providerId },
      select: { user: { select: { region: true } } },
    });
    return row?.user?.region ?? null;
  }
  const row = await db.professionalProfile.findUnique({
    where: { id: providerId },
    select: { user: { select: { region: true } } },
  });
  return row?.user?.region ?? null;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "PATIENT_ROLE_REQUIRED" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { scheduledAt, type, providerType } = parsed.data;
  const providerId = resolveBookingProviderId({
    providerType: providerType as ProviderType,
    professionalId: parsed.data.professionalId,
    psychoanalystId: parsed.data.psychoanalystId,
    integrativeTherapistId: parsed.data.integrativeTherapistId,
  });

  if (!providerId) {
    return NextResponse.json({ error: "Provider id required" }, { status: 400 });
  }

  const provider = await getUnifiedProvider(providerId, providerType as ProviderType);
  if (!provider) return NextResponse.json({ error: "Professional not found" }, { status: 404 });

  try {
    await requireActiveConnectForPaidConsultation({
      providerId,
      providerType: providerType as ProviderType,
    });
  } catch (e) {
    if (e instanceof ProviderPayoutNotReadyError) {
      return NextResponse.json(
        {
          error: "PROVIDER_PAYOUT_NOT_READY",
          message:
            "Este profissional ainda não configurou a conta de recebimento. Escolha outro profissional ou tente mais tarde.",
        },
        { status: 409 },
      );
    }
    throw e;
  }

  try {
    await assertPaidSlotBooking(providerId, providerType as ProviderType, scheduledAt);
  } catch (e) {
    if (e instanceof VolunteerSlotBookingError && e.code === "volunteer_slot_requires_free_booking") {
      return NextResponse.json(
        { error: { general: ["This volunteer slot is free — use volunteer booking instead of payment."] } },
        { status: 400 },
      );
    }
    throw e;
  }

  const patient = await db.patientProfile.findUnique({
    where: { userId: session.user.id },
    select: { firstName: true, lastName: true },
  });
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, region: true },
  });
  if (!patient || !user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const providerRegion = await getProviderUserRegion(providerId, providerType as ProviderType);
  const providerCurrency = resolveProviderCurrency(provider.currency, providerRegion);

  let amount = provider.consultPrice;
  let chargeCurrency = providerCurrency;

  if (parsed.data.serviceId) {
    const svc = await db.providerService.findFirst({
      where: {
        id: parsed.data.serviceId,
        isActive: true,
        ...appointmentProviderFilter(providerType as ProviderType, providerId),
      },
      select: { priceCents: true, currency: true, isReturnService: true },
    });

    if (svc?.isReturnService) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const priorCompleted = await db.appointment.findFirst({
        where: {
          patient: { userId: session.user.id },
          status: "COMPLETED",
          scheduledAt: { gte: thirtyDaysAgo },
          ...appointmentProviderFilter(providerType as ProviderType, providerId),
        },
        select: { id: true },
      });
      if (!priorCompleted) {
        return NextResponse.json(
          { error: "RETURN_NOT_ELIGIBLE", message: RETURN_NOT_ELIGIBLE_MESSAGE },
          { status: 403 },
        );
      }
    }

    if (svc?.priceCents != null) amount = svc.priceCents;
    if (svc?.currency) chargeCurrency = normalizeCurrency(svc.currency);
  }

  if (chargeCurrency !== providerCurrency) {
    return NextResponse.json(
      {
        error: "CURRENCY_MISMATCH",
        providerCurrency,
        requested: chargeCurrency,
      },
      { status: 409 },
    );
  }

  const currency = toStripeCurrency(chargeCurrency);

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
  const metaKey = providerIdMetadataKey(providerType as ProviderType);

  const intent = await stripe.paymentIntents.create({
    amount,
    currency,
    customer: customerId,
    payment_method_types: getConsultationPaymentMethodTypes(currency, "card"),
    metadata: {
      kind: "consultation",
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
