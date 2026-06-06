// src/app/api/payments/create-intent/route.ts
// Creates a Stripe PaymentIntent for a consultation booking
// Payment must succeed before appointment is confirmed (pre-paid model)

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe, getCurrency, getOrCreateStripeCustomer } from "@/lib/stripe";
import { z } from "zod";

const schema = z.object({
  professionalId: z.string(),
  scheduledAt: z.string().datetime(),
  type: z.enum(["TELECONSULT", "IN_PERSON"]),
  paymentMethod: z.enum(["card", "pix", "paypal"]).default("card"),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { professionalId, scheduledAt, type, paymentMethod } = parsed.data;

  // Get professional pricing
  const professional = await db.professionalProfile.findUnique({
    where: { id: professionalId },
    select: { consultPrice: true, currency: true, firstName: true, lastName: true, specialty: true },
  });
  if (!professional) return NextResponse.json({ error: "Professional not found" }, { status: 404 });

  // Get patient info for Stripe customer
  const patient = await db.patientProfile.findUnique({
    where: { userId: session.user.id },
    select: { firstName: true, lastName: true },
  });

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, region: true },
  });

  if (!patient || !user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const currency = getCurrency(user.region);
  const amount = professional.consultPrice; // already in cents

  // Stripe customer
  const customerId = await getOrCreateStripeCustomer(
    session.user.id,
    user.email,
    `${patient.firstName} ${patient.lastName}`
  );

  // Payment method types per region and user choice
  const paymentMethodTypes: string[] = [];

  if (paymentMethod === "card") {
    paymentMethodTypes.push("card");
  } else if (paymentMethod === "pix" && currency === "brl") {
    paymentMethodTypes.push("pix");
  } else if (paymentMethod === "paypal") {
    paymentMethodTypes.push("paypal");
  } else {
    paymentMethodTypes.push("card"); // fallback
  }

  // Create PaymentIntent
  const intent = await stripe.paymentIntents.create({
    amount,
    currency,
    customer: customerId,
    payment_method_types: paymentMethodTypes,
    metadata: {
      userId: session.user.id,
      professionalId,
      scheduledAt,
      type,
      patientName: `${patient.firstName} ${patient.lastName}`,
      doctorName: `${professional.firstName} ${professional.lastName}`,
    },
    description: `Doctor8 — Consultation with Dr. ${professional.lastName} · ${new Date(scheduledAt).toLocaleDateString()}`,
    // PIX expiry — 30 minutes
    ...(paymentMethod === "pix" ? {
      payment_method_options: {
        pix: { expires_after_seconds: 1800 },
      },
    } : {}),
  });

  return NextResponse.json({
    clientSecret: intent.client_secret,
    intentId: intent.id,
    amount,
    currency,
    professional: {
      name: `${professional.firstName} ${professional.lastName}`,
      specialty: professional.specialty,
    },
  });
}
