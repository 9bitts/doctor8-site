// src/app/api/jit/payment-intent/route.ts
// Creates a Stripe PaymentIntent for a paid JIT session.
// Called before the patient joins the queue.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe, getOrCreateStripeCustomer } from "@/lib/stripe";
import { z } from "zod";

const schema = z.object({ sessionId: z.string() });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PATIENT")
    return NextResponse.json({ error: "Only patients can pay for JIT sessions" }, { status: 403 });

  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const jitSession = await db.jitSession.findUnique({
    where:   { id: parsed.data.sessionId },
    include: { professional: { select: { firstName: true, lastName: true, specialty: true } } },
  });

  if (!jitSession || jitSession.status !== "ONLINE")
    return NextResponse.json({ error: "Session not available" }, { status: 404 });

  if (jitSession.isFree || jitSession.priceAmount === 0)
    return NextResponse.json({ error: "This session is free — no payment needed" }, { status: 400 });

  const patient = await db.patientProfile.findUnique({
    where:  { userId: session.user.id },
    select: { firstName: true, lastName: true },
  });
  const user = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { email: true },
  });

  if (!patient || !user)
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  const customerId = await getOrCreateStripeCustomer(
    session.user.id,
    user.email,
    `${patient.firstName} ${patient.lastName}`
  );

  const intent = await stripe.paymentIntents.create({
    amount:               jitSession.priceAmount,
    currency:             jitSession.currency.toLowerCase(),
    customer:             customerId,
    payment_method_types: ["card"],
    metadata: {
      userId:     session.user.id,
      sessionId:  jitSession.id,
      type:       "JIT",
      doctorName: `${jitSession.professional.firstName} ${jitSession.professional.lastName}`,
    },
    description: `Doctor8 — Plantão Online · Dr. ${jitSession.professional.lastName} · ${jitSession.professional.specialty}`,
  });

  return NextResponse.json({
    clientSecret: intent.client_secret,
    amount:       jitSession.priceAmount,
    currency:     jitSession.currency,
  });
}
