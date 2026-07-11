// After a confirmed booking: link patient to provider chart and save pre-consult intake.

import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { ensurePatientRecord } from "@/lib/ensure-patient-record";
import { parseAppointmentIntake, type AppointmentIntake } from "@/lib/appointment-intake";

/** Pre-consult note requires a non-empty visit reason; patient chart does not. */
export function shouldCreatePreConsultNote(intake: AppointmentIntake | null): boolean {
  return Boolean(intake?.visitReason?.trim());
}

function buildPreConsultLines(intake: AppointmentIntake): string[] {
  return [
    intake.visitReason!.trim(),
    intake.healthPlanLabel ? `Conv\u00eanio: ${intake.healthPlanLabel}` : null,
    intake.serviceName ? `Servi\u00e7o: ${intake.serviceName}` : null,
  ].filter(Boolean) as string[];
}

export async function onAppointmentBooked(opts: {
  appointmentId: string;
  providerType: "health" | "integrative";
  providerId: string;
  patientUserId: string;
  chiefComplaint?: string | null;
  scheduledAt: Date;
}): Promise<{ chartId: string | null }> {
  const intake = parseAppointmentIntake(opts.chiefComplaint ?? null);
  const hasVisitReason = shouldCreatePreConsultNote(intake);

  if (opts.providerType === "health") {
    const chartId = await ensurePatientRecord(opts.providerId, opts.patientUserId);

    if (!hasVisitReason) {
      return { chartId };
    }

    const existing = await db.medicalDocument.findFirst({
      where: { appointmentId: opts.appointmentId },
      select: { id: true },
    });
    if (existing) return { chartId };

    if (chartId && intake) {
      await db.medicalDocument.create({
        data: {
          patientRecordId: chartId,
          professionalId: opts.providerId,
          appointmentId: opts.appointmentId,
          type: "CLINICAL_NOTE",
          title: encrypt("Pr\u00e9-consulta (agendamento online)"),
          content: encrypt(buildPreConsultLines(intake).join("\n")),
        },
      });
    }

    return { chartId };
  }

  if (!hasVisitReason) {
    return { chartId: null };
  }

  const existing = await db.medicalDocument.findFirst({
    where: { appointmentId: opts.appointmentId },
    select: { id: true },
  });
  if (existing) return { chartId: null };

  const client = await db.integrativeClientRecord.findFirst({
    where: {
      integrativeTherapistId: opts.providerId,
      linkedUserId: opts.patientUserId,
    },
    select: { id: true },
  });
  if (!client) return { chartId: null };

  await db.medicalDocument.create({
    data: {
      integrativeClientRecordId: client.id,
      integrativeTherapistId: opts.providerId,
      appointmentId: opts.appointmentId,
      type: "CLINICAL_NOTE",
      title: encrypt("Pr\u00e9-consulta (agendamento online)"),
      content: encrypt(buildPreConsultLines(intake!).join("\n")),
    },
  });
  return { chartId: client.id };
}
