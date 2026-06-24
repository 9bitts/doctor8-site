// src/app/api/room/[roomId]/token/route.ts
// Issues a Daily.co meeting token after validating that the user
// is either the patient or professional of this appointment

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createMeetingToken } from "@/lib/video";
import { audit } from "@/lib/audit";
import { AuditAction } from "@prisma/client";
import { decrypt } from "@/lib/encryption";
import { safeDecrypt } from "@/lib/psychoanalyst-api";

export async function GET(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Find appointment by meeting room ID
  const appointment = await db.appointment.findFirst({
    where: { meetingRoomId: params.roomId },
    include: {
      patient: { select: { userId: true, firstName: true, lastName: true } },
      professional: { select: { userId: true, firstName: true, lastName: true } },
      psychoanalyst: { select: { userId: true, firstName: true, lastName: true } },
    },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const provider = appointment.professional ?? appointment.psychoanalyst;
  const providerUserId = provider?.userId;

  // Verify user belongs to this appointment
  const isPatient = appointment.patient.userId === session.user.id;
  const isProfessional = providerUserId === session.user.id;

  if (!isPatient && !isProfessional) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Check appointment is confirmed and not too early/late
  if (appointment.status !== "CONFIRMED") {
    return NextResponse.json({ error: "Appointment is not active" }, { status: 400 });
  }

  const now = new Date();
  const scheduledAt = new Date(appointment.scheduledAt);
  const minutesUntil = (scheduledAt.getTime() - now.getTime()) / 1000 / 60;

  // Allow joining 10 minutes early, up to 60 minutes after start
  if (minutesUntil > 10) {
    return NextResponse.json({
      error: `Too early. You can join ${Math.ceil(minutesUntil - 10)} minutes before the appointment.`,
      minutesUntil: Math.ceil(minutesUntil),
    }, { status: 400 });
  }

  // Generate participant name
  let participantName: string;
  if (isPatient) {
    participantName = `${decrypt(appointment.patient.firstName)} ${decrypt(appointment.patient.lastName)}`;
  } else if (provider) {
    const fn = appointment.psychoanalyst ? safeDecrypt(provider.firstName) : provider.firstName;
    const ln = appointment.psychoanalyst ? safeDecrypt(provider.lastName) : provider.lastName;
    participantName = `${appointment.professional ? "Dr. " : ""}${fn} ${ln}`;
  } else {
    participantName = "Provider";
  }

  const roomName = `doctor8-${params.roomId}`;
  const token = await createMeetingToken(roomName, participantName, isProfessional);

  // HIPAA audit log
  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: AuditAction.VIEW_RECORD,
      resource: "ConsultationRoom",
      resourceId: appointment.id,
    },
  });

  return NextResponse.json({
    token,
    roomUrl: appointment.meetingUrl,
    roomName,
    participantName,
    isOwner: isProfessional,
    appointment: {
      id: appointment.id,
      scheduledAt: appointment.scheduledAt,
      durationMins: appointment.durationMins,
    },
  });
}
