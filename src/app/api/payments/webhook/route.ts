// src/app/api/payments/webhook/route.ts
// Stripe webhook — called by Stripe when payment events happen
// This is where appointments get confirmed after successful payment

import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { sendAppointmentConfirmation } from "@/lib/email";
import { nanoid } from "nanoid";
import { createAuditLog } from "@/lib/audit";
import { AuditAction } from "@prisma/client";

// IMPORTANT: webhook endpoint must use raw body, not parsed JSON
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) return NextResponse.json({ error: "No signature" }, { status: 400 });

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("[WEBHOOK] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {

    // ─── PAYMENT SUCCEEDED → CONFIRM APPOINTMENT ───────────
    case "payment_intent.succeeded": {
      const intent = event.data.object;
      const { userId, professionalId, scheduledAt, type } = intent.metadata;

      if (!userId || !professionalId || !scheduledAt) break;

      // Get patient and professional details
      const [patient, professional, user] = await Promise.all([
        db.patientProfile.findUnique({
          where: { userId },
          select: { id: true, firstName: true, lastName: true },
        }),
        db.professionalProfile.findUnique({
          where: { id: professionalId },
          select: { firstName: true, lastName: true, specialty: true },
        }),
        db.user.findUnique({ where: { id: userId }, select: { email: true } }),
      ]);

      if (!patient || !professional || !user) break;

      // Generate meeting room for teleconsult
      const meetingRoomId = type === "TELECONSULT" ? nanoid(16) : undefined;
      const meetingUrl = meetingRoomId
        ? `${process.env.NEXT_PUBLIC_APP_URL}/room/${meetingRoomId}`
        : undefined;

      // Create confirmed appointment
      const appointment = await db.appointment.create({
        data: {
          patientId: patient.id,
          professionalId,
          scheduledAt: new Date(scheduledAt),
          type: type as "TELECONSULT" | "IN_PERSON",
          status: "CONFIRMED",
          priceAmount: intent.amount,
          currency: intent.currency,
          stripePaymentId: intent.id,
          paidAt: new Date(),
          meetingRoomId,
          meetingUrl,
        },
      });

      // Audit log
      await createAuditLog({
        userId,
        action: AuditAction.PAYMENT,
        resource: "Appointment",
        resourceId: appointment.id,
        details: { amount: intent.amount, currency: intent.currency },
      });

      // Send confirmation email
      await sendAppointmentConfirmation({
        patientEmail: user.email,
        patientName: `${patient.firstName} ${patient.lastName}`,
        doctorName: `${professional.firstName} ${professional.lastName}`,
        specialty: professional.specialty,
        scheduledAt: new Date(scheduledAt),
        type,
        meetingUrl,
        appointmentId: appointment.id,
      });

      break;
    }

    // ─── PAYMENT FAILED ─────────────────────────────────────
    case "payment_intent.payment_failed": {
      const intent = event.data.object;
      console.log("[WEBHOOK] Payment failed:", intent.id);
      // Optionally notify user of failed payment
      break;
    }

    // ─── SUBSCRIPTION EVENTS ─────────────────────────────────
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object;
      const customer = await stripe.customers.retrieve(sub.customer as string);

      if (customer.deleted) break;

      const userId = (customer as { metadata: { userId: string } }).metadata.userId;
      if (!userId) break;

      await db.subscription.upsert({
        where: { userId },
        create: {
          userId,
          stripeCustomerId: sub.customer as string,
          stripeSubscriptionId: sub.id,
          stripePriceId: sub.items.data[0]?.price.id,
          status: sub.status,
          currentPeriodStart: new Date((sub as { current_period_start: number }).current_period_start * 1000),
          currentPeriodEnd: new Date((sub as { current_period_end: number }).current_period_end * 1000),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        },
        update: {
          stripeSubscriptionId: sub.id,
          stripePriceId: sub.items.data[0]?.price.id,
          status: sub.status,
          currentPeriodStart: new Date((sub as { current_period_start: number }).current_period_start * 1000),
          currentPeriodEnd: new Date((sub as { current_period_end: number }).current_period_end * 1000),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        },
      });
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object;
      await db.subscription.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: { status: "cancelled" },
      });
      break;
    }

    default:
      console.log(`[WEBHOOK] Unhandled event: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

// CRITICAL: disable body parser for webhooks
export const config = { api: { bodyParser: false } };
