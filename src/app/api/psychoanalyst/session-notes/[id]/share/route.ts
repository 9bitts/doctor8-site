import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { createNotification } from "@/lib/notifications";
import { storedNotificationText } from "@/lib/notification-i18n";
import { sendPatientInvite } from "@/lib/email";

function safeDecrypt(v: string | null): string {
  if (v == null) return "";
  try { return decrypt(v); } catch { return v; }
}

async function loadContext(userId: string, documentId: string) {
  const psychoanalyst = await db.psychoanalystProfile.findUnique({ where: { userId } });
  if (!psychoanalyst) return { error: "No profile", status: 404 as const };

  const doc = await db.medicalDocument.findUnique({
    where: { id: documentId },
    include: { analysandRecord: true },
  });
  if (!doc || doc.psychoanalystId !== psychoanalyst.id) {
    return { error: "Not found", status: 404 as const };
  }
  if (!doc.analysandRecord) {
    return { error: "This record is not attached to an analysand", status: 400 as const };
  }
  return { psychoanalyst, doc, record: doc.analysandRecord };
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PSYCHOANALYST") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ctx = await loadContext(session.user.id, params.id);
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const { doc, record, psychoanalyst } = ctx;

  let linkedUserId = record.linkedUserId;
  if (!linkedUserId && record.email) {
    const user = await db.user.findUnique({ where: { email: record.email.toLowerCase() } });
    if (user) {
      linkedUserId = user.id;
      await db.analysandRecord.update({
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

  const analystName = `${safeDecrypt(psychoanalyst.firstName)} ${safeDecrypt(psychoanalyst.lastName)}`;
  const sessionCopy = storedNotificationText("notif.sessionShared.title", "notif.sessionShared.body", {
    analyst: analystName,
  });
  await createNotification({
    userId: linkedUserId,
    title: sessionCopy.title,
    body: sessionCopy.body,
    type: "shared_record",
    data: {
      documentId: doc.id,
      titleKey: "notif.sessionShared.title",
      bodyKey: "notif.sessionShared.body",
      bodyParams: { analyst: analystName },
    },
  });

  return NextResponse.json({ shared: true });
}

export async function PUT(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PSYCHOANALYST") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ctx = await loadContext(session.user.id, params.id);
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const { record, psychoanalyst } = ctx;
  if (!record.email) {
    return NextResponse.json({ error: "This analysand has no email to invite." }, { status: 400 });
  }

  try {
    const sender = await db.user.findUnique({
      where: { id: session.user.id },
      select: { language: true },
    });
    await sendPatientInvite({
      email: record.email,
      patientName: `${safeDecrypt(record.firstName)} ${safeDecrypt(record.lastName)}`.trim(),
      doctorName: `${safeDecrypt(psychoanalyst.firstName)} ${safeDecrypt(psychoanalyst.lastName)}`.trim(),
      language: sender?.language,
    });
  } catch {
    return NextResponse.json({ error: "Could not send invite email." }, { status: 500 });
  }

  return NextResponse.json({ invited: true });
}
