// src/app/api/appointments/[id]/video/route.ts
// Returns the video room URL + meeting token for an appointment.
// Only the patient or the provider of the appointment can access.
// Join window: 10 min before the scheduled time until end + 30 min.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getOrCreateRoom, createMeetingToken } from "@/lib/daily";
import { ensurePatientRecord } from "@/lib/ensure-patient-record";
import { ensureAnalysandForPatient, ensureIntegrativeClientForPatient } from "@/lib/providers";
import { safeDecrypt } from "@/lib/psychoanalyst-api";
import { hasTelemedicineTcle } from "@/lib/consent/telemedicine-tcle";
import { isDailyCloudRecordingEnabled } from "@/lib/data-residency";
import { appointmentJoinWindow } from "@/lib/appointment-join-window";
import { requireVerifiedProfessional } from "@/lib/professional-verified";
import { providerPanelFromSpecialty, type ProviderChartPanel } from "@/lib/video-chart-nav";

function providerUserIdFromAppointment(appointment: {
  professional?: { userId: string } | null;
  psychoanalyst?: { userId: string } | null;
  integrativeTherapist?: { userId: string } | null;
}): string | undefined {
  return (
    appointment.professional?.userId ??
    appointment.psychoanalyst?.userId ??
    appointment.integrativeTherapist?.userId
  );
}

function providerLabelFromAppointment(appointment: {
  professional?: { firstName: string; lastName: string } | null;
  psychoanalyst?: { firstName: string; lastName: string } | null;
  integrativeTherapist?: { firstName: string; lastName: string } | null;
}): string {
  if (appointment.professional) {
    const p = appointment.professional;
    return `Dr. ${p.firstName} ${p.lastName}`;
  }
  if (appointment.psychoanalyst) {
    const p = appointment.psychoanalyst;
    return `${safeDecrypt(p.firstName)} ${safeDecrypt(p.lastName)}`.trim();
  }
  if (appointment.integrativeTherapist) {
    const p = appointment.integrativeTherapist;
    return `${p.firstName} ${p.lastName}`.trim();
  }
  return "";
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appointment = await db.appointment.findUnique({
    where: { id: params.id },
    include: {
      patient: { select: { userId: true, firstName: true, lastName: true } },
      professional: { select: { userId: true, firstName: true, lastName: true, id: true, specialty: true } },
      psychoanalyst: { select: { userId: true, firstName: true, lastName: true, id: true } },
      integrativeTherapist: { select: { userId: true, firstName: true, lastName: true, id: true } },
    },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  const providerUserId = providerUserIdFromAppointment(appointment);
  const isPatient = appointment.patient.userId === session.user.id;
  const isProvider = providerUserId === session.user.id;

  if (!isPatient && !isProvider) {
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

  if (isProvider && appointment.professional) {
    const verified = await requireVerifiedProfessional(session.user.id);
    if (!verified.ok) {
      return NextResponse.json({ error: verified.error, code: "PROVIDER_NOT_VERIFIED" }, { status: verified.status });
    }
  }

  if (appointment.status === "CANCELLED") {
    return NextResponse.json({ error: "This appointment was cancelled." }, { status: 410 });
  }

  if (appointment.status !== "CONFIRMED") {
    return NextResponse.json(
      { error: "NOT_CONFIRMED", message: "This appointment is not confirmed yet." },
      { status: 425 },
    );
  }

  if (appointment.type !== "TELECONSULT") {
    return NextResponse.json({ error: "This appointment is in-person and has no video room." }, { status: 400 });
  }

  const duration = appointment.durationMins || 30;
  const { joinOpensAt, joinClosesAt, now } = appointmentJoinWindow(
    appointment.scheduledAt,
    duration,
  );

  if (now < joinOpensAt) {
    return NextResponse.json(
      {
        error: "TOO_EARLY",
        message: "The room opens 10 minutes before the appointment.",
        opensAt: new Date(joinOpensAt).toISOString(),
        scheduledAt: appointment.scheduledAt.toISOString(),
      },
      { status: 425 },
    );
  }

  if (now > joinClosesAt) {
    return NextResponse.json({ error: "EXPIRED", message: "This appointment has already ended." }, { status: 410 });
  }

  const providerLabel = providerLabelFromAppointment(appointment);
  const patientName = `${safeDecrypt(appointment.patient.firstName)} ${safeDecrypt(appointment.patient.lastName)}`.trim();

  if (appointment.videoChannel === "GOOGLE_MEET") {
    return NextResponse.json({
      handoff: "google_meet",
      error: "MEET_HANDOFF",
      message: "Join your consultation on Google Meet.",
      professionalName: providerLabel || "Profissional",
      meetUrl: appointment.meetingUrl,
      role: isPatient ? "patient" : "professional",
    });
  }

  let room: { url: string; name: string };
  try {
    room = await getOrCreateRoom(appointment.id, appointment.scheduledAt, duration);
  } catch (e) {
    console.error("[video] Daily room error:", e);
    return NextResponse.json(
      { error: "VIDEO_UNAVAILABLE", message: "Video service is temporarily unavailable." },
      { status: 503 },
    );
  }

  const userName = isPatient ? patientName : providerLabel || "Provider";
  const tokenExp = Math.floor(joinClosesAt / 1000);
  let token: string;
  try {
    token = await createMeetingToken(room.name, userName, isProvider, tokenExp);
  } catch (e) {
    console.error("[video] Daily token error:", e);
    return NextResponse.json(
      { error: "VIDEO_UNAVAILABLE", message: "Video service is temporarily unavailable." },
      { status: 503 },
    );
  }

  const joinNow = new Date();
  if (isPatient && !appointment.patientJoinedAt) {
    await db.appointment.update({
      where: { id: appointment.id },
      data: { patientJoinedAt: joinNow },
    });
  } else if (isProvider && !appointment.professionalJoinedAt) {
    await db.appointment.update({
      where: { id: appointment.id },
      data: { professionalJoinedAt: joinNow },
    });
  }

  await audit.viewRecord(session.user.id, "Appointment", appointment.id);

  let patientRecordId: string | null = null;
  let analysandRecordId: string | null = null;
  let integrativeClientRecordId: string | null = null;
  let providerPanel: ProviderChartPanel = "professional";

  if (isProvider && appointment.professional) {
    patientRecordId = await ensurePatientRecord(
      appointment.professional.id,
      appointment.patient.userId,
    );
    providerPanel = providerPanelFromSpecialty(appointment.professional.specialty);
  } else if (isProvider && appointment.psychoanalyst) {
    providerPanel = "psychoanalyst";
    const patientUser = await db.user.findUnique({
      where: { id: appointment.patient.userId },
      select: { email: true },
    });
    if (patientUser) {
      const analysand = await ensureAnalysandForPatient({
        psychoanalystId: appointment.psychoanalyst.id,
        patientUserId: appointment.patient.userId,
        patientProfile: {
          firstName: safeDecrypt(appointment.patient.firstName),
          lastName: safeDecrypt(appointment.patient.lastName),
        },
        patientEmail: patientUser.email,
      });
      analysandRecordId = analysand.id;
    }
  } else if (isProvider && appointment.integrativeTherapist) {
    providerPanel = "integrative_therapist";
    const patientUser = await db.user.findUnique({
      where: { id: appointment.patient.userId },
      select: { email: true },
    });
    if (patientUser) {
      const client = await ensureIntegrativeClientForPatient({
        integrativeTherapistId: appointment.integrativeTherapist.id,
        patientUserId: appointment.patient.userId,
        patientProfile: {
          firstName: safeDecrypt(appointment.patient.firstName),
          lastName: safeDecrypt(appointment.patient.lastName),
        },
        patientEmail: patientUser.email,
      });
      integrativeClientRecordId = client.id;
    }
  }

  return NextResponse.json({
    url: room.url,
    token,
    userName,
    role: isPatient ? "patient" : "professional",
    patientRecordId,
    analysandRecordId,
    integrativeClientRecordId,
    providerPanel,
    otherParty: isPatient ? providerLabel : patientName,
    patientUserId: appointment.patient.userId,
    scheduledAt: appointment.scheduledAt.toISOString(),
    durationMins: duration,
    appointmentId: appointment.id,
    cloudRecordingEnabled: isDailyCloudRecordingEnabled(),
  });
}
