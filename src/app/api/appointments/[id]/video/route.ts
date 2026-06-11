// src/app/api/appointments/[id]/video/route.ts
// Returns the video room URL + meeting token for an appointment.
// Only the patient or the professional of the appointment can access.
// Join window: 10 min before the scheduled time until end + 30 min.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getOrCreateRoom, createMeetingToken } from "@/lib/daily";

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
      professional: { select: { userId: true, firstName: true, lastName: true } },
    },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  // Only the two parties can join
  const isPatient = appointment.patient.userId === session.user.id;
  const isProfessional = appointment.professional.userId === session.user.id;
  if (!isPatient && !isProfessional) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (appointment.status === "CANCELLED") {
    return NextResponse.json(
      { error: "This appointment was cancelled." },
      { status: 410 }
    );
  }

  if (appointment.type !== "TELECONSULT") {
    return NextResponse.json(
      { error: "This appointment is in-person and has no video room." },
      { status: 400 }
    );
  }

  const duration = appointment.durationMins || 30;
  const start = appointment.scheduledAt.getTime();
  const now = Date.now();
  const joinOpensAt = start - 10 * 60 * 1000; // 10 min before
  const joinClosesAt = start + (duration + 30) * 60 * 1000; // end + 30 min

  if (now < joinOpensAt) {
    return NextResponse.json(
      {
        error: "TOO_EARLY",
        message: "The room opens 10 minutes before the appointment.",
        opensAt: new Date(joinOpensAt).toISOString(),
        scheduledAt: appointment.scheduledAt.toISOString(),
      },
      { status: 425 }
    );
  }

  if (now > joinClosesAt) {
    return NextResponse.json(
      { error: "EXPIRED", message: "This appointment has already ended." },
      { status: 410 }
    );
  }

  // Create (or fetch) the room and a personal token
  const room = await getOrCreateRoom(
    appointment.id,
    appointment.scheduledAt,
    duration
  );

  const userName = isPatient
    ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
    : `Dr. ${appointment.professional.firstName} ${appointment.professional.lastName}`;

  const tokenExp = Math.floor(joinClosesAt / 1000);
  const token = await createMeetingToken(
    room.name,
    userName,
    isProfessional, // professional is the room owner
    tokenExp
  );

  // HIPAA audit: log video access
  await audit.viewRecord(session.user.id, "Appointment", appointment.id);

  return NextResponse.json({
    url: room.url,
    token,
    userName,
    otherParty: isPatient
      ? `Dr. ${appointment.professional.firstName} ${appointment.professional.lastName}`
      : `${appointment.patient.firstName} ${appointment.patient.lastName}`,
    scheduledAt: appointment.scheduledAt.toISOString(),
    durationMins: duration,
  });
}
