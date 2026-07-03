// Create a paid appointment from Stripe payment metadata (card, PIX, boleto).

import { db } from "@/lib/db";
import { scheduleAppointmentReminders, scheduleReviewRequest, schedulePostConsultNotesReminder } from "@/lib/qstash";
import { buildAppointmentIntakePayload } from "@/lib/appointment-intake";
import { onAppointmentBooked } from "@/lib/post-booking";
import { ensureAnalysandForPatient, PSYCHOANALYSIS_SPECIALTY } from "@/lib/providers";
import { safeDecrypt } from "@/lib/psychoanalyst-api";
import { Prisma } from "@prisma/client";
import { teleconsultJoinUrl } from "@/lib/appointment-join-window";
import { notifyProfessionalNewBooking } from "@/lib/pro-appointment-notify";
import { SCHEDULED_VOLUNTEER_BOOKING_SOURCE } from "@/lib/scheduled-volunteer";
import {
  assertScheduledVolunteerSlotBooking,
  VolunteerSlotBookingError,
} from "@/lib/volunteer-slot-booking";

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
  volunteerBooking?: string;
};

export class AppointmentSlotTakenError extends Error {
  constructor() {
    super("Appointment slot is no longer available");
    this.name = "AppointmentSlotTakenError";
  }
}

export async function fulfillScheduledVolunteerConsultation(params: {
  userId: string;
  providerId: string;
  scheduledAt: string;
  type: "TELECONSULT" | "IN_PERSON";
  acceptedCancellationPolicy: boolean;
  visitReason?: string;
  healthPlanSlug?: string;
  healthPlanLabel?: string;
  serviceId?: string;
  serviceName?: string;
}): Promise<{ appointmentId: string; created: boolean }> {
  return fulfillConsultationPayment({
    stripePaymentId: "",
    amount: 0,
    currency: "BRL",
    metadata: {
      userId: params.userId,
      providerType: "health",
      professionalId: params.providerId,
      scheduledAt: params.scheduledAt,
      type: params.type,
      visitReason: params.visitReason,
      healthPlanSlug: params.healthPlanSlug,
      healthPlanLabel: params.healthPlanLabel,
      serviceId: params.serviceId,
      serviceName: params.serviceName,
      acceptedCancellationPolicy: params.acceptedCancellationPolicy ? "true" : undefined,
      bookingSource: SCHEDULED_VOLUNTEER_BOOKING_SOURCE,
    },
    revalidateBeforeCreate: () =>
      assertScheduledVolunteerSlotBooking(params.providerId, "health", params.scheduledAt),
  });
}

export async function fulfillVolunteerConsultation(params: {
  userId: string;
  providerType: "health" | "psychoanalyst";
  providerId: string;
  scheduledAt: string;
  type: "TELECONSULT" | "IN_PERSON";
  acceptedCancellationPolicy: boolean;
  bookingSource?: string;
  visitReason?: string;
  healthPlanSlug?: string;
  healthPlanLabel?: string;
  serviceId?: string;
  serviceName?: string;
}): Promise<{ appointmentId: string; created: boolean }> {
  return fulfillConsultationPayment({
    stripePaymentId: "",
    amount: 0,
    currency: "BRL",
    metadata: {
      userId: params.userId,
      providerType: params.providerType,
      professionalId: params.providerType === "health" ? params.providerId : undefined,
      psychoanalystId: params.providerType === "psychoanalyst" ? params.providerId : undefined,
      scheduledAt: params.scheduledAt,
      type: params.type,
      visitReason: params.visitReason,
      healthPlanSlug: params.healthPlanSlug,
      healthPlanLabel: params.healthPlanLabel,
      serviceId: params.serviceId,
      serviceName: params.serviceName,
      acceptedCancellationPolicy: params.acceptedCancellationPolicy ? "true" : undefined,
      bookingSource: params.bookingSource ?? "acura_volunteer",
      volunteerBooking: "true",
    },
  });
}

export async function fulfillConsultationPayment(params: {
  stripePaymentId: string;
  amount: number;
  currency: string;
  metadata: ConsultationPaymentMeta;
  /** Re-run slot validation inside the Serializable transaction (P8b volunteer booking). */
  revalidateBeforeCreate?: () => Promise<void>;
}): Promise<{ appointmentId: string; created: boolean }> {
  const { stripePaymentId, amount, currency, metadata, revalidateBeforeCreate } = params;
  const isVolunteerBooking = metadata.volunteerBooking === "true" || amount === 0;
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

  const patient = await db.patientProfile.findUnique({ where: { userId } });
  if (!patient) throw new Error("Patient not found");

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

  const slotWhere =
    providerType === "psychoanalyst"
      ? { psychoanalystId: providerId }
      : { professionalId: providerId };

  const { appointment, created } = await db.$transaction(
    async (tx) => {
      const existingPayment =
        stripePaymentId && !isVolunteerBooking
          ? await tx.appointment.findFirst({ where: { stripePaymentId } })
          : null;
      if (existingPayment) {
        return { appointment: existingPayment, created: false };
      }

      const slotTaken = await tx.appointment.findFirst({
        where: {
          ...slotWhere,
          scheduledAt: new Date(scheduledAt),
          status: { in: ["CONFIRMED", "PENDING"] },
        },
      });
      if (slotTaken) throw new AppointmentSlotTakenError();

      if (revalidateBeforeCreate) {
        await revalidateBeforeCreate();
      }

      const createdAppointment = await tx.appointment.create({
        data: {
          patientId: patient.id,
          providerType: providerType === "psychoanalyst" ? "PSYCHOANALYST" : "HEALTH",
          professionalId: providerType === "health" ? providerId : null,
          psychoanalystId: providerType === "psychoanalyst" ? providerId : null,
          scheduledAt: new Date(scheduledAt),
          type: (type as "TELECONSULT" | "IN_PERSON") || "TELECONSULT",
          status: "CONFIRMED",
          priceAmount: amount,
          currency: isVolunteerBooking ? "BRL" : currency,
          stripePaymentId: isVolunteerBooking ? null : stripePaymentId,
          paidAt: isVolunteerBooking ? null : new Date(),
          durationMins,
          bookingSource: (bookingSource as any) || (isVolunteerBooking ? "acura_volunteer" : "patient_panel"),
          ...(intakePayload ? { chiefComplaint: intakePayload } : {}),
        },
      });

      return { appointment: createdAppointment, created: true };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  if (!created) {
    return { appointmentId: appointment.id, created: false };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, language: true, timezone: true } as never,
  }) as { email: string; language: string | null; timezone?: string } | null;
  const patientTimezone = user?.timezone;

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
        language: user.language ?? undefined,
        patientTimezone,
        meetingUrl: (type || "TELECONSULT") === "TELECONSULT"
          ? teleconsultJoinUrl(appointment.id)
          : undefined,
      });
    } catch (e) {
      console.error("[APPOINTMENT EMAIL ERROR]", e);
    }
  }

  scheduleAppointmentReminders(appointment.id, new Date(scheduledAt)).catch((e) => {
    console.error("[QSTASH SCHEDULE ERROR]", e);
  });

  scheduleReviewRequest(appointment.id, new Date(scheduledAt), durationMins).catch((e) => {
    console.error("[QSTASH SCHEDULE ERROR]", e);
  });

  schedulePostConsultNotesReminder(appointment.id, new Date(scheduledAt), durationMins).catch((e) => {
    console.error("[QSTASH POST-CONSULT SCHEDULE ERROR]", e);
  });

  notifyProfessionalNewBooking({
    appointmentId: appointment.id,
    scheduledAt: new Date(scheduledAt),
    professionalId: providerType === "health" ? providerId : null,
    psychoanalystId: providerType === "psychoanalyst" ? providerId : null,
    patientFirstName: patient.firstName,
    patientLastName: patient.lastName,
  }).catch((e) => console.error("[PRO-APPT-NOTIFY] New booking failed:", e));

  return { appointmentId: appointment.id, created: true };
}
