// GET — JIT video room token + patient chart for teleconsult sidebar.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { createMeetingToken, createEphemeralRoom, isDailyRoomJoinable } from "@/lib/daily";
import { ensurePatientRecord } from "@/lib/ensure-patient-record";
import { hasTelemedicineTcle } from "@/lib/consent/telemedicine-tcle";
import { isDailyCloudRecordingEnabled } from "@/lib/data-residency";
import { expireStaleJitNoShows } from "@/lib/jit-no-show-expiry";
import { expireStaleJitInProgress } from "@/lib/jit-queue-completion";
import { providerPanelFromSpecialty, providerJitPath } from "@/lib/video-chart-nav";

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

  let entry = await db.jitQueue.findUnique({
    where: { id: params.queueId },
    include: {
      session: {
        include: {
          professional: {
            select: { id: true, userId: true, firstName: true, lastName: true, specialty: true },
          },
        },
      },
    },
  });

  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await expireStaleJitNoShows(entry.sessionId);
  await expireStaleJitInProgress(entry.sessionId);

  const freshEntry = await db.jitQueue.findUnique({
    where: { id: params.queueId },
    include: {
      session: {
        include: {
          professional: {
            select: { id: true, userId: true, firstName: true, lastName: true, specialty: true },
          },
        },
      },
    },
  });
  if (!freshEntry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  entry = freshEntry;

  const isPatient = entry.patientUserId === session.user.id;
  const isProfessional =
    session.user.role === "PROFESSIONAL"
    && entry.session.professional.userId === session.user.id;

  if (!isPatient && !isProfessional) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (isPatient && !(await hasTelemedicineTcle(session.user.id))) {
    return NextResponse.json(
      {
        error: "TCLE_REQUIRED",
        message: "Sign the telemedicine consent form before entering the consultation.",
      },
      { status: 403 },
    );
  }

  if (!["CALLED", "IN_PROGRESS"].includes(entry.status)) {
    return NextResponse.json(
      { error: "NOT_READY", message: "Consultation is not active yet." },
      { status: 425 },
    );
  }

  let roomName = roomNameFromEntry(entry.meetingRoomId, entry.meetingUrl);
  let meetingUrl = entry.meetingUrl;

  // Ephemeral rooms expire (~2h). If the stored room is dead — e.g. the consult
  // sat stuck IN_PROGRESS — recreate it so retrying the join can succeed instead
  // of failing forever with a 503. (Same approach as the humanitarian flow.)
  if (!roomName || !meetingUrl || !(await isDailyRoomJoinable(roomName))) {
    try {
      const fresh = await createEphemeralRoom({ maxParticipants: 2 });
      if (fresh?.url && fresh?.name) {
        await db.jitQueue.update({
          where: { id: entry.id },
          data: { meetingUrl: fresh.url, meetingRoomId: fresh.name },
        });
        roomName = fresh.name;
        meetingUrl = fresh.url;
      }
    } catch (e) {
      console.error("[jit video] room recreate error:", e);
    }
  }

  if (!roomName || !meetingUrl) {
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
  let token: string;
  try {
    token = await createMeetingToken(roomName, userName, isProfessional, tokenExp);
  } catch (e) {
    console.error("[jit video] Daily token error:", e);
    return NextResponse.json(
      { error: "VIDEO_UNAVAILABLE", message: "Video service is temporarily unavailable. Please retry." },
      { status: 503 },
    );
  }

  let patientRecordId: string | null = null;
  if (isProfessional) {
    patientRecordId = await ensurePatientRecord(pro.id, entry.patientUserId);
  }

  const providerPanel = providerPanelFromSpecialty(entry.session.professional.specialty);

  return NextResponse.json({
    url: meetingUrl,
    token,
    userName,
    role: isPatient ? "patient" : "professional",
    providerPanel,
    backHref: isPatient ? "/urgent" : providerJitPath(providerPanel),
    patientRecordId,
    patientUserId: entry.patientUserId,
    otherParty: isPatient
      ? `Dr. ${pro.firstName} ${pro.lastName}`
      : patientName,
    scheduledAt: entry.calledAt?.toISOString() ?? new Date().toISOString(),
    durationMins: entry.session.estimatedMinutesPerPatient || 20,
    queueId: entry.id,
    kind: "jit" as const,
    cloudRecordingEnabled: isDailyCloudRecordingEnabled(),
  });
}
