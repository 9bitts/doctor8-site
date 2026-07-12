// After a confirmed booking: link patient to provider chart and save pre-consult intake.

import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { ensurePatientRecord } from "@/lib/ensure-patient-record";
import { ensureAnalysandRecord } from "@/lib/ensure-analysand-record";
import { ensureIntegrativeClientRecord } from "@/lib/ensure-integrative-client-record";
import { parseAppointmentIntake, type AppointmentIntake } from "@/lib/appointment-intake";

export type BookingProviderType = "health" | "integrative" | "psychoanalyst";

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

async function ensureChartForProvider(
  providerType: BookingProviderType,
  providerId: string,
  patientUserId: string,
): Promise<string | null> {
  if (providerType === "health") {
    return ensurePatientRecord(providerId, patientUserId);
  }
  if (providerType === "integrative") {
    return ensureIntegrativeClientRecord(providerId, patientUserId);
  }
  return ensureAnalysandRecord(providerId, patientUserId);
}

async function createPreConsultNote(opts: {
  providerType: BookingProviderType;
  providerId: string;
  appointmentId: string;
  chartId: string;
  intake: AppointmentIntake;
}): Promise<void> {
  const content = encrypt(buildPreConsultLines(opts.intake).join("\n"));
  const title = encrypt("Pr\u00e9-consulta (agendamento online)");

  if (opts.providerType === "health") {
    await db.medicalDocument.create({
      data: {
        patientRecordId: opts.chartId,
        professionalId: opts.providerId,
        appointmentId: opts.appointmentId,
        type: "CLINICAL_NOTE",
        title,
        content,
      },
    });
    return;
  }

  if (opts.providerType === "integrative") {
    await db.medicalDocument.create({
      data: {
        integrativeClientRecordId: opts.chartId,
        integrativeTherapistId: opts.providerId,
        appointmentId: opts.appointmentId,
        type: "CLINICAL_NOTE",
        title,
        content,
      },
    });
    return;
  }

  await db.medicalDocument.create({
    data: {
      analysandRecordId: opts.chartId,
      psychoanalystId: opts.providerId,
      appointmentId: opts.appointmentId,
      type: "CLINICAL_NOTE",
      title,
      content,
    },
  });
}

export async function onAppointmentBooked(opts: {
  appointmentId: string;
  providerType: BookingProviderType;
  providerId: string;
  patientUserId: string;
  chiefComplaint?: string | null;
  scheduledAt: Date;
}): Promise<{ chartId: string | null }> {
  const intake = parseAppointmentIntake(opts.chiefComplaint ?? null);
  const hasVisitReason = shouldCreatePreConsultNote(intake);

  const chartId = await ensureChartForProvider(
    opts.providerType,
    opts.providerId,
    opts.patientUserId,
  );

  if (!hasVisitReason) {
    return { chartId };
  }

  const existing = await db.medicalDocument.findFirst({
    where: { appointmentId: opts.appointmentId },
    select: { id: true },
  });
  if (existing) return { chartId };

  if (chartId && intake) {
    await createPreConsultNote({
      providerType: opts.providerType,
      providerId: opts.providerId,
      appointmentId: opts.appointmentId,
      chartId,
      intake,
    });
  }

  return { chartId };
}
