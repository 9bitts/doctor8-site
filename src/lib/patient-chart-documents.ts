// Sync and load all clinical documents for a patient chart.

import { db } from "@/lib/db";
import { attachSharedDocumentToChart } from "@/lib/shared-document-attach";
export { computeMissingForRx } from "@/lib/patient-rx-requirements";

/** Backfill orphan docs + auto-attach patient-shared files onto this chart. */
export async function syncChartDocuments(opts: {
  chartId: string;
  professionalId: string;
  linkedUserId: string | null;
  chartEmail: string | null;
}): Promise<void> {
  const { chartId, professionalId, linkedUserId, chartEmail } = opts;
  const normalizedChartEmail = chartEmail?.toLowerCase() ?? null;

  if (linkedUserId) {
    const profile = await db.patientProfile.findUnique({
      where: { userId: linkedUserId },
      select: { id: true },
    });
    if (profile) {
      await db.medicalDocument.updateMany({
        where: {
          professionalId,
          patientId: profile.id,
          patientRecordId: null,
        },
        data: { patientRecordId: chartId },
      });
    }
  } else if (normalizedChartEmail) {
    const user = await db.user.findFirst({
      where: { email: normalizedChartEmail, role: "PATIENT" },
      select: { id: true },
    });
    if (user) {
      const profile = await db.patientProfile.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      if (profile) {
        await db.medicalDocument.updateMany({
          where: {
            professionalId,
            patientId: profile.id,
            patientRecordId: null,
          },
          data: { patientRecordId: chartId },
        });
      }
    }
  }

  const shares = await db.sharedRecord.findMany({
    where: { sharedWithProfessionalId: professionalId },
    include: {
      patient: {
        include: { user: { select: { id: true, email: true } } },
      },
    },
  });

  for (const share of shares) {
    const patientEmail = share.patient.user?.email?.toLowerCase() ?? null;
    const matchesPatient =
      (linkedUserId && share.patient.userId === linkedUserId) ||
      (normalizedChartEmail && patientEmail === normalizedChartEmail);

    if (!matchesPatient) continue;

    await attachSharedDocumentToChart({
      documentId: share.documentId,
      chartId,
      professionalId,
    });
  }
}

export async function loadChartMedicalDocuments(
  chartId: string,
  professionalId: string,
  order: "asc" | "desc" = "desc",
) {
  return db.medicalDocument.findMany({
    where: { professionalId, patientRecordId: chartId },
    orderBy: { createdAt: order },
    include: {
      category: { select: { name: true, groupName: true } },
      prescriptions: {
        select: {
          id: true,
          signatureStatus: true,
          whatsappNotifyStatus: true,
          patientNotifiedAt: true,
          medications: true,
        },
        take: 1,
      },
    },
  });
}
