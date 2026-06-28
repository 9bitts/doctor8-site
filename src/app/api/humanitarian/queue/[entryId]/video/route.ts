import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { createMeetingToken } from "@/lib/daily";
import { ensurePatientRecord } from "@/lib/ensure-patient-record";
import { ensureAnalysandForPatient } from "@/lib/providers";
import { hasTelemedicineTcle } from "@/lib/consent/telemedicine-tcle";
import { isVolunteerOnEntry } from "@/lib/humanitarian/volunteer-eligibility";

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
          integrativeTherapist: { select: { id: true, userId: true, firstName: true, lastName: true } },
        },
      },
      pool: { include: { campaign: true } },
    },
  });

  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isPatient = entry.patientUserId === session.user.id;
  const isVolunteer = isVolunteerOnEntry(entry.volunteer, session.user.id);

  if (!isPatient && !isVolunteer) {
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
  let analysandRecordId: string | null = null;
  let providerPanel: "professional" | "psychoanalyst" = "professional";

  const vol = entry.volunteer;

  if (vol?.professional) {
    proName = `Dr. ${vol.professional.firstName} ${vol.professional.lastName}`;
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
  }

  const userName = isPatient ? patientName : proName;
  const tokenExp = Math.floor(Date.now() / 1000) + 2 * 60 * 60;
  const token = await createMeetingToken(roomName, userName, isVolunteer, tokenExp);

  return NextResponse.json({
    url: entry.meetingUrl,
    token,
    userName,
    role: isPatient ? "patient" : "professional",
    patientRecordId,
    analysandRecordId,
    providerPanel,
    patientUserId: entry.patientUserId,
    otherParty: isPatient ? proName : patientName,
    scheduledAt: entry.calledAt?.toISOString() ?? new Date().toISOString(),
    durationMins: entry.pool.campaign.estimatedMinutesPerPatient || 15,
    entryId: entry.id,
    kind: "humanitarian" as const,
  });
}
