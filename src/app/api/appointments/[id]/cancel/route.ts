// src/app/api/appointments/[id]/cancel/route.ts
// Cancellation: guards block past/in-progress/completed appointments.
// When scheduledAt is still in the future, paid appointments receive a full refund.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { refundPaymentIntentIdempotent } from "@/lib/stripe-refund";
import { audit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { storedNotificationText } from "@/lib/notification-i18n";
import { localeOf } from "@/lib/i18n/translations";
import { notifySlotAlerts } from "@/lib/slot-alerts";
import { safeDecrypt } from "@/lib/psychoanalyst-api";
import { notifyProfessionalCancelled } from "@/lib/pro-appointment-notify";

const CANCEL_FRESH_SELECT = {
  status: true,
  scheduledAt: true,
  durationMins: true,
  stripePaymentId: true,
  patientJoinedAt: true,
  professionalJoinedAt: true,
} as const;

type CancelGuardRow = {
  status: string;
  scheduledAt: Date;
  durationMins: number;
  patientJoinedAt: Date | null;
  professionalJoinedAt: Date | null;
};

function applyCancelStateGuards(appt: CancelGuardRow): NextResponse | null {
  if (appt.status === "CANCELLED") {
    return NextResponse.json({ success: true, alreadyCancelled: true });
  }

  if (appt.status === "COMPLETED") {
    return NextResponse.json({ error: "APPOINTMENT_ALREADY_COMPLETED" }, { status: 403 });
  }

  const now = Date.now();
  const startMs = appt.scheduledAt.getTime();
  const endMs = startMs + appt.durationMins * 60_000;

  const consultationInProgress =
    appt.patientJoinedAt != null ||
    appt.professionalJoinedAt != null ||
    (now >= startMs &&
      now < endMs &&
      (appt.status === "PENDING" || appt.status === "CONFIRMED"));

  if (consultationInProgress) {
    return NextResponse.json({ error: "APPOINTMENT_IN_PROGRESS" }, { status: 403 });
  }

  if (now >= startMs) {
    return NextResponse.json(
      {
        error: "APPOINTMENT_TIME_PASSED",
        message:
          "O horário desta consulta já passou. Entre em contato com o suporte para solicitar reembolso ou resolver pendências.",
      },
      { status: 403 },
    );
  }

  if (appt.status !== "PENDING" && appt.status !== "CONFIRMED") {
    return NextResponse.json({ error: "Appointment cannot be cancelled" }, { status: 400 });
  }

  return null;
}

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

  const freshForGuards = await db.appointment.findUnique({
    where: { id: params.id },
    select: CANCEL_FRESH_SELECT,
  });
  if (!freshForGuards) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const guardResponse = applyCancelStateGuards(freshForGuards);
  if (guardResponse) return guardResponse;

  const apptTime = new Date(appointment.scheduledAt).getTime();
  const hoursUntil = (apptTime - Date.now()) / 3600000;

  // Guards guarantee scheduledAt is in the future — always full refund when paid.
  let refunded = false;
  let refundReason = "";

  if (appointment.stripePaymentId) {
    refundReason = isProfessional ? "professional_cancelled" : "patient_cancelled";
    const freshBeforeRefund = await db.appointment.findUnique({
      where: { id: params.id },
      select: CANCEL_FRESH_SELECT,
    });
    if (!freshBeforeRefund) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const refundGuardResponse = applyCancelStateGuards(freshBeforeRefund);
    if (refundGuardResponse) return refundGuardResponse;

    const refundResult = await refundPaymentIntentIdempotent(
      freshBeforeRefund.stripePaymentId ?? appointment.stripePaymentId!,
      refundReason,
      {
        triggeredBy: isProfessional ? "PROFESSIONAL_CANCEL" : "PATIENT_CANCEL",
        appointmentId: params.id,
        userId: session.user.id,
      },
    );

    if (refundResult.error) {
      return NextResponse.json({ error: "REFUND_FAILED" }, { status: 502 });
    }

    if (refundResult.refunded) {
      refunded = true;
    }
  }

  await db.appointment.update({
    where: { id: params.id },
    data: {
      status:      "CANCELLED",
      cancelledAt: new Date(),
      cancelledBy: session.user.id,
      cancelReason: reason,
      remindersEpoch: { increment: 1 },
    },
  });

  await audit.updateRecord(session.user.id, "Appointment", params.id);

  // Notify the other party
  const notifyUserId = isPatient ? providerUserId! : appointment.patient.userId;
  const cancellerName = isPatient
    ? `${safeDecrypt(appointment.patient.firstName)} ${safeDecrypt(appointment.patient.lastName)}`.trim()
    : provider
      ? appointment.psychoanalyst
        ? `${safeDecrypt(provider.firstName)} ${safeDecrypt(provider.lastName)}`
        : `${appointment.professional ? "Dr. " : ""}${provider.firstName} ${provider.lastName}`
      : "Provider";

  if (isPatient && providerUserId) {
    await notifyProfessionalCancelled({
      appointmentId: params.id,
      scheduledAt: appointment.scheduledAt,
      professionalId: appointment.professionalId,
      psychoanalystId: appointment.psychoanalystId,
      patientFirstName: appointment.patient.firstName,
      patientLastName: appointment.patient.lastName,
    }).catch(() => {});
  } else {
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
      data: {
        appointmentId: params.id,
        refunded,
        titleKey: "notif.apptCancelled.title",
        bodyKey: "notif.apptCancelled.body",
        bodyParams: { name: cancellerName, scheduledAt: appointment.scheduledAt.toISOString() },
      },
    }).catch(() => {});
  }

  notifySlotAlerts({
    professionalId: appointment.professionalId,
    psychoanalystId: appointment.psychoanalystId,
    freedAt: appointment.scheduledAt,
  }).catch((err) => console.error("[CANCEL] Slot alert notify failed:", err));

  try {
    const patientUser = await db.user.findUnique({
      where: { id: appointment.patient.userId },
      select: { email: true, language: true, timezone: true } as never,
    }) as { email: string; language: string | null; timezone?: string } | null;
    if (patientUser) {
      const doctorName = appointment.professional
        ? `Dr. ${appointment.professional.firstName} ${appointment.professional.lastName}`
        : appointment.psychoanalyst
          ? `${safeDecrypt(appointment.psychoanalyst.firstName)} ${safeDecrypt(appointment.psychoanalyst.lastName)}`
          : "Profissional";
      const { sendAppointmentCancelled } = await import("@/lib/email");
      await sendAppointmentCancelled({
        patientEmail: patientUser.email,
        patientName: `${safeDecrypt(appointment.patient.firstName)} ${safeDecrypt(appointment.patient.lastName)}`.trim(),
        doctorName,
        scheduledAt: appointment.scheduledAt,
        appointmentId: params.id,
        language: patientUser.language ?? undefined,
        patientTimezone: patientUser.timezone,
      });
    }
  } catch (e) {
    console.error("[CANCEL EMAIL ERROR]", e);
  }

  return NextResponse.json({
    success: true,
    refunded,
    refundReason: refundReason || (appointment.stripePaymentId ? "patient_cancelled" : "no_payment"),
    hoursUntil: Math.round(hoursUntil),
  });
}