// src/app/api/professional/documents/[id]/share/route.ts
// POST — share a clinical record with the patient.
//   - If the chart's patient HAS an account: create SharedRecord + bell notification.
//   - If NOT: return needsInvite=true so the UI can offer to send an email invite.
//
// PUT — send the email invite (when the patient has no account yet).
import { NextRequest, NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { createNotification } from "@/lib/notifications";
import { storedNotificationText } from "@/lib/notification-i18n";
import { sendPatientInvite } from "@/lib/email";

function safeDecrypt(v: string | null): string {
  if (v == null) return "";
  try { return decrypt(v); } catch { return v; }
}

// Loads the document, verifies it belongs to this professional, returns context.
async function loadContext(userId: string, documentId: string) {
  const professional = await db.professionalProfile.findUnique({ where: { userId } });
  if (!professional) return { error: "No profile", status: 404 as const };

  const doc = await db.medicalDocument.findUnique({
    where: { id: documentId },
    include: { patientRecord: true },
  });
  if (!doc || doc.professionalId !== professional.id) {
    return { error: "Not found", status: 404 as const };
  }
  if (!doc.patientRecord) {
    return { error: "This record is not attached to a patient chart", status: 400 as const };
  }
  return { professional, doc, record: doc.patientRecord };
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

  // Does the patient have an account?
  let linkedUserId = record.linkedUserId;

  // If not linked yet but we have an email, try to find an account now (maybe they signed up since).
  if (!linkedUserId && record.email) {
    const user = await db.user.findUnique({ where: { email: record.email.toLowerCase() } });
    if (user) {
      linkedUserId = user.id;
      // Persist the link for next time
      await db.patientRecord.update({
        where: { id: record.id },
        data: { linkedUserId: user.id },
      });
    }
  }

  if (!linkedUserId) {
    // No account — cannot share yet. UI should offer invite.
    return NextResponse.json({
      shared: false,
      needsInvite: true,
      hasEmail: !!record.email,
    });
  }

  // Patient has an account — find their PatientProfile (SharedRecord requires patientId).
  const patientProfile = await db.patientProfile.findUnique({
    where: { userId: linkedUserId },
  });
  if (!patientProfile) {
    // Account exists but no patient profile (edge case) — offer invite path instead.
    return NextResponse.json({ shared: false, needsInvite: true, hasEmail: !!record.email });
  }

  // Avoid duplicate shares for the same document+patient
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

  // Bell notification (Phase 1)
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
  } catch (e) {
    return NextResponse.json({ error: "Could not send invite email." }, { status: 500 });
  }

  return NextResponse.json({ invited: true });
}
