// Attach a patient-shared document into a professional's chart (copy + dedupe).

import { db } from "@/lib/db";

export type AttachSharedDocumentResult = {
  attached: boolean;
  alreadyAttached: boolean;
  recordId: string;
};

/** Find an existing chart for a patient user/email under this professional. */
export async function findChartForPatient(
  professionalId: string,
  patientUserId: string,
  patientEmail: string | null | undefined,
): Promise<string | null> {
  const charts = await db.patientRecord.findMany({
    where: { professionalId },
    select: { id: true, linkedUserId: true, email: true },
  });

  const byUser = charts.find((c) => c.linkedUserId === patientUserId);
  if (byUser) return byUser.id;

  if (patientEmail) {
    const normalized = patientEmail.toLowerCase();
    const byEmail = charts.find((c) => (c.email || "").toLowerCase() === normalized);
    if (byEmail) return byEmail.id;
  }

  return null;
}

/** Copy a shared document into a chart if not already attached. */
export async function attachSharedDocumentToChart(opts: {
  documentId: string;
  chartId: string;
  professionalId: string;
}): Promise<AttachSharedDocumentResult | null> {
  const { documentId, chartId, professionalId } = opts;

  const share = await db.sharedRecord.findFirst({
    where: {
      documentId,
      sharedWithProfessionalId: professionalId,
      heldUntilLinkAccepted: false,
      revokedAt: null,
    },
    select: { id: true },
  });
  if (!share) return null;

  const chart = await db.patientRecord.findUnique({
    where: { id: chartId },
    select: { id: true, professionalId: true },
  });
  if (!chart || chart.professionalId !== professionalId) return null;

  const dup = await db.medicalDocument.findFirst({
    where: { patientRecordId: chartId, sourceDocumentId: documentId },
    select: { id: true },
  });
  if (dup) {
    return { attached: true, alreadyAttached: true, recordId: dup.id };
  }

  const original = await db.medicalDocument.findUnique({
    where: { id: documentId },
    select: { type: true, categoryId: true, title: true, content: true, fileUrl: true, recordKind: true },
  });
  if (!original) return null;

  const copy = await db.medicalDocument.create({
    data: {
      patientRecordId: chartId,
      professionalId,
      type: original.type,
      recordKind: original.recordKind,
      categoryId: original.categoryId,
      title: original.title,
      content: original.content,
      fileUrl: original.fileUrl,
      sourceDocumentId: documentId,
    },
  });

  return { attached: true, alreadyAttached: false, recordId: copy.id };
}
