import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/organization-auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import {
  isWhatsAppConfigured,
  sendAppointmentReminderWhatsApp,
  buildClinicalDocumentWaMeUrl,
} from "@/lib/whatsapp";

function safeDecrypt(v: string | null): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v; }
}

function buildWaMeMessage(
  orgName: string,
  patientName: string,
  doctorName: string,
  scheduledAt: Date,
  meetingUrl: string | null,
): string {
  const time = scheduledAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const date = scheduledAt.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
  let msg = `?? *${orgName}*\n\nOl? ${patientName}! Sua consulta com *Dr. ${doctorName}* est? agendada para *${date}* ?s *${time}*.`;
  if (meetingUrl) msg += `\n\n?? Link: ${meetingUrl}`;
  msg += `\n\n_Confirma??o enviada via Doctor8_`;
  return msg;
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
      patient: { select: { firstName: true, lastName: true, phone: true } },
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

  if (isWhatsAppConfigured()) {
    const result = await sendAppointmentReminderWhatsApp({
      toPhone: phone,
      patientName,
      doctorName: `${org.nomeFantasia} ? Dr. ${doctorName}`,
      scheduledAt: appointment.scheduledAt,
      meetingUrl: appointment.meetingUrl,
    });

    if (result.skipped) {
      const waUrl = buildClinicalDocumentWaMeUrl(
        phone,
        buildWaMeMessage(org.nomeFantasia, patientName.split(" ")[0], doctorName, appointment.scheduledAt, appointment.meetingUrl),
      );
      return NextResponse.json({ status: "SKIPPED", waUrl, mode });
    }

    return NextResponse.json({
      status: result.ok ? "SENT" : "FAILED",
      messageId: result.messageId,
      error: result.error,
      mode,
    });
  }

  const waUrl = buildClinicalDocumentWaMeUrl(
    phone,
    buildWaMeMessage(org.nomeFantasia, patientName.split(" ")[0], doctorName, appointment.scheduledAt, appointment.meetingUrl),
  );

  return NextResponse.json({ status: "SKIPPED", waUrl, mode });
}
