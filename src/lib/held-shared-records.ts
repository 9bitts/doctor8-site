// Release or revoke SharedRecords held until PatientProfessionalLink is accepted.

import { db } from "@/lib/db";
import { attachSharedDocumentToChart, findChartForPatient } from "@/lib/shared-document-attach";
import { ensurePatientRecord } from "@/lib/ensure-patient-record";
import { createNotification } from "@/lib/notifications";
import { storedNotificationText } from "@/lib/notification-i18n";
import { decrypt } from "@/lib/encryption";
import { patientChartPathForSpecialty } from "@/lib/patient-chart-path";
import { formatPatientDisplayName } from "@/lib/patient-professional-link";

function safeDecrypt(v: string | null): string {
  if (v == null) return "";
  try {
    return decrypt(v);
  } catch {
    return v;
  }
}

/** Visible shares for professionals (excludes held + revoked). */
export const professionalVisibleShareWhere = {
  heldUntilLinkAccepted: false,
  revokedAt: null,
} as const;

export async function countHeldSharesForPair(params: {
  patientUserId: string;
  professionalId: string;
}): Promise<number> {
  return db.sharedRecord.count({
    where: {
      sharedByUserId: params.patientUserId,
      sharedWithProfessionalId: params.professionalId,
      heldUntilLinkAccepted: true,
      revokedAt: null,
    },
  });
}

/** On ACCEPTED: release held shares and attach to chart. */
export async function releaseHeldSharesForPair(params: {
  patientUserId: string;
  professionalId: string;
  professionalUserId: string;
  specialty: string | null;
}): Promise<{ released: number; chartId: string | null }> {
  const held = await db.sharedRecord.findMany({
    where: {
      sharedByUserId: params.patientUserId,
      sharedWithProfessionalId: params.professionalId,
      heldUntilLinkAccepted: true,
      revokedAt: null,
    },
    select: {
      id: true,
      documentId: true,
      document: { select: { title: true } },
      patient: { select: { firstName: true, lastName: true } },
    },
  });

  if (held.length === 0) return { released: 0, chartId: null };

  await db.sharedRecord.updateMany({
    where: { id: { in: held.map((h) => h.id) } },
    data: { heldUntilLinkAccepted: false },
  });

  const patientUser = await db.user.findUnique({
    where: { id: params.patientUserId },
    select: { email: true },
  });

  let chartId = await findChartForPatient(
    params.professionalId,
    params.patientUserId,
    patientUser?.email ?? null,
  );
  if (!chartId) {
    chartId = await ensurePatientRecord(params.professionalId, params.patientUserId);
  }

  for (const share of held) {
    if (chartId) {
      await attachSharedDocumentToChart({
        documentId: share.documentId,
        chartId,
        professionalId: params.professionalId,
      });
    }

    const patientName =
      formatPatientDisplayName(
        safeDecrypt(share.patient.firstName),
        safeDecrypt(share.patient.lastName),
      ) || "A patient";
    const docTitle = safeDecrypt(share.document.title);
    const docLink = chartId
      ? `${patientChartPathForSpecialty(params.specialty, chartId)}?recordId=${share.documentId}`
      : `/professional/shared?documentId=${share.documentId}`;

    const shareCopy = storedNotificationText("notif.docShared.title", "notif.docShared.body", {
      name: patientName,
      title: docTitle,
    });
    await createNotification({
      userId: params.professionalUserId,
      title: shareCopy.title,
      body: shareCopy.body,
      type: "shared_record",
      data: {
        fromUserId: params.patientUserId,
        documentId: share.documentId,
        link: docLink,
        kind: "patient_shared_document",
        titleKey: "notif.docShared.title",
        bodyKey: "notif.docShared.body",
        bodyParams: { name: patientName, title: docTitle },
      },
    });
  }

  return { released: held.length, chartId };
}

/** On REJECTED: revoke held shares so they never become visible. */
export async function revokeHeldSharesForPair(params: {
  patientUserId: string;
  professionalId: string;
}): Promise<{ revoked: number }> {
  const result = await db.sharedRecord.updateMany({
    where: {
      sharedByUserId: params.patientUserId,
      sharedWithProfessionalId: params.professionalId,
      heldUntilLinkAccepted: true,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
      heldUntilLinkAccepted: false,
    },
  });
  return { revoked: result.count };
}
