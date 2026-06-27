// src/app/api/appointments/[id]/video/route.ts
// Returns the video room URL + meeting token for an appointment.
// Only the patient or the professional of the appointment can access.
// Join window: 10 min before the scheduled time until end + 30 min.
// Now also returns: role, patientRecordId (for professional sidebar).

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getOrCreateRoom, createMeetingToken } from "@/lib/daily";
import { ensurePatientRecord } from "@/lib/ensure-patient-record";
import { ensureAnalysandForPatient } from "@/lib/providers";
import { safeDecrypt } from "@/lib/psychoanalyst-api";
import { hasTelemedicineTcle } from "@/lib/consent/telemedicine-tcle";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appointment = await db.appointment.findUnique({
    where: { id: params.id },
    include: {
      patient: { select: { userId: true, firstName: true, lastName: true } },
      professional: { select: { userId: true, firstName: true, lastName: true, id: true } },
      psychoanalyst: { select: { userId: true, firstName: true, lastName: true, id: true } },
    },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  const providerUserId = appointment.professional?.userId ?? appointment.psychoanalyst?.userId;
  const provider = appointment.professional ?? appointment.psychoanalyst;

  const isPatient      = appointment.patient.userId === session.user.id;
  const isProfessional = providerUserId === session.user.id;

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

  if (appointment.status === "CANCELLED") {
    return NextResponse.json({ error: "This appointment was cancelled." }, { status: 410 });
  }

  if (appointment.type !== "TELECONSULT") {
    return NextResponse.json({ error: "This appointment is in-person and has no video room." }, { status: 400 });
  }

  const duration    = appointment.durationMins || 30;
  const start       = appointment.scheduledAt.getTime();
  const now         = Date.now();
  const joinOpensAt = start - 10 * 60 * 1000;
  const joinClosesAt= start + (duration + 30) * 60 * 1000;

  if (now < joinOpensAt) {
    return NextResponse.json(
      { error: "TOO_EARLY", message: "The room opens 10 minutes before the appointment.", opensAt: new Date(joinOpensAt).toISOString(), scheduledAt: appointment.scheduledAt.toISOString() },
      { status: 425 }
    );
  }

  if (now > joinClosesAt) {
    return NextResponse.json({ error: "EXPIRED", message: "This appointment has already ended." }, { status: 410 });
  }

  const room = await getOrCreateRoom(appointment.id, appointment.scheduledAt, duration);

  const providerLabel = provider
    ? `${appointment.professional ? "Dr. " : ""}${
        appointment.psychoanalyst
          ? `${safeDecrypt(provider.firstName)} ${safeDecrypt(provider.lastName)}`
          : `${provider.firstName} ${provider.lastName}`
      }`
    : "";

  const userName = isPatient
    ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
    : provider
      ? providerLabel || "Provider"
      : "Provider";

  const tokenExp = Math.floor(joinClosesAt / 1000);
  const token    = await createMeetingToken(room.name, userName, isProfessional, tokenExp);

  await audit.viewRecord(session.user.id, "Appointment", appointment.id);

  // For professionals: ensure patient chart exists (auto-link registered patients)
  let patientRecordId: string | null = null;
  let analysandRecordId: string | null = null;
  let providerPanel: "professional" | "psychoanalyst" = "professional";

  if (isProfessional && appointment.professional) {
    patientRecordId = await ensurePatientRecord(
      appointment.professional.id,
      appointment.patient.userId,
    );
  } else if (isProfessional && appointment.psychoanalyst) {
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
          firstName: appointment.patient.firstName,
          lastName: appointment.patient.lastName,
        },
        patientEmail: patientUser.email,
      });
      analysandRecordId = analysand.id;
    }
  }

  return NextResponse.json({
    url:            room.url,
    token,
    userName,
    role:           isPatient ? "patient" : "professional",
    patientRecordId,
    analysandRecordId,
    providerPanel,
    otherParty:     isPatient
      ? providerLabel
      : `${appointment.patient.firstName} ${appointment.patient.lastName}`,
    patientUserId:  appointment.patient.userId,
    scheduledAt:    appointment.scheduledAt.toISOString(),
    durationMins:   duration,
    appointmentId:  appointment.id,
  });
}
