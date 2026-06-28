import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/organization-auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import {
  isWhatsAppConfigured,
  sendAppointmentReminderWhatsApp,
  buildClinicalDocumentWaMeUrl,
} from "@/lib/whatsapp";
import {
  buildAppointmentReminderWaMeMessage,
  resolveWhatsAppLang,
} from "@/lib/whatsapp-i18n";

function safeDecrypt(v: string | null): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v; }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireOrganization(["OWNER", "ADMIN", "RECEPTIONIST"]);
  if ("error" in ctx) return ctx.error;

  const appointmentId = params.id;
  const body = await req.json().catch(() => ({}));
  const mode = (body as { mode?: string }).mode || "reminder";

  const org = await db.organization.findUnique({
    where: { id: ctx.organizationId },
    select: { nomeFantasia: true, whatsappRemindersEnabled: true },
  });
  if (!org?.whatsappRemindersEnabled) {
    return NextResponse.json({ error: "WHATSAPP_DISABLED" }, { status: 400 });
  }

  const professionalIds = await db.organizationProfessional.findMany({
    where: { organizationId: ctx.organizationId, status: "ACTIVE" },
    select: { professionalId: true },
  });
  const profIds = professionalIds.map((p) => p.professionalId);

  const appointment = await db.appointment.findFirst({
    where: {
      id: appointmentId,
      professionalId: { in: profIds },
      status: { in: ["CONFIRMED", "PENDING"] },
    },
    include: {
      patient: { select: { firstName: true, lastName: true, phone: true, userId: true } },
      professional: { select: { firstName: true, lastName: true } },
    },
  });

  if (!appointment || !appointment.professional) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const patientName = `${appointment.patient.firstName} ${appointment.patient.lastName}`;
  const doctorName = `${appointment.professional.firstName} ${appointment.professional.lastName}`;
  const phone = safeDecrypt(appointment.patient.phone);

  if (!phone) {
    return NextResponse.json({ error: "NO_PHONE", status: "NO_PHONE" }, { status: 400 });
  }

  const patientUser = appointment.patient.userId
    ? await db.user.findUnique({
        where: { id: appointment.patient.userId },
        select: { language: true },
      })
    : null;
  const waLang = resolveWhatsAppLang(patientUser?.language);
  const waMeText = buildAppointmentReminderWaMeMessage({
    patientName,
    doctorName: `${org.nomeFantasia} — Dr. ${doctorName}`,
    scheduledAt: appointment.scheduledAt,
    meetingUrl: appointment.meetingUrl,
    lang: waLang,
  });

  if (isWhatsAppConfigured()) {
    const result = await sendAppointmentReminderWhatsApp({
      toPhone: phone,
      patientName,
      doctorName: `${org.nomeFantasia} — Dr. ${doctorName}`,
      scheduledAt: appointment.scheduledAt,
      meetingUrl: appointment.meetingUrl,
      language: waLang,
    });

    if (result.skipped) {
      const waUrl = buildClinicalDocumentWaMeUrl(phone, waMeText);
      return NextResponse.json({ status: "SKIPPED", waUrl, mode });
    }

    return NextResponse.json({
      status: result.ok ? "SENT" : "FAILED",
      messageId: result.messageId,
      error: result.error,
      mode,
    });
  }

  const waUrl = buildClinicalDocumentWaMeUrl(phone, waMeText);

  return NextResponse.json({ status: "SKIPPED", waUrl, mode });
}
