// POST — create a magic-link + PIN invite for prior exam-result upload.
// GET  — list recent invites for the logged-in professional.

import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/encryption";
import { sendExamResultRequestEmail } from "@/lib/email";
import {
  EXAM_RESULT_REQUEST_DEFAULT_EXPIRES_DAYS,
  EXAM_RESULT_REQUEST_MAX_EXPIRES_DAYS,
  EXAM_RESULT_REQUEST_MAX_UPLOADS,
  EXAM_RESULT_REQUEST_MAX_VIEWS,
  examResultRequestPublicUrl,
  generateExamResultPin,
  hashExamResultPin,
} from "@/lib/exam-result-request";

const createSchema = z.object({
  patientRecordId: z.string().min(1),
  expiresInDays: z.number().int().min(1).max(EXAM_RESULT_REQUEST_MAX_EXPIRES_DAYS).optional(),
  note: z.string().max(2000).optional().or(z.literal("")),
  sendEmail: z.boolean().optional(),
});

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v; }
}

export async function GET() {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;
  const { professional } = ctx;

  const now = new Date();
  const rows = await db.examResultRequest.findMany({
    where: { professionalId: professional.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      patientRecord: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  return NextResponse.json({
    requests: rows.map((r) => {
      const expired = r.status === "PENDING" && r.expiresAt < now;
      return {
        id: r.id,
        url: examResultRequestPublicUrl(r.token),
        status: expired ? "EXPIRED" : r.status,
        patientRecordId: r.patientRecordId,
        patientName: r.patientRecord
          ? `${safeDecrypt(r.patientRecord.firstName)} ${safeDecrypt(r.patientRecord.lastName)}`.trim()
          : "—",
        uploadCount: r.uploadCount,
        maxUploads: r.maxUploads,
        expiresAt: r.expiresAt.toISOString(),
        completedAt: r.completedAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
      };
    }),
  });
}

export async function POST(req: NextRequest) {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;
  const { professional } = ctx;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const record = await db.patientRecord.findUnique({
    where: { id: parsed.data.patientRecordId },
    select: {
      id: true,
      professionalId: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  });
  if (!record || record.professionalId !== professional.id) {
    return NextResponse.json({ error: "Chart not found" }, { status: 404 });
  }

  const days = parsed.data.expiresInDays ?? EXAM_RESULT_REQUEST_DEFAULT_EXPIRES_DAYS;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const pin = generateExamResultPin();
  const viewPinHash = await hashExamResultPin(pin);
  const token = randomBytes(32).toString("base64url");
  const note = (parsed.data.note || "").trim();

  const created = await db.examResultRequest.create({
    data: {
      token,
      patientRecordId: record.id,
      professionalId: professional.id,
      viewPinHash,
      maxViews: EXAM_RESULT_REQUEST_MAX_VIEWS,
      maxUploads: EXAM_RESULT_REQUEST_MAX_UPLOADS,
      note: note ? encrypt(note) : null,
      expiresAt,
    },
  });

  const url = examResultRequestPublicUrl(created.token);
  const patientName = `${safeDecrypt(record.firstName)} ${safeDecrypt(record.lastName)}`.trim() || "Paciente";
  const doctorName = `${professional.firstName} ${professional.lastName}`.trim() || "Doctor8";
  const chartEmail = safeDecrypt(record.email).trim().toLowerCase();

  let emailSent = false;
  if (parsed.data.sendEmail && chartEmail.includes("@")) {
    try {
      await sendExamResultRequestEmail({
        email: chartEmail,
        patientName,
        doctorName,
        url,
        pin,
        expiresAt,
      });
      emailSent = true;
    } catch {
      emailSent = false;
    }
  }

  return NextResponse.json({
    id: created.id,
    url,
    pin,
    expiresAt: created.expiresAt.toISOString(),
    emailSent,
    patientEmail: chartEmail || null,
  }, { status: 201 });
}
