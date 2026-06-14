// src/app/api/professional/records/[id]/invite/route.ts
// Sends an invite email to the patient of a chart who doesn't have an account yet.
// POST body: { language?: "en" | "pt" | "es" }
// The email is taken from the chart on the server (not trusted from the client).

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { sendPrescriptionInvite } from "@/lib/email-prescription";

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v; }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PROFESSIONAL") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const professional = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!professional) {
    return NextResponse.json({ error: "No profile" }, { status: 404 });
  }

  // The chart must belong to this professional.
  const record = await db.patientRecord.findFirst({
    where: { id: params.id, professionalId: professional.id },
  });
  if (!record) {
    return NextResponse.json({ error: "Chart not found" }, { status: 404 });
  }

  // Already has an account → no invite needed.
  if (record.linkedUserId) {
    return NextResponse.json({ error: "Patient already has an account" }, { status: 400 });
  }

  // Must have an email to invite.
  if (!record.email) {
    return NextResponse.json({ error: "This chart has no email address" }, { status: 400 });
  }

  // Read desired language from body (doctor's panel language).
  let language: string | undefined;
  try {
    const body = await req.json();
    if (typeof body?.language === "string") language = body.language;
  } catch { /* no body is fine */ }

  const patientName = safeDecrypt(record.firstName) || "—";
  const doctorName = `${professional.firstName} ${professional.lastName}`.trim();

  try {
    await sendPrescriptionInvite({
      patientEmail: record.email,
      patientName,
      doctorName,
      language,
    });
  } catch (e) {
    console.error("[INVITE] email failed:", e);
    return NextResponse.json({ error: "Failed to send invite email" }, { status: 500 });
  }

  return NextResponse.json({ success: true, sentTo: record.email });
}
