import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { safeDecrypt } from "@/lib/integrative-therapist-api";
import { createNotification } from "@/lib/notifications";
import { storedNotificationText } from "@/lib/notification-i18n";
import { sendPatientInvite } from "@/lib/email";

async function loadContext(userId: string, documentId: string) {
  const therapist = await db.integrativeTherapistProfile.findUnique({ where: { userId } });
  if (!therapist) return { error: "No profile", status: 404 as const };

  const doc = await db.medicalDocument.findUnique({
    where: { id: documentId },
    include: { integrativeClientRecord: true },
  });
  if (!doc || doc.integrativeTherapistId !== therapist.id) {
    return { error: "Not found", status: 404 as const };
  }
  if (!doc.integrativeClientRecord) {
    return { error: "This record is not attached to a client", status: 400 as const };
  }
  return { therapist, doc, record: doc.integrativeClientRecord };
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "INTEGRATIVE_THERAPIST") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ctx = await loadContext(session.user.id, params.id);
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const { doc, record, therapist } = ctx;

  let linkedUserId = record.linkedUserId;
  if (!linkedUserId && record.email) {
    const user = await db.user.findUnique({ where: { email: record.email.toLowerCase() } });
    if (user) {
      linkedUserId = user.id;
      await db.integrativeClientRecord.update({
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

  const therapistName = `${safeDecrypt(therapist.firstName)} ${safeDecrypt(therapist.lastName)}`.trim();
  const sessionCopy = storedNotificationText(
    "notif.integrativeShared.title",
    "notif.integrativeShared.body",
    { therapist: therapistName },
  );
  await createNotification({
    userId: linkedUserId,
    title: sessionCopy.title,
    body: sessionCopy.body,
    type: "shared_record",
    data: {
      documentId: doc.id,
      titleKey: "notif.integrativeShared.title",
      bodyKey: "notif.integrativeShared.body",
      bodyParams: { therapist: therapistName },
      href: "/patient/integrative-care",
    },
  });

  return NextResponse.json({ shared: true });
}

export async function PUT(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "INTEGRATIVE_THERAPIST") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ctx = await loadContext(session.user.id, params.id);
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const { record, therapist } = ctx;
  if (!record.email) {
    return NextResponse.json({ error: "This client has no email to invite." }, { status: 400 });
  }

  try {
    const sender = await db.user.findUnique({
      where: { id: session.user.id },
      select: { language: true },
    });
    await sendPatientInvite({
      email: record.email,
      patientName: `${safeDecrypt(record.firstName)} ${safeDecrypt(record.lastName)}`.trim(),
      doctorName: `${safeDecrypt(therapist.firstName)} ${safeDecrypt(therapist.lastName)}`.trim(),
      language: sender?.language,
    });
  } catch {
    return NextResponse.json({ error: "Could not send invite email." }, { status: 500 });
  }

  return NextResponse.json({ invited: true });
}
