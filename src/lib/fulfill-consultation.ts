// Create a paid appointment from Stripe payment metadata (card, PIX, boleto).

import { db } from "@/lib/db";
import { scheduleAppointmentReminders, scheduleReviewRequest } from "@/lib/qstash";
import { buildAppointmentIntakePayload } from "@/lib/appointment-intake";
import { onAppointmentBooked } from "@/lib/post-booking";
import { ensureAnalysandForPatient, PSYCHOANALYSIS_SPECIALTY } from "@/lib/providers";
import { safeDecrypt } from "@/lib/psychoanalyst-api";

export type ConsultationPaymentMeta = {
  userId: string;
  providerType?: string;
  professionalId?: string;
  psychoanalystId?: string;
  scheduledAt: string;
  type?: string;
  visitReason?: string;
  healthPlanSlug?: string;
  healthPlanLabel?: string;
  serviceId?: string;
  serviceName?: string;
  acceptedCancellationPolicy?: string;
  bookingSource?: string;
  doctorName?: string;
  providerSpecialty?: string;
  durationMins?: string;
  patientName?: string;
};

export async function fulfillConsultationPayment(params: {
  stripePaymentId: string;
  amount: number;
  currency: string;
  metadata: ConsultationPaymentMeta;
}): Promise<{ appointmentId: string; created: boolean }> {
  const { stripePaymentId, amount, currency, metadata } = params;
  const {
    userId,
    scheduledAt,
    type,
    visitReason,
    healthPlanSlug,
    healthPlanLabel,
    serviceId,
    serviceName,
    bookingSource,
  } = metadata;

  const providerType =
    metadata.providerType === "psychoanalyst" ? "psychoanalyst" : "health";
  const providerId =
    providerType === "psychoanalyst"
      ? metadata.psychoanalystId || metadata.professionalId
      : metadata.professionalId || metadata.psychoanalystId;

  if (!userId || !providerId || !scheduledAt) {
    throw new Error("Missing consultation payment metadata");
  }

  const existing = await db.appointment.findFirst({
    where: { stripePaymentId },
  });
  if (existing) {
    return { appointmentId: existing.id, created: false };
  }

  const patient = await db.patientProfile.findUnique({ where: { userId } });
  if (!patient) throw new Error("Patient not found");

  const slotWhere =
    providerType === "psychoanalyst"
      ? { psychoanalystId: providerId }
      : { professionalId: providerId };

  const slotTaken = await db.appointment.findFirst({
    where: {
      ...slotWhere,
      scheduledAt: new Date(scheduledAt),
      status: { in: ["CONFIRMED", "PENDING"] },
    },
  });
  if (slotTaken) {
    return { appointmentId: slotTaken.id, created: false };
  }

  let providerName = metadata.doctorName || "";
  let providerSpecialty = metadata.providerSpecialty || "";
  let durationMins = metadata.durationMins
    ? parseInt(metadata.durationMins, 10)
    : 30;

  if (!providerName) {
    if (providerType === "psychoanalyst") {
      const psychoanalyst = await db.psychoanalystProfile.findUnique({
        where: { id: providerId },
      });
      if (psychoanalyst) {
        providerName = `${safeDecrypt(psychoanalyst.firstName)} ${safeDecrypt(psychoanalyst.lastName)}`;
        providerSpecialty = PSYCHOANALYSIS_SPECIALTY;
        durationMins = psychoanalyst.sessionDurationMins;
      }
    } else {
      const professional = await db.professionalProfile.findUnique({
        where: { id: providerId },
      });
      if (professional) {
        providerName = `${professional.firstName} ${professional.lastName}`;
        providerSpecialty = professional.specialty;
      }
    }
  }

  const planSlug = healthPlanSlug?.trim() || "particular";
  const planLabel =
    healthPlanLabel?.trim() ||
    (planSlug === "particular" ? "Particular" : planSlug);
  const policyAccepted = metadata.acceptedCancellationPolicy === "true";

  const intakePayload =
    visitReason?.trim() || healthPlanSlug || serviceId || policyAccepted
      ? buildAppointmentIntakePayload({
          visitReason: visitReason?.trim(),
          healthPlanSlug: planSlug,
          healthPlanLabel: planLabel,
          serviceId: serviceId?.trim() || undefined,
          serviceName: serviceName?.trim() || undefined,
          policyAccepted,
        })
      : null;

  const appointment = await db.appointment.create({
    data: {
      patientId: patient.id,
      providerType: providerType === "psychoanalyst" ? "PSYCHOANALYST" : "HEALTH",
      professionalId: providerType === "health" ? providerId : null,
      psychoanalystId: providerType === "psychoanalyst" ? providerId : null,
      scheduledAt: new Date(scheduledAt),
      type: (type as "TELECONSULT" | "IN_PERSON") || "TELECONSULT",
      status: "CONFIRMED",
      priceAmount: amount,
      currency,
      stripePaymentId,
      paidAt: new Date(),
      durationMins,
      bookingSource: (bookingSource as any) || "patient_panel",
      ...(intakePayload ? { chiefComplaint: intakePayload } : {}),
    },
  });

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, language: true },
  });

  if (providerType === "psychoanalyst") {
    await ensureAnalysandForPatient({
      psychoanalystId: providerId,
      patientUserId: userId,
      patientProfile: { firstName: patient.firstName, lastName: patient.lastName },
      patientEmail: user?.email || "",
    });
  } else {
    onAppointmentBooked({
      appointmentId: appointment.id,
      providerType: "health",
      providerId,
      patientUserId: userId,
      chiefComplaint: intakePayload,
      scheduledAt: new Date(scheduledAt),
    }).catch((e) => console.error("[POST-BOOKING]", e));
  }

  if (user) {
    try {
      const { sendAppointmentConfirmation } = await import("@/lib/email");
      await sendAppointmentConfirmation({
        patientEmail: user.email,
        patientName: `${patient.firstName} ${patient.lastName}`,
        doctorName: providerName,
        specialty: providerSpecialty,
        scheduledAt: new Date(scheduledAt),
        type: type || "TELECONSULT",
        appointmentId: appointment.id,
        language: user.language,
      });
    } catch (e) {
      console.error("[APPOINTMENT EMAIL ERROR]", e);
    }
  }

  scheduleAppointmentReminders(appointment.id, new Date(scheduledAt)).catch((e) => {
    console.error("[QSTASH SCHEDULE ERROR]", e);
  });

  scheduleReviewRequest(appointment.id, new Date(scheduledAt), durationMins).catch((e) => {
    console.error("[QSTASH REVIEW SCHEDULE ERROR]", e);
  });

  return { appointmentId: appointment.id, created: true };
}
