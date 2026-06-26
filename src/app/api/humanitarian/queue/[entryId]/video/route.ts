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
    return new URL(meetingUrl).pathname.replace(/^\//, "") || null;
  } catch {
    return null;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { entryId: string } },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entry = await db.humanitarianQueueEntry.findUnique({
    where: { id: params.entryId },
    include: {
      volunteer: {
        include: {
          professional: { select: { id: true, userId: true, firstName: true, lastName: true } },
          psychoanalyst: { select: { id: true, userId: true, firstName: true, lastName: true } },
        },
      },
      pool: { include: { campaign: true } },
    },
  });

  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isPatient = entry.patientUserId === session.user.id;
  const vol = entry.volunteer;
  const isProfessional =
    vol &&
    ((vol.professional && vol.professional.userId === session.user.id) ||
      (vol.psychoanalyst && vol.psychoanalyst.userId === session.user.id));

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

  let proName = "Profesional";
  let patientRecordId: string | null = null;

  if (vol?.professional) {
    proName = `Dr. ${vol.professional.firstName} ${vol.professional.lastName}`;
    if (isProfessional) {
      patientRecordId = await ensurePatientRecord(vol.professional.id, entry.patientUserId);
    }
  } else if (vol?.psychoanalyst) {
    proName = `${vol.psychoanalyst.firstName} ${vol.psychoanalyst.lastName}`;
  }

  const userName = isPatient ? patientName : proName;
  const tokenExp = Math.floor(Date.now() / 1000) + 2 * 60 * 60;
  const token = await createMeetingToken(roomName, userName, !!isProfessional, tokenExp);

  return NextResponse.json({
    url: entry.meetingUrl,
    token,
    userName,
    role: isPatient ? "patient" : "professional",
    patientRecordId,
    patientUserId: entry.patientUserId,
    otherParty: isPatient ? proName : patientName,
    scheduledAt: entry.calledAt?.toISOString() ?? new Date().toISOString(),
    durationMins: entry.pool.campaign.estimatedMinutesPerPatient || 15,
    entryId: entry.id,
    kind: "humanitarian" as const,
  });
}
