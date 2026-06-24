// Shared logic to notify/deliver an emission to the patient after the professional
// chooses to sign (or skip signing) and send.

import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { createNotification } from "@/lib/notifications";
import { sendPrescriptionNotification } from "@/lib/email-prescription";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://doctor8.app";

export type EmissionDeliverKind = "prescription" | "exam" | "document";

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v || ""; }
}

function shareUrl(hasAccount: boolean, kind: EmissionDeliverKind): string {
  if (!hasAccount) return `${APP_URL}/register`;
  if (kind === "prescription") return `${APP_URL}/patient/prescriptions`;
  return `${APP_URL}/patient/documents`;
}

const NOTIFY_COPY: Record<EmissionDeliverKind, { title: string; body: (doctor: string) => string }> = {
  prescription: {
    title: "Nova receita / New prescription",
    body: (d) => `Dr. ${d}`,
  },
  exam: {
    title: "Novo pedido de exame / New exam request",
    body: (d) => `Dr. ${d} enviou um pedido de exame`,
  },
  document: {
    title: "Novo documento clínico / New clinical document",
    body: (d) => `Dr. ${d} enviou um documento`,
  },
};

export interface DeliverResult {
  delivered: boolean;
  alreadyDelivered: boolean;
  patientRecordId: string | null;
  patient: {
    firstName: string;
    lastName: string;
    email: string | null;
    hasAccount: boolean;
  };
  shareUrl: string;
}

export async function deliverEmissionToPatient(
  professionalUserId: string,
  kind: EmissionDeliverKind,
  id: string,
): Promise<DeliverResult | { error: string; status: number }> {
  const professional = await db.professionalProfile.findUnique({
    where: { userId: professionalUserId },
  });
  if (!professional) return { error: "No profile", status: 404 };

  const doctorName = `${professional.firstName} ${professional.lastName}`.trim();

  if (kind === "prescription") {
    const prescription = await db.prescription.findUnique({
      where: { id },
      include: {
        document: {
          include: {
            patientRecord: { select: { id: true, firstName: true, lastName: true, email: true, linkedUserId: true } },
            patient: { select: { userId: true, firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!prescription || prescription.professionalId !== professional.id) {
      return { error: "Not found", status: 404 };
    }
    if (prescription.patientNotifiedAt) {
      const record = prescription.document?.patientRecord;
      const profile = prescription.document?.patient;
      const firstName = record ? safeDecrypt(record.firstName) : profile ? safeDecrypt(profile.firstName) : "";
      const lastName = record ? safeDecrypt(record.lastName) : profile ? safeDecrypt(profile.lastName) : "";
      const linkedUserId = record?.linkedUserId || profile?.userId || null;
      return {
        delivered: false,
        alreadyDelivered: true,
        patientRecordId: record?.id || null,
        patient: {
          firstName,
          lastName,
          email: record?.email || null,
          hasAccount: !!linkedUserId,
        },
        shareUrl: shareUrl(!!linkedUserId, kind),
      };
    }

    const record = prescription.document?.patientRecord;
    const profile = prescription.document?.patient;
    const notifyUserId = record?.linkedUserId || profile?.userId || null;
    const notifyEmail = record?.email || null;
    const firstName = record ? safeDecrypt(record.firstName) : profile ? safeDecrypt(profile.firstName) : "";
    const lastName = record ? safeDecrypt(record.lastName) : profile ? safeDecrypt(profile.lastName) : "";

    if (notifyUserId) {
      const copy = NOTIFY_COPY.prescription;
      try {
        await createNotification({
          userId: notifyUserId,
          title: copy.title,
          body: copy.body(doctorName),
          type: "system",
          data: { prescriptionId: prescription.id, documentId: prescription.documentId },
        });
      } catch (e) {
        console.error("[DELIVER] prescription notification failed:", e);
      }
      if (notifyEmail) {
        try {
          const u = await db.user.findUnique({ where: { id: notifyUserId }, select: { language: true } });
          await sendPrescriptionNotification({
            patientEmail: notifyEmail,
            patientName: firstName || "—",
            doctorName,
            language: u?.language,
          });
        } catch (e) {
          console.error("[DELIVER] prescription email failed:", e);
        }
      }
    }

    await db.prescription.update({
      where: { id },
      data: { patientNotifiedAt: new Date() },
    });

    return {
      delivered: true,
      alreadyDelivered: false,
      patientRecordId: record?.id || null,
      patient: { firstName, lastName, email: notifyEmail, hasAccount: !!notifyUserId },
      shareUrl: shareUrl(!!notifyUserId, kind),
    };
  }

  // Clinical document (exam or other)
  const document = await db.medicalDocument.findUnique({
    where: { id },
    include: {
      patientRecord: { select: { id: true, firstName: true, lastName: true, email: true, linkedUserId: true } },
      patient: { select: { userId: true, firstName: true, lastName: true } },
    },
  });
  if (!document || document.professionalId !== professional.id) {
    return { error: "Not found", status: 404 };
  }

  const docKind: EmissionDeliverKind =
    document.type === "EXAM_REQUEST" || document.type === "EXAM_RESULT" ? "exam" : "document";

  const record = document.patientRecord;
  const profile = document.patient;
  const firstName = record ? safeDecrypt(record.firstName) : profile ? safeDecrypt(profile.firstName) : "";
  const lastName = record ? safeDecrypt(record.lastName) : profile ? safeDecrypt(profile.lastName) : "";
  const linkedUserId = record?.linkedUserId || profile?.userId || null;
  const notifyEmail = record?.email || null;

  if (document.patientNotifiedAt) {
    return {
      delivered: false,
      alreadyDelivered: true,
      patientRecordId: record?.id || null,
      patient: { firstName, lastName, email: notifyEmail, hasAccount: !!linkedUserId },
      shareUrl: shareUrl(!!linkedUserId, docKind),
    };
  }

  if (linkedUserId) {
    const copy = NOTIFY_COPY[docKind];
    try {
      await createNotification({
        userId: linkedUserId,
        title: copy.title,
        body: copy.body(doctorName),
        type: "system",
        data: { documentId: document.id, type: document.type },
      });
    } catch (e) {
      console.error("[DELIVER] document notification failed:", e);
    }
    if (notifyEmail) {
      try {
        const u = await db.user.findUnique({ where: { id: linkedUserId }, select: { language: true } });
        await sendPrescriptionNotification({
          patientEmail: notifyEmail,
          patientName: firstName || "—",
          doctorName,
          language: u?.language,
        });
      } catch (e) {
        console.error("[DELIVER] document email failed:", e);
      }
    }
  }

  await db.medicalDocument.update({
    where: { id },
    data: { patientNotifiedAt: new Date() },
  });

  return {
    delivered: true,
    alreadyDelivered: false,
    patientRecordId: record?.id || null,
    patient: { firstName, lastName, email: notifyEmail, hasAccount: !!linkedUserId },
    shareUrl: shareUrl(!!linkedUserId, docKind),
  };
}
