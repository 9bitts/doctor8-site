// Pre-consultation intake for a single appointment — only within the join window (AGD-14/15).

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { appointmentJoinWindow } from "@/lib/appointment-join-window";
import { parseAppointmentIntake } from "@/lib/appointment-intake";
import { isPsychoanalystAppointmentRequest } from "@/lib/appointment-provider-access";

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

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appointment = await db.appointment.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      scheduledAt: true,
      durationMins: true,
      status: true,
      chiefComplaint: true,
      patient: { select: { userId: true } },
      professional: { select: { userId: true } },
      psychoanalyst: { select: { userId: true } },
      integrativeTherapist: { select: { userId: true } },
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

  if (isProvider && isPsychoanalystAppointmentRequest(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (appointment.status === "CANCELLED") {
    return NextResponse.json({ error: "This appointment was cancelled." }, { status: 410 });
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
        message: "Intake is available from 10 minutes before the appointment.",
        opensAt: new Date(joinOpensAt).toISOString(),
        scheduledAt: appointment.scheduledAt.toISOString(),
      },
      { status: 425 },
    );
  }

  if (now > joinClosesAt) {
    return NextResponse.json(
      { error: "EXPIRED", message: "The intake window for this appointment has closed." },
      { status: 410 },
    );
  }

  const intake = parseAppointmentIntake(appointment.chiefComplaint);
  await audit.viewRecord(session.user.id, "Appointment", `${appointment.id}:intake`);

  return NextResponse.json({ intake });
}
