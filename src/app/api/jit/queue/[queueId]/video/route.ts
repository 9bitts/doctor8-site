// GET — JIT video room token + patient chart for teleconsult sidebar.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { createMeetingToken } from "@/lib/daily";
import { ensurePatientRecord } from "@/lib/ensure-patient-record";

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v; }
}

function roomNameFromEntry(meetingRoomId: string | null, meetingUrl: string | null): string | null {
  if (meetingRoomId) return meetingRoomId;
  if (!meetingUrl) return null;
  try {
    const path = new URL(meetingUrl).pathname.replace(/^\//, "");
    return path || null;
  } catch {
    return null;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { queueId: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entry = await db.jitQueue.findUnique({
    where: { id: params.queueId },
    include: {
      session: {
        include: {
          professional: {
            select: { id: true, userId: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });

  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isPatient = entry.patientUserId === session.user.id;
  const isProfessional =
    session.user.role === "PROFESSIONAL"
    && entry.session.professional.userId === session.user.id;

  if (!isPatient && !isProfessional) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!["CALLED", "IN_PROGRESS"].includes(entry.status)) {
    return NextResponse.json(
      { error: "NOT_READY", message: "Consultation is not active yet." },
      { status: 425 },
    );
  }

  const roomName = roomNameFromEntry(entry.meetingRoomId, entry.meetingUrl);
  if (!roomName || !entry.meetingUrl) {
    return NextResponse.json({ error: "Video room not ready." }, { status: 503 });
  }

  const patientProfile = await db.patientProfile.findUnique({
    where: { userId: entry.patientUserId },
    select: { firstName: true, lastName: true },
  });

  const patientName = patientProfile
    ? `${safeDecrypt(patientProfile.firstName)} ${safeDecrypt(patientProfile.lastName)}`.trim()
    : "Paciente";

  const pro = entry.session.professional;
  const userName = isPatient
    ? patientName
    : `Dr. ${pro.firstName} ${pro.lastName}`;

  const tokenExp = Math.floor(Date.now() / 1000) + 2 * 60 * 60;
  const token = await createMeetingToken(roomName, userName, isProfessional, tokenExp);

  let patientRecordId: string | null = null;
  if (isProfessional) {
    patientRecordId = await ensurePatientRecord(pro.id, entry.patientUserId);
  }

  return NextResponse.json({
    url: entry.meetingUrl,
    token,
    userName,
    role: isPatient ? "patient" : "professional",
    patientRecordId,
    patientUserId: entry.patientUserId,
    otherParty: isPatient
      ? `Dr. ${pro.firstName} ${pro.lastName}`
      : patientName,
    scheduledAt: entry.calledAt?.toISOString() ?? new Date().toISOString(),
    durationMins: entry.session.estimatedMinutesPerPatient || 20,
    queueId: entry.id,
    kind: "jit" as const,
  });
}
