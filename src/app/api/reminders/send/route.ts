// src/app/api/reminders/send/route.ts
// Called by QStash at the scheduled time to send appointment reminders.
// Handles: 24h email, 3h email, 3h WhatsApp link, bell notification.
// QStash calls this endpoint with a delay — we verify the appointment
// is still active before sending anything.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { createNotification } from "@/lib/notifications";
import { storedNotificationText } from "@/lib/notification-i18n";
import { verifyQStashSignature } from "@/lib/qstash";
import { logQStashJob } from "@/lib/integration-logs";
import {
  isWhatsAppConfigured,
  sendAppointmentReminderWhatsApp,
} from "@/lib/whatsapp";
import {
  buildAppointmentReminderWaMeMessage,
  resolveWhatsAppLang,
} from "@/lib/whatsapp-i18n";
import { z } from "zod";
import { teleconsultJoinUrl } from "@/lib/appointment-join-window";

const schema = z.object({
  appointmentId: z.string(),
  type: z.enum(["24h_email", "3h_email", "3h_whatsapp", "bell", "review_request"]),
  remindersEpoch: z.number().int().nonnegative().optional(),
});

function safeDecrypt(v: string | null): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v; }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const isValid = await verifyQStashSignature(req, rawBody);
  if (!isValid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown = {};
  try {
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const { appointmentId, type, remindersEpoch } = parsed.data;

  // Load appointment with all needed relations
  const appointment = await db.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: {
        select: {
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
      professional: {
        select: {
          firstName: true,
          lastName: true,
          specialty: true,
        },
      },
      psychoanalyst: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  if (!appointment) {
    await logQStashJob({ appointmentId, jobType: type, status: "skipped", detail: "not found" });
    return NextResponse.json({ skipped: true, reason: "Appointment not found" });
  }

  if (
    remindersEpoch !== undefined &&
    remindersEpoch !== appointment.remindersEpoch
  ) {
    await logQStashJob({
      appointmentId,
      jobType: type,
      status: "skipped",
      detail: `stale epoch ${remindersEpoch} vs ${appointment.remindersEpoch}`,
    });
    return NextResponse.json({ skipped: true, reason: "Stale reminder batch" });
  }

  if (type === "review_request") {
    if (appointment.status === "CANCELLED" || appointment.reviewRequestSent) {
      return NextResponse.json({ skipped: true, reason: "Review already sent or cancelled" });
    }

    const patientUser = await db.user.findFirst({
      where: { patientProfile: { id: appointment.patientId } },
      select: { id: true, email: true, language: true },
    });
    if (!patientUser) return NextResponse.json({ skipped: true, reason: "Patient user not found" });

    const providerId = appointment.professionalId ?? appointment.psychoanalystId;
    if (!providerId) return NextResponse.json({ skipped: true, reason: "No provider" });

    const existingReview = appointment.professionalId
      ? await db.professionalReview.findUnique({
          where: {
            patientUserId_professionalId: {
              patientUserId: patientUser.id,
              professionalId: appointment.professionalId,
            },
          },
        })
      : await db.psychoanalystReview.findUnique({
          where: {
            patientUserId_psychoanalystId: {
              patientUserId: patientUser.id,
              psychoanalystId: appointment.psychoanalystId!,
            },
          },
        });

    if (existingReview) {
      await db.appointment.update({
        where: { id: appointmentId },
        data: { reviewRequestSent: true, status: "COMPLETED" },
      });
      try {
        const { tryStampForCompletedAppointment } = await import("@/lib/club-stamps");
        await tryStampForCompletedAppointment(appointmentId);
      } catch (e) {
        console.error("[REMINDER] Club stamp failed:", e);
      }
      return NextResponse.json({ skipped: true, reason: "Already reviewed" });
    }

    const patientName = `${safeDecrypt(appointment.patient.firstName)} ${safeDecrypt(appointment.patient.lastName)}`.trim();
    const doctorName = appointment.professional
      ? `${appointment.professional.firstName} ${appointment.professional.lastName}`
      : appointment.psychoanalyst
        ? `${safeDecrypt(appointment.psychoanalyst.firstName)} ${safeDecrypt(appointment.psychoanalyst.lastName)}`
        : "Profissional";

    const providerType = appointment.professionalId ? "health" : "psychoanalyst";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://doctor8.app";
    const reviewUrl = `${appUrl}/patient/appointments?reviewPro=${providerId}&providerType=${providerType}`;

    try {
      const { sendReviewRequest } = await import("@/lib/email");
      await sendReviewRequest({
        email: patientUser.email,
        patientName,
        providerName: doctorName,
        reviewUrl,
        language: patientUser.language,
      });
      const reviewCopy = storedNotificationText(
        "notif.reviewRequest.title",
        "notif.reviewRequest.body",
        { doctor: doctorName },
      );
      await createNotification({
        userId: patientUser.id,
        title: reviewCopy.title,
        body: reviewCopy.body,
        type: "review_request",
        data: {
          appointmentId,
          providerId,
          providerType,
          titleKey: "notif.reviewRequest.title",
          bodyKey: "notif.reviewRequest.body",
          bodyParams: { doctor: doctorName },
        },
      }).catch(() => {});
    } catch (e) {
      console.error("[REMINDER] Review request failed:", e);
      return NextResponse.json({ error: "Review email failed" }, { status: 500 });
    }

    await db.appointment.update({
      where: { id: appointmentId },
      data: {
        reviewRequestSent: true,
        status: appointment.status === "CONFIRMED" ? "COMPLETED" : appointment.status,
      },
    });

    try {
      const { tryStampForCompletedAppointment } = await import("@/lib/club-stamps");
      await tryStampForCompletedAppointment(appointmentId);
    } catch (e) {
      console.error("[REMINDER] Club stamp failed:", e);
    }

    await logQStashJob({ appointmentId, jobType: type, status: "sent" });
    return NextResponse.json({ success: true, type, appointmentId });
  }

  async function markSent(flags: { reminder24hSent?: boolean; reminder1hSent?: boolean }) {
    await db.appointment.update({
      where: { id: appointmentId },
      data: flags,
    }).catch(() => {});
  }

  // Skip pre-appointment reminders if cancelled or completed
  if (!["CONFIRMED", "PENDING"].includes(appointment.status)) {
    return NextResponse.json({ skipped: true, reason: "Appointment not active" });
  }

  const patientUser = await db.user.findFirst({
    where: { patientProfile: { id: appointment.patientId } },
    select: { id: true, email: true, language: true, timezone: true } as never,
  }) as { id: string; email: string; language: string | null; timezone?: string } | null;

  if (!patientUser) return NextResponse.json({ skipped: true, reason: "Patient user not found" });

  const patientTimezone = patientUser.timezone;

  const patientName = `${safeDecrypt(appointment.patient.firstName)} ${safeDecrypt(appointment.patient.lastName)}`.trim();
  const doctorName = appointment.professional
    ? `${appointment.professional.firstName} ${appointment.professional.lastName}`
    : appointment.psychoanalyst
      ? `${safeDecrypt(appointment.psychoanalyst.firstName)} ${safeDecrypt(appointment.psychoanalyst.lastName)}`
      : "Provider";
  const scheduledAt = new Date(appointment.scheduledAt);
  const hoursUntil = Math.round((scheduledAt.getTime() - Date.now()) / 3600000);
  const waLang = resolveWhatsAppLang(patientUser.language);
  const joinUrl = appointment.type === "TELECONSULT"
    ? teleconsultJoinUrl(appointmentId, appointment.meetingUrl)
    : appointment.meetingUrl ?? undefined;

  // ── 24h EMAIL ──────────────────────────────────────────────────────────────
  if (type === "24h_email") {
    try {
      const { sendAppointmentReminder } = await import("@/lib/email");
      await sendAppointmentReminder({
        patientEmail: patientUser.email,
        patientName,
        doctorName,
        scheduledAt,
        meetingUrl: joinUrl,
        hoursUntil: 24,
        language: patientUser.language ?? undefined,
        patientTimezone,
      });
      console.log(`[REMINDER] 24h email sent (user ${patientUser.id})`);
      await markSent({ reminder24hSent: true });
    } catch (e) {
      console.error("[REMINDER] 24h email failed:", e);
      await logQStashJob({ appointmentId, jobType: type, status: "failed", detail: String(e) });
      return NextResponse.json({ error: "Email failed" }, { status: 500 });
    }
  }

  // ── 3h EMAIL ───────────────────────────────────────────────────────────────
  if (type === "3h_email") {
    try {
      const rawPhone = appointment.patient.phone ? safeDecrypt(appointment.patient.phone) : null;
      let whatsappUrl: string | undefined;
      if (rawPhone) {
        const phone = rawPhone.replace(/\D/g, "");
        const message = buildAppointmentReminderWaMeMessage({
          patientName,
          doctorName,
          scheduledAt,
          meetingUrl: joinUrl,
          lang: waLang,
          patientTimezone,
        });
        whatsappUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
      }

      const { sendAppointmentReminder } = await import("@/lib/email");
      await sendAppointmentReminder({
        patientEmail: patientUser.email,
        patientName,
        doctorName,
        scheduledAt,
        meetingUrl: joinUrl,
        hoursUntil: 3,
        language: patientUser.language ?? undefined,
        whatsappUrl,
        patientTimezone,
      });
      console.log(`[REMINDER] 3h email sent (user ${patientUser.id})`);
    } catch (e) {
      console.error("[REMINDER] 3h email failed:", e);
    }
  }

  // ── 3h WHATSAPP ────────────────────────────────────────────────────────────
  if (type === "3h_whatsapp") {
    const rawPhone = appointment.patient.phone ? safeDecrypt(appointment.patient.phone) : null;
    if (rawPhone) {
      const phone = rawPhone.replace(/\D/g, "");
      const message = buildAppointmentReminderWaMeMessage({
        patientName,
        doctorName,
        scheduledAt,
        meetingUrl: joinUrl,
        lang: waLang,
        patientTimezone,
      });
      const waUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;

      let apiSent = false;
      if (isWhatsAppConfigured()) {
        const result = await sendAppointmentReminderWhatsApp({
          toPhone: rawPhone,
          patientName,
          doctorName,
          scheduledAt,
          meetingUrl: joinUrl,
          language: waLang,
          patientTimezone,
        });
        if (result.ok) {
          apiSent = true;
          console.log(`[REMINDER] 3h WhatsApp API sent (user ${patientUser.id}), id=${result.messageId}`);
        } else if (!result.skipped) {
          console.error(`[REMINDER] 3h WhatsApp API failed: ${result.error}`);
        }
      }

      const reminderCopy = storedNotificationText(
        "notif.apptReminder.title",
        "notif.apptReminder.body3h",
        { doctor: doctorName },
      );
      await createNotification({
        userId: patientUser.id,
        title: reminderCopy.title,
        body: reminderCopy.body,
        type: "appointment_reminder",
        data: {
          appointmentId,
          link: `/patient/appointments?id=${appointmentId}`,
          whatsappUrl: apiSent ? undefined : waUrl,
          whatsappSent: apiSent,
          titleKey: "notif.apptReminder.title",
          bodyKey: "notif.apptReminder.body3h",
          bodyParams: { doctor: doctorName },
        },
      }).catch(() => {});

      if (!apiSent) {
        console.log(`[REMINDER] 3h WhatsApp fallback notification (user ${patientUser.id})`);
      }
      await markSent({ reminder1hSent: true });
    }
  }

  // ── BELL NOTIFICATION ──────────────────────────────────────────────────────
  if (type === "bell") {
    const bodyKey =
      hoursUntil >= 24 ? "notif.apptReminder.bodyTomorrow" : "notif.apptReminder.bodySoon";
    const bellCopy = storedNotificationText("notif.apptReminder.titleHours", bodyKey, {
      doctor: doctorName,
      hours: hoursUntil,
    });
    await createNotification({
      userId: patientUser.id,
      title: bellCopy.title,
      body: bellCopy.body,
      type: "appointment_reminder",
      data: {
        appointmentId,
        link: `/patient/appointments?id=${appointmentId}`,
        meetingUrl: joinUrl,
        titleKey: "notif.apptReminder.titleHours",
        bodyKey: hoursUntil >= 24 ? "notif.apptReminder.bodyTomorrow" : "notif.apptReminder.bodySoon",
        bodyParams: { doctor: doctorName, hours: hoursUntil },
      },
    }).catch(() => {});
    console.log(`[REMINDER] Bell notification sent to user ${patientUser.id}`);
  }

  await logQStashJob({ appointmentId, jobType: type, status: "sent" });
  return NextResponse.json({ success: true, type, appointmentId });
}
