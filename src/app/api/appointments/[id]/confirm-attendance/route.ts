import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAppUrl } from "@/lib/email-core";
import { notifyProfessionalAttendanceConfirmed } from "@/lib/pro-appointment-notify";

type Params = { params: { id: string } };

async function confirmForPatient(appointmentId: string, userId: string) {
  const patient = await db.patientProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!patient) return { error: "Patient not found", status: 404 as const };

  const appointment = await db.appointment.findFirst({
    where: { id: appointmentId, patientId: patient.id },
    select: {
      id: true,
      status: true,
      scheduledAt: true,
      patientConfirmedAt: true,
      professionalId: true,
      psychoanalystId: true,
      integrativeTherapistId: true,
      patient: { select: { firstName: true, lastName: true } },
    },
  });
  if (!appointment) return { error: "Not found", status: 404 as const };

  if (!["CONFIRMED", "PENDING"].includes(appointment.status)) {
    return { error: "Appointment not active", status: 400 as const };
  }

  if (appointment.patientConfirmedAt) {
    return { ok: true, alreadyConfirmed: true };
  }

  await db.appointment.update({
    where: { id: appointment.id },
    data: { patientConfirmedAt: new Date() },
  });

  notifyProfessionalAttendanceConfirmed({
    appointmentId: appointment.id,
    scheduledAt: appointment.scheduledAt,
    professionalId: appointment.professionalId,
    psychoanalystId: appointment.psychoanalystId,
    integrativeTherapistId: appointment.integrativeTherapistId,
    patientFirstName: appointment.patient.firstName,
    patientLastName: appointment.patient.lastName,
  }).catch((e) => console.error("[CONFIRM-ATTENDANCE] Pro notify failed:", e));

  return { ok: true, alreadyConfirmed: false };
}

/** One-click confirm from email ? redirects after login via callbackUrl. */
export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth();
  const appointmentId = params.id;
  const appUrl = getAppUrl();
  const successUrl = `${appUrl}/patient/appointments?id=${appointmentId}&attendanceConfirmed=1`;

  if (!session?.user) {
    const callback = encodeURIComponent(`/api/appointments/${appointmentId}/confirm-attendance`);
    return NextResponse.redirect(`${appUrl}/login?callbackUrl=${callback}`);
  }
  if (session.user.role !== "PATIENT") {
    return NextResponse.redirect(`${appUrl}/patient`);
  }

  const result = await confirmForPatient(appointmentId, session.user.id);
  if ("error" in result) {
    return NextResponse.redirect(`${appUrl}/patient/appointments?id=${appointmentId}&confirmError=1`);
  }
  return NextResponse.redirect(successUrl);
}

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await confirmForPatient(params.id, session.user.id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result);
}
