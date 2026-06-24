import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildAppointmentIcs } from "@/lib/calendar";
import { safeDecrypt } from "@/lib/psychoanalyst-api";
import { PSYCHOANALYSIS_SPECIALTY } from "@/lib/professions";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const appointment = await db.appointment.findUnique({
    where: { id: params.id },
    include: {
      patient: { select: { userId: true } },
      professional: { select: { firstName: true, lastName: true, specialty: true, clinicAddress: true, clinicCity: true } },
      psychoanalyst: { select: { firstName: true, lastName: true } },
    },
  });

  if (!appointment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isPatient = appointment.patient.userId === session.user.id;
  let isProvider = false;

  if (session.user.role === "PROFESSIONAL" && appointment.professionalId) {
    const pro = await db.professionalProfile.findUnique({ where: { userId: session.user.id } });
    isProvider = pro?.id === appointment.professionalId;
  } else if (session.user.role === "PSYCHOANALYST" && appointment.psychoanalystId) {
    const psy = await db.psychoanalystProfile.findUnique({ where: { userId: session.user.id } });
    isProvider = psy?.id === appointment.psychoanalystId;
  }

  if (!isPatient && !isProvider) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const doctorName = appointment.professional
    ? `${appointment.professional.firstName} ${appointment.professional.lastName}`
    : appointment.psychoanalyst
      ? `${safeDecrypt(appointment.psychoanalyst.firstName)} ${safeDecrypt(appointment.psychoanalyst.lastName)}`
      : "Doctor8";

  const specialty = appointment.professional?.specialty ?? PSYCHOANALYSIS_SPECIALTY;
  const start = new Date(appointment.scheduledAt);
  const end = new Date(start.getTime() + (appointment.durationMins || 30) * 60_000);

  const location =
    appointment.type === "TELECONSULT"
      ? "Teleconsulta ? Doctor8"
      : [appointment.professional?.clinicAddress, appointment.professional?.clinicCity].filter(Boolean).join(", ") ||
        "Consulta presencial ? Doctor8";

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://doctor8.app";
  const ics = buildAppointmentIcs({
    appointmentId: appointment.id,
    summary: `Consulta ? Dr. ${doctorName}`,
    description: `${specialty}\n${appointment.type === "TELECONSULT" ? "Teleconsulta online" : "Consulta presencial"}\n\nDoctor8: ${appUrl}/patient/appointments`,
    location,
    url: appointment.meetingUrl ?? `${appUrl}/video/${appointment.id}`,
    start,
    end,
  });

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="doctor8-consulta-${appointment.id}.ics"`,
    },
  });
}
