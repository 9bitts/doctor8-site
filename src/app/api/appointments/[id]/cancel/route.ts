// src/app/api/appointments/[id]/cancel/route.ts
// Cancellation with full CDC rules:
// - Within 7 days of booking AND before appointment: 100% refund
// - More than 24h before appointment: 100% refund
// - Less than 24h before appointment: no refund (policy accepted at checkout)
// - Professional absent: 100% refund always
// - Professional can always cancel (triggers full refund)

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { audit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { storedNotificationText } from "@/lib/notification-i18n";
import { localeOf } from "@/lib/i18n/translations";
import { notifySlotAlerts } from "@/lib/slot-alerts";
import { safeDecrypt } from "@/lib/psychoanalyst-api";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const reason = body.reason || "Patient requested cancellation";
  const cancelledByPro = body.cancelledByProfessional === true;

  const appointment = await db.appointment.findUnique({
    where: { id: params.id },
    include: {
      patient:      { select: { userId: true, firstName: true, lastName: true } },
      professional: { select: { userId: true, firstName: true, lastName: true } },
      psychoanalyst: { select: { userId: true, firstName: true, lastName: true } },
    },
  });

  if (!appointment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const providerUserId = appointment.professional?.userId ?? appointment.psychoanalyst?.userId;
  const provider = appointment.professional ?? appointment.psychoanalyst;

  const isPatient      = appointment.patient.userId === session.user.id;
  const isProfessional = providerUserId === session.user.id;
  const isAdmin        = session.user.role === "ADMIN";

  if (!isPatient && !isProfessional && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!["PENDING", "CONFIRMED"].includes(appointment.status)) {
    return NextResponse.json({ error: "Appointment cannot be cancelled" }, { status: 400 });
  }

  const now        = Date.now();
  const apptTime   = new Date(appointment.scheduledAt).getTime();
  const paidTime   = appointment.paidAt ? new Date(appointment.paidAt).getTime() : null;
  const hoursUntil = (apptTime - now) / 3600000;
  const daysSincePurchase = paidTime ? (now - paidTime) / 86400000 : 999;

  // ── Refund logic ──────────────────────────────────────────────────────────
  // Rule 1: Professional cancels → always full refund
  // Rule 2: Patient within 7-day CDC window AND appointment hasn't happened → full refund
  // Rule 3: Patient cancels >24h before → full refund
  // Rule 4: Patient cancels <24h before → no refund
  let refunded     = false;
  let refundReason = "";

  const shouldRefund =
    isProfessional ||   // Rule 1
    (isPatient && daysSincePurchase <= 7 && hoursUntil > 0) ||  // Rule 2 CDC
    (isPatient && hoursUntil > 24);                              // Rule 3

  if (shouldRefund && appointment.stripePaymentId) {
    if (isProfessional)                              refundReason = "professional_cancelled";
    else if (daysSincePurchase <= 7 && hoursUntil > 24) refundReason = "cdc_7days";
    else                                             refundReason = "more_than_24h";

    try {
      await stripe.refunds.create({
        payment_intent: appointment.stripePaymentId,
        reason: "requested_by_customer",
        metadata: { refundReason, appointmentId: params.id },
      });
      refunded = true;
    } catch (err) {
      console.error("[CANCEL] Refund failed:", err);
    }
  }

  await db.appointment.update({
    where: { id: params.id },
    data: {
      status:      "CANCELLED",
      cancelledAt: new Date(),
      cancelledBy: session.user.id,
      cancelReason: reason,
    },
  });

  await audit.updateRecord(session.user.id, "Appointment", params.id);

  // Notify the other party
  const notifyUserId = isPatient ? providerUserId! : appointment.patient.userId;
  const cancellerName = isPatient
    ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
    : provider
      ? appointment.psychoanalyst
        ? `${safeDecrypt(provider.firstName)} ${safeDecrypt(provider.lastName)}`
        : `${appointment.professional ? "Dr. " : ""}${provider.firstName} ${provider.lastName}`
      : "Provider";

  const cancelCopy = storedNotificationText(
    "notif.apptCancelled.title",
    "notif.apptCancelled.body",
    {
      name: cancellerName,
      date: new Date(appointment.scheduledAt).toLocaleDateString(localeOf("en")),
    },
  );
  await createNotification({
    userId: notifyUserId,
    title: cancelCopy.title,
    body: cancelCopy.body,
    type: "system",
    data:   {
      appointmentId: params.id,
      refunded,
      titleKey: "notif.apptCancelled.title",
      bodyKey: "notif.apptCancelled.body",
      bodyParams: { name: cancellerName, scheduledAt: appointment.scheduledAt.toISOString() },
    },
  }).catch(() => {});

  notifySlotAlerts({
    professionalId: appointment.professionalId,
    psychoanalystId: appointment.psychoanalystId,
    freedAt: appointment.scheduledAt,
  }).catch((err) => console.error("[CANCEL] Slot alert notify failed:", err));

  return NextResponse.json({
    success:       true,
    refunded,
    refundReason:  refundReason || "no_refund_policy",
    hoursUntil:    Math.round(hoursUntil),
    daysSincePurchase: Math.round(daysSincePurchase * 10) / 10,
  });
}
