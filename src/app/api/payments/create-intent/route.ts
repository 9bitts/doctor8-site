// src/app/api/payments/create-intent/route.ts
// Creates a Stripe PaymentIntent for a consultation booking.
// Payment must succeed before appointment is confirmed (pre-paid model).
//
// Club Doctor rules (as of this version):
//  - Consultations are ALWAYS charged in USD, regardless of user region.
//  - Active Club members get a 20% discount on the consultation price.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe, getOrCreateStripeCustomer } from "@/lib/stripe";
import { hasActiveClub, applyClubDiscount } from "@/lib/subscription";
import { z } from "zod";

const schema = z.object({
  professionalId: z.string(),
  scheduledAt: z.string().datetime(),
  type: z.enum(["TELECONSULT", "IN_PERSON"]),
  // Kept for compatibility, but consultations only use "card" for now.
  paymentMethod: z.enum(["card", "pix", "paypal"]).default("card"),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { professionalId, scheduledAt, type } = parsed.data;

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

  // Consultations are always charged in USD now.
  const currency = "usd";

  // Apply Club Doctor discount if the patient has an active subscription.
  const isMember = await hasActiveClub(session.user.id);
  const { finalAmount, discountApplied, originalAmount } = applyClubDiscount(
    professional.consultPrice, // already in cents
    isMember
  );

  // Stripe customer
  const customerId = await getOrCreateStripeCustomer(
    session.user.id,
    user.email,
    `${patient.firstName} ${patient.lastName}`
  );

  // Create PaymentIntent (card only)
  const intent = await stripe.paymentIntents.create({
    amount: finalAmount,
    currency,
    customer: customerId,
    payment_method_types: ["card"],
    metadata: {
      userId: session.user.id,
      professionalId,
      scheduledAt,
      type,
      patientName: `${patient.firstName} ${patient.lastName}`,
      doctorName: `${professional.firstName} ${professional.lastName}`,
      clubDiscount: discountApplied ? "true" : "false",
      originalAmount: String(originalAmount),
    },
    description: `Doctor8 — Consultation with Dr. ${professional.lastName} · ${new Date(scheduledAt).toLocaleDateString()}`,
  });

  return NextResponse.json({
    clientSecret: intent.client_secret,
    intentId: intent.id,
    amount: finalAmount,
    originalAmount,
    discountApplied,
    currency,
    professional: {
      name: `${professional.firstName} ${professional.lastName}`,
      specialty: professional.specialty,
    },
  });
}
