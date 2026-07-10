// POST — share a clinical record with the patient.
// PUT — send the email invite (when the patient has no account yet).

import { NextRequest, NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { createNotification } from "@/lib/notifications";
import { storedNotificationText } from "@/lib/notification-i18n";
import { sendPatientInvite } from "@/lib/email";
import { canEditChart, resolveChartAccess } from "@/lib/chart-access";

function safeDecrypt(v: string | null): string {
  if (v == null) return "";
  try { return decrypt(v); } catch { return v; }
}

async function loadContext(userId: string, documentId: string) {
  const professional = await db.professionalProfile.findUnique({ where: { userId } });
  if (!professional) return { error: "No profile", status: 404 as const };

  const doc = await db.medicalDocument.findUnique({
    where: { id: documentId },
    include: { patientRecord: true },
  });
  if (!doc?.patientRecordId || !doc.patientRecord) {
    return { error: "Not found", status: 404 as const };
  }

  const access = await resolveChartAccess(professional.id, doc.patientRecordId);
  if (!canEditChart(access)) {
    return { error: "Not found", status: 404 as const };
  }

  return { professional, doc, record: doc.patientRecord, access };
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authCtx = await requireProfessionalApi();
  if (isApiError(authCtx)) return authCtx.error;

  const loaded = await loadContext(authCtx.userId, params.id);
  if ("error" in loaded) return NextResponse.json({ error: loaded.error }, { status: loaded.status });

  const { doc, record, professional } = loaded;

  let linkedUserId = record.linkedUserId;

  if (!linkedUserId && record.email) {
    const user = await db.user.findUnique({ where: { email: record.email.toLowerCase() } });
    if (user?.role === "PATIENT") {
      linkedUserId = user.id;
      await db.patientRecord.update({
        where: { id: record.id },
        data: { linkedUserId: user.id },
      });
    }
  }

  if (!linkedUserId) {
    return NextResponse.json({
      shared: false,
      needsInvite: true,
      hasEmail: !!record.email,
    });
  }

  const patientProfile = await db.patientProfile.findUnique({
    where: { userId: linkedUserId },
  });
  if (!patientProfile) {
    return NextResponse.json({ shared: false, needsInvite: true, hasEmail: !!record.email });
  }

  const existing = await db.sharedRecord.findFirst({
    where: { documentId: doc.id, patientId: patientProfile.id },
  });
  if (!existing) {
    await db.sharedRecord.create({
      data: {
        documentId: doc.id,
        patientId: patientProfile.id,
        sharedWithUserId: linkedUserId,
      },
    });
  }

  const doctorName = `${professional.firstName} ${professional.lastName}`;
  const recordCopy = storedNotificationText("notif.recordShared.title", "notif.recordShared.body", {
    doctor: doctorName,
  });
  await createNotification({
    userId: linkedUserId,
    title: recordCopy.title,
    body: recordCopy.body,
    type: "shared_record",
    data: {
      documentId: doc.id,
      titleKey: "notif.recordShared.title",
      bodyKey: "notif.recordShared.body",
      bodyParams: { doctor: doctorName },
    },
  });

  return NextResponse.json({ shared: true });
}

export async function PUT(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authCtx = await requireProfessionalApi();
  if (isApiError(authCtx)) return authCtx.error;

  const loaded = await loadContext(authCtx.userId, params.id);
  if ("error" in loaded) return NextResponse.json({ error: loaded.error }, { status: loaded.status });

  const { record, professional } = loaded;

  if (!record.email) {
    return NextResponse.json({ error: "This chart has no email to invite." }, { status: 400 });
  }

  try {
    const sender = await db.user.findUnique({
      where: { id: authCtx.userId },
      select: { language: true },
    });

    await sendPatientInvite({
      email: record.email,
      patientName: `${safeDecrypt(record.firstName)} ${safeDecrypt(record.lastName)}`.trim(),
      doctorName: `${professional.firstName} ${professional.lastName}`.trim(),
      language: sender?.language,
    });
  } catch {
    return NextResponse.json({ error: "Could not send invite email." }, { status: 500 });
  }

  return NextResponse.json({ invited: true });
}
