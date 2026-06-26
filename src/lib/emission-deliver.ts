// Shared logic to notify/deliver an emission to the patient after the professional
// chooses to sign (or skip signing) and send.

import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { createNotification } from "@/lib/notifications";
import { sendPrescriptionNotification } from "@/lib/email-prescription";
import { sendEmissionWhatsApp } from "@/lib/emission-whatsapp";

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
    hasPhone: boolean;
  };
  shareUrl: string;
  whatsapp?: {
    status: string;
    error?: string;
    waMeUrl?: string | null;
  };
}

export async function deliverEmissionToPatient(
  professionalUserId: string,
  kind: EmissionDeliverKind,
  id: string,
  opts?: { sendWhatsApp?: boolean; whatsappMessage?: string; forceWhatsapp?: boolean },
): Promise<DeliverResult | { error: string; status: number }> {
  const professional = await db.professionalProfile.findUnique({
    where: { userId: professionalUserId },
  });
  if (!professional) return { error: "No profile", status: 404 };

  const doctorName = `${professional.firstName} ${professional.lastName}`.trim();

  async function maybeWhatsApp(
    prescriptionId: string | undefined,
    documentId: string | undefined,
    record: { phone?: string | null } | null | undefined,
    profile: { phone?: string | null } | null | undefined,
    deliverKind: EmissionDeliverKind,
  ) {
    if (!opts?.sendWhatsApp) return undefined;
    const hasPhone = !!(record?.phone || profile?.phone);
    const wa = await sendEmissionWhatsApp({
      kind: deliverKind,
      prescriptionId,
      documentId,
      doctorName,
      force: opts.forceWhatsapp,
      customMessage: opts.whatsappMessage,
    });
    return { status: wa.status, error: wa.error, waMeUrl: wa.waMeUrl };
  }

  if (kind === "prescription") {
    const prescription = await db.prescription.findUnique({
      where: { id },
      include: {
        document: {
          include: {
            patientRecord: { select: { id: true, firstName: true, lastName: true, email: true, linkedUserId: true, phone: true } },
            patient: { select: { userId: true, firstName: true, lastName: true, phone: true } },
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
          hasPhone: !!(record?.phone || profile?.phone),
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
          data: {
            prescriptionId: prescription.id,
            documentId: prescription.documentId,
            titleKey: "notif.prescription.title",
            bodyKey: "notif.prescription.body",
            bodyParams: { doctor: doctorName },
          },
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

    const whatsapp = await maybeWhatsApp(
      prescription.id,
      undefined,
      record,
      profile,
      kind,
    );

    return {
      delivered: true,
      alreadyDelivered: false,
      patientRecordId: record?.id || null,
      patient: {
        firstName,
        lastName,
        email: notifyEmail,
        hasAccount: !!notifyUserId,
        hasPhone: !!(record?.phone || profile?.phone),
      },
      shareUrl: shareUrl(!!notifyUserId, kind),
      whatsapp,
    };
  }

  // Clinical document (exam or other)
  const document = await db.medicalDocument.findUnique({
    where: { id },
    include: {
      patientRecord: { select: { id: true, firstName: true, lastName: true, email: true, linkedUserId: true, phone: true } },
      patient: { select: { userId: true, firstName: true, lastName: true, phone: true } },
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
      patient: { firstName, lastName, email: notifyEmail, hasAccount: !!linkedUserId, hasPhone: !!(record?.phone || profile?.phone) },
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
        data: {
          documentId: document.id,
          type: document.type,
          titleKey: docKind === "exam" ? "notif.exam.title" : "notif.document.title",
          bodyKey: docKind === "exam" ? "notif.exam.body" : "notif.document.body",
          bodyParams: { doctor: doctorName },
        },
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

  const whatsapp = await maybeWhatsApp(
    undefined,
    document.id,
    record,
    profile,
    docKind,
  );

  return {
    delivered: true,
    alreadyDelivered: false,
    patientRecordId: record?.id || null,
    patient: {
      firstName,
      lastName,
      email: notifyEmail,
      hasAccount: !!linkedUserId,
      hasPhone: !!(record?.phone || profile?.phone),
    },
    shareUrl: shareUrl(!!linkedUserId, docKind),
    whatsapp,
  };
}
