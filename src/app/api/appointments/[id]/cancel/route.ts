// src/app/api/appointments/[id]/cancel/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { audit } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const reason = body.reason || "Patient requested cancellation";

  const appointment = await db.appointment.findUnique({
    where: { id: params.id },
    include: {
      patient: { select: { userId: true } },
      professional: { select: { userId: true } },
    },
  });

  if (!appointment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only patient or professional can cancel their own appointments
  const isPatient = appointment.patient.userId === session.user.id;
  const isProfessional = appointment.professional.userId === session.user.id;

  if (!isPatient && !isProfessional && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!["PENDING", "CONFIRMED"].includes(appointment.status)) {
    return NextResponse.json({ error: "Appointment cannot be cancelled" }, { status: 400 });
  }

  // Refund if paid and cancelled by patient at least 2h before
  const hoursUntil = (new Date(appointment.scheduledAt).getTime() - Date.now()) / 1000 / 3600;
  let refunded = false;

  if (appointment.stripePaymentId && isPatient && hoursUntil > 2) {
    try {
      await stripe.refunds.create({ payment_intent: appointment.stripePaymentId });
      refunded = true;
    } catch (err) {
      console.error("[CANCEL] Refund failed:", err);
    }
  }

  await db.appointment.update({
    where: { id: params.id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelledBy: session.user.id,
      cancelReason: reason,
    },
  });

  await audit.updateRecord(session.user.id, "Appointment", params.id);

  return NextResponse.json({ success: true, refunded, hoursUntil: Math.round(hoursUntil) });
}
