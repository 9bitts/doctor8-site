// After a confirmed booking: link patient to provider chart and save pre-consult intake.

import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { ensurePatientRecord } from "@/lib/ensure-patient-record";
import { parseAppointmentIntake } from "@/lib/appointment-intake";

export async function onAppointmentBooked(opts: {
  appointmentId: string;
  providerType: "health" | "psychoanalyst";
  providerId: string;
  patientUserId: string;
  chiefComplaint?: string | null;
  scheduledAt: Date;
}): Promise<{ chartId: string | null }> {
  if (opts.providerType !== "health") {
    return { chartId: null };
  }

  const chartId = await ensurePatientRecord(opts.providerId, opts.patientUserId);
  if (!chartId) return { chartId: null };

  const intake = parseAppointmentIntake(opts.chiefComplaint ?? null);
  if (!intake?.visitReason?.trim()) {
    return { chartId };
  }

  const existing = await db.medicalDocument.findFirst({
    where: { appointmentId: opts.appointmentId },
    select: { id: true },
  });
  if (existing) return { chartId };

  const lines = [
    intake.visitReason.trim(),
    intake.healthPlanLabel ? `Conv?nio: ${intake.healthPlanLabel}` : null,
    intake.serviceName ? `Servi?o: ${intake.serviceName}` : null,
  ].filter(Boolean);

  await db.medicalDocument.create({
    data: {
      patientRecordId: chartId,
      professionalId: opts.providerId,
      appointmentId: opts.appointmentId,
      type: "CLINICAL_NOTE",
      title: encrypt("Pr?-consulta (agendamento online)"),
      content: encrypt(lines.join("\n")),
    },
  });

  return { chartId };
}
