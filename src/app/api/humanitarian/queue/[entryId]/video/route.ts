import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { createMeetingToken, isDailyRoomJoinable } from "@/lib/daily";
import { createHumanitarianDailyRoom } from "@/lib/humanitarian/daily-room";
import { ensurePatientRecord } from "@/lib/ensure-patient-record";
import { ensureAnalysandForPatient } from "@/lib/providers";
import { hasTelemedicineTcle } from "@/lib/consent/telemedicine-tcle";
import { isVolunteerOnEntry } from "@/lib/humanitarian/volunteer-eligibility";
import { isDailyCloudRecordingEnabled } from "@/lib/data-residency";
import { promoteHumanitarianEntryToInProgress } from "@/lib/humanitarian/dispatcher";
import { ensureIntegrativeClientForPatient } from "@/lib/providers";
import { providerPanelFromSpecialty } from "@/lib/video-chart-nav";

export const runtime = "nodejs";

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
  if (!session?.user) return NextResponse.json({ errorCode: "UNAUTHORIZED", error: "Unauthorized" }, { status: 401 });

  const entry = await db.humanitarianQueueEntry.findUnique({
    where: { id: params.entryId },
    include: {
      volunteer: {
        include: {
          professional: { select: { id: true, userId: true, firstName: true, lastName: true, specialty: true } },
          psychoanalyst: { select: { id: true, userId: true, firstName: true, lastName: true } },
          integrativeTherapist: { select: { id: true, userId: true, firstName: true, lastName: true } },
        },
      },
      pool: { include: { campaign: true } },
    },
  });

  if (!entry) return NextResponse.json({ errorCode: "NOT_FOUND", error: "Not found" }, { status: 404 });

  const isPatient = entry.patientUserId === session.user.id;
  const isVolunteer = isVolunteerOnEntry(entry.volunteer, session.user.id);

  if (!isPatient && !isVolunteer) {
    return NextResponse.json({ errorCode: "FORBIDDEN", error: "Forbidden" }, { status: 403 });
  }

  if (isPatient && !(await hasTelemedicineTcle(session.user.id))) {
    return NextResponse.json(
      {
        errorCode: "TCLE_REQUIRED",
        error: "TCLE_REQUIRED",
        message: "Sign the telemedicine consent form before entering the consultation.",
      },
      { status: 403 },
    );
  }

  if (!["CALLED", "IN_PROGRESS"].includes(entry.status)) {
    if (isPatient && entry.status === "DONE") {
      let proName = "Profesional";
      const vol = entry.volunteer;
      if (vol?.professional) {
        proName = `Dr. ${vol.professional.firstName} ${vol.professional.lastName}`;
      } else if (vol?.psychoanalyst) {
        proName = `${vol.psychoanalyst.firstName} ${vol.psychoanalyst.lastName}`;
      } else if (vol?.integrativeTherapist) {
        proName = `${vol.integrativeTherapist.firstName} ${vol.integrativeTherapist.lastName}`;
      }
      if (entry.completionChannel === "WHATSAPP") {
        return NextResponse.json(
          {
            errorCode: "WHATSAPP_HANDOFF",
            error: "WHATSAPP_HANDOFF",
            message: "Your volunteer will contact you on WhatsApp.",
            professionalName: proName,
            campaignSlug: entry.pool.campaign.slug,
          },
          { status: 410 },
        );
      }
      if (entry.completionChannel === "GOOGLE_MEET") {
        return NextResponse.json(
          {
            errorCode: "MEET_HANDOFF",
            error: "MEET_HANDOFF",
            message: "Join your consultation on Google Meet.",
            professionalName: proName,
            campaignSlug: entry.pool.campaign.slug,
            meetUrl: entry.meetingUrl,
          },
          { status: 410 },
        );
      }
    }
    return NextResponse.json(
      { errorCode: "NOT_READY", error: "NOT_READY", message: "Consultation is not active yet." },
      { status: 425 },
    );
  }

  let roomName = roomNameFromEntry(entry.meetingRoomId, entry.meetingUrl);
  let meetingUrl = entry.meetingUrl;

  // Ephemeral rooms expire (~2h). If the stored room is dead — e.g. the consult
  // sat stuck IN_PROGRESS — recreate it so retrying the join can succeed instead
  // of failing forever with "Could not join video room".
  if (!roomName || !meetingUrl || !(await isDailyRoomJoinable(roomName))) {
    try {
      const fresh = await createHumanitarianDailyRoom();
      if (fresh.url && fresh.name) {
        await db.humanitarianQueueEntry.update({
          where: { id: entry.id },
          data: { meetingUrl: fresh.url, meetingRoomId: fresh.name },
        });
        roomName = fresh.name;
        meetingUrl = fresh.url;
      }
    } catch (e) {
      console.error("[humanitarian video] room recreate error:", e);
    }
  }

  if (!roomName || !meetingUrl) {
    return NextResponse.json({ errorCode: "VIDEO_ROOM_NOT_READY", error: "Video room not ready." }, { status: 503 });
  }

  await promoteHumanitarianEntryToInProgress(params.entryId);

  const patientProfile = await db.patientProfile.findUnique({
    where: { userId: entry.patientUserId },
    select: { firstName: true, lastName: true },
  });

  const patientName = patientProfile
    ? `${safeDecrypt(patientProfile.firstName)} ${safeDecrypt(patientProfile.lastName)}`.trim()
    : "Paciente";

  let proName = "Profesional";
  let patientRecordId: string | null = null;
  let analysandRecordId: string | null = null;
  let integrativeClientRecordId: string | null = null;
  let providerPanel: "professional" | "psychologist" | "psychoanalyst" | "integrative_therapist" = "professional";

  const vol = entry.volunteer;

  if (vol?.professional) {
    proName = `Dr. ${vol.professional.firstName} ${vol.professional.lastName}`;
    providerPanel = providerPanelFromSpecialty(vol.professional.specialty);
    if (isVolunteer) {
      patientRecordId = await ensurePatientRecord(vol.professional.id, entry.patientUserId);
    }
  } else if (vol?.psychoanalyst) {
    proName = `${vol.psychoanalyst.firstName} ${vol.psychoanalyst.lastName}`;
    providerPanel = "psychoanalyst";
    if (isVolunteer) {
      const patientUser = await db.user.findUnique({
        where: { id: entry.patientUserId },
        select: { email: true },
      });
      const profile = await db.patientProfile.findUnique({
        where: { userId: entry.patientUserId },
        select: { firstName: true, lastName: true },
      });
      if (patientUser && profile) {
        const analysand = await ensureAnalysandForPatient({
          psychoanalystId: vol.psychoanalyst.id,
          patientUserId: entry.patientUserId,
          patientProfile: {
            firstName: safeDecrypt(profile.firstName),
            lastName: safeDecrypt(profile.lastName),
          },
          patientEmail: patientUser.email,
        });
        analysandRecordId = analysand.id;
      }
    }
  } else if (vol?.integrativeTherapist) {
    proName = `${vol.integrativeTherapist.firstName} ${vol.integrativeTherapist.lastName}`;
    providerPanel = "integrative_therapist";
    if (isVolunteer) {
      const patientUser = await db.user.findUnique({
        where: { id: entry.patientUserId },
        select: { email: true },
      });
      const profile = await db.patientProfile.findUnique({
        where: { userId: entry.patientUserId },
        select: { firstName: true, lastName: true },
      });
      if (patientUser && profile) {
        const client = await ensureIntegrativeClientForPatient({
          integrativeTherapistId: vol.integrativeTherapist.id,
          patientUserId: entry.patientUserId,
          patientProfile: {
            firstName: safeDecrypt(profile.firstName),
            lastName: safeDecrypt(profile.lastName),
          },
          patientEmail: patientUser.email,
        });
        integrativeClientRecordId = client.id;
      }
    }
  }

  const userName = isPatient ? patientName : proName;
  const tokenExp = Math.floor(Date.now() / 1000) + 7200;
  let token: string;
  try {
    token = await createMeetingToken(roomName, userName, isVolunteer, tokenExp);
  } catch (e) {
    console.error("[humanitarian video] Daily token error:", e);
    return NextResponse.json(
      { error: "VIDEO_UNAVAILABLE", message: "Video service is temporarily unavailable. Please retry." },
      { status: 503 },
    );
  }

  return NextResponse.json({
    url: meetingUrl,
    token,
    userName,
    role: isPatient ? "patient" : "professional",
    patientRecordId,
    analysandRecordId,
    integrativeClientRecordId,
    providerPanel,
    patientUserId: entry.patientUserId,
    otherParty: isPatient ? proName : patientName,
    scheduledAt: entry.calledAt?.toISOString() ?? new Date().toISOString(),
    durationMins: entry.pool.campaign.estimatedMinutesPerPatient || 15,
    entryId: entry.id,
    kind: "humanitarian" as const,
    cloudRecordingEnabled: isDailyCloudRecordingEnabled(),
  });
}
