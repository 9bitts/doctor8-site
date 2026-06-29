// Sends an invite email to the patient of a chart who doesn't have an account yet.
// POST body: { language?: "en" | "pt" | "es" }
// GET — returns latest invite status for the chart.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendPrescriptionInvite } from "@/lib/email-prescription";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { safeDecrypt } from "@/lib/sign-helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const record = await db.patientRecord.findFirst({
    where: { id: params.id, professionalId: ctx.professional.id },
    select: { id: true, linkedUserId: true },
  });
  if (!record) {
    return NextResponse.json({ error: "Chart not found" }, { status: 404 });
  }

  const latest = await db.patientChartInvite.findFirst({
    where: { patientRecordId: record.id },
    orderBy: { sentAt: "desc" },
    select: { status: true, sentAt: true, linkedAt: true, email: true },
  });

  return NextResponse.json({
    hasAccount: !!record.linkedUserId,
    invite: latest
      ? {
          status: latest.status,
          sentAt: latest.sentAt.toISOString(),
          linkedAt: latest.linkedAt?.toISOString() ?? null,
          email: latest.email,
        }
      : null,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;
  const { professional } = ctx;

  const record = await db.patientRecord.findFirst({
    where: { id: params.id, professionalId: professional.id },
  });
  if (!record) {
    return NextResponse.json({ error: "Chart not found" }, { status: 404 });
  }

  if (record.linkedUserId) {
    return NextResponse.json({ error: "Patient already has an account" }, { status: 400 });
  }

  if (!record.email) {
    return NextResponse.json({ error: "This chart has no email address" }, { status: 400 });
  }

  let language: string | undefined;
  try {
    const body = await req.json();
    if (typeof body?.language === "string") language = body.language;
  } catch { /* no body is fine */ }

  const patientName = safeDecrypt(record.firstName) || "—";
  const doctorName = `${professional.firstName} ${professional.lastName}`.trim();
  const email = record.email.toLowerCase();

  try {
    await sendPrescriptionInvite({
      patientEmail: email,
      patientName,
      doctorName,
      language,
    });
  } catch (e) {
    console.error("[INVITE] email failed:", e);
    await db.patientChartInvite.create({
      data: {
        patientRecordId: record.id,
        sentByProfessionalId: professional.id,
        email,
        status: "FAILED",
      },
    });
    return NextResponse.json({ error: "Failed to send invite email" }, { status: 500 });
  }

  const invite = await db.patientChartInvite.create({
    data: {
      patientRecordId: record.id,
      sentByProfessionalId: professional.id,
      email,
      status: "SENT",
    },
  });

  return NextResponse.json({
    success: true,
    sentTo: email,
    invite: {
      id: invite.id,
      status: invite.status,
      sentAt: invite.sentAt.toISOString(),
    },
  });
}
