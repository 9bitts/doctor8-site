// Public magic-link + PIN API for prior exam-result upload (no login).

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encryption";
import { createNotification } from "@/lib/notifications";
import { storedNotificationText } from "@/lib/notification-i18n";
import { patientChartPathForSpecialty } from "@/lib/patient-chart-path";
import {
  checkExamResultRequestAccess,
  verifyExamResultPin,
} from "@/lib/exam-result-request";
import {
  checkRateLimit,
  clientIp,
  RATE_LIMITS,
  rateLimitResponse,
} from "@/lib/rate-limit";
import {
  buildKey,
  inferUploadContentType,
  isAllowedUpload,
  MAX_UPLOAD_BYTES,
  uploadToS3,
} from "@/lib/s3";

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v; }
}

async function loadInvite(token: string) {
  return db.examResultRequest.findUnique({
    where: { token },
    include: {
      professional: {
        select: {
          id: true,
          userId: true,
          firstName: true,
          lastName: true,
          specialty: true,
        },
      },
      patientRecord: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } },
) {
  const ip = clientIp(req);
  const rate = await checkRateLimit({
    namespace: "exam-result-request-public:ip",
    key: ip,
    ...RATE_LIMITS.examResultRequestPublicIp,
  });
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSec);

  const invite = await loadInvite(params.token);
  if (!invite) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const access = checkExamResultRequestAccess(invite);
  if (!access.ok) {
    if (invite.expiresAt < new Date() && invite.status === "PENDING") {
      await db.examResultRequest.update({
        where: { id: invite.id },
        data: { status: "EXPIRED" },
      });
    }
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const pinParam = new URL(req.url).searchParams.get("pin");
  if (pinParam != null) {
    if (!(await verifyExamResultPin(pinParam, invite.viewPinHash))) {
      return NextResponse.json({ error: "Invalid PIN", requiresPin: true }, { status: 401 });
    }
  }

  // Count page opens only (not PIN retries).
  if (pinParam == null) {
    await db.examResultRequest.update({
      where: { id: invite.id },
      data: { viewCount: { increment: 1 } },
    });
  }

  return NextResponse.json({
    requiresPin: true,
    pinOk: pinParam != null,
    doctorName: `${invite.professional.firstName} ${invite.professional.lastName}`.trim(),
    patientName: invite.patientRecord
      ? safeDecrypt(invite.patientRecord.firstName).trim().split(/\s+/)[0] || ""
      : "",
    status: invite.status,
    canSubmit: access.canSubmit,
    uploadCount: invite.uploadCount,
    maxUploads: invite.maxUploads,
    expiresAt: invite.expiresAt.toISOString(),
    note: invite.note ? safeDecrypt(invite.note) : "",
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } },
) {
  const ip = clientIp(req);
  const rate = await checkRateLimit({
    namespace: "exam-result-request-public:ip",
    key: ip,
    ...RATE_LIMITS.examResultRequestPublicIp,
  });
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSec);

  const invite = await loadInvite(params.token);
  if (!invite) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const access = checkExamResultRequestAccess(invite);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (!access.canSubmit) {
    return NextResponse.json({ error: "Upload limit reached." }, { status: 410 });
  }

  const form = await req.formData();
  const pin = String(form.get("pin") || "");
  const titleRaw = String(form.get("title") || "").trim();
  const notes = String(form.get("notes") || "").trim();
  const file = form.get("file");

  if (!(await verifyExamResultPin(pin, invite.viewPinHash))) {
    return NextResponse.json({ error: "Invalid PIN", requiresPin: true }, { status: 401 });
  }

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!isAllowedUpload(file)) {
    return NextResponse.json(
      { error: "File type not allowed. Use PDF, image, or video." },
      { status: 400 },
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File too large. Maximum is 50 MB." }, { status: 400 });
  }

  const title = titleRaw || file.name || "Exam result";
  if (title.length > 200) {
    return NextResponse.json({ error: "Title too long" }, { status: 400 });
  }

  const folder = `exam-result-requests/${params.token.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80)}`;
  const key = buildKey(folder, file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  await uploadToS3({
    key,
    body: buffer,
    contentType: inferUploadContentType(file),
  });

  const patientLabel = invite.patientRecord
    ? `${safeDecrypt(invite.patientRecord.firstName)} ${safeDecrypt(invite.patientRecord.lastName)}`.trim()
    : "Paciente";

  const doc = await db.$transaction(async (tx) => {
    const created = await tx.medicalDocument.create({
      data: {
        patientRecordId: invite.patientRecordId,
        professionalId: invite.professionalId,
        type: "EXAM_RESULT",
        title: encrypt(title),
        content: notes ? encrypt(notes) : null,
        fileUrl: encrypt(key),
        // Marks as patient-originated so chart "Resultados" modal includes it.
        sourceDocumentId: invite.id,
      },
    });

    await tx.examResultRequest.update({
      where: { id: invite.id },
      data: {
        uploadCount: { increment: 1 },
        status: "COMPLETED",
        completedAt: invite.completedAt ?? new Date(),
      },
    });

    return created;
  });

  const chartLink = `${patientChartPathForSpecialty(
    invite.professional.specialty,
    invite.patientRecordId,
  )}?viewExamResults=1`;

  const copy = storedNotificationText("notif.examResultUploaded.title", "notif.examResultUploaded.body", {
    name: patientLabel,
    title,
  });
  await createNotification({
    userId: invite.professional.userId,
    title: copy.title,
    body: copy.body,
    type: "shared_record",
    data: {
      documentId: doc.id,
      chartId: invite.patientRecordId,
      link: chartLink,
      kind: "exam_result_uploaded",
      titleKey: "notif.examResultUploaded.title",
      bodyKey: "notif.examResultUploaded.body",
      bodyParams: { name: patientLabel, title },
    },
  });

  return NextResponse.json({
    ok: true,
    documentId: doc.id,
    uploadCount: invite.uploadCount + 1,
    maxUploads: invite.maxUploads,
    canSubmitMore: invite.uploadCount + 1 < invite.maxUploads,
  }, { status: 201 });
}
