import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildAppointmentIcs } from "@/lib/calendar";
import { safeDecrypt } from "@/lib/psychoanalyst-api";
import { PSYCHOANALYSIS_SPECIALTY } from "@/lib/professions";
import { INTEGRATIVE_THERAPY_SPECIALTY } from "@/lib/integrative-therapy-specialty";
import { getUserLang } from "@/lib/i18n/server-lang";
import { translate } from "@/lib/i18n/translations";
import { interpolate } from "@/lib/notification-i18n";

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
      integrativeTherapist: {
        select: { firstName: true, lastName: true, clinicAddress: true, clinicCity: true },
      },
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
  } else if (session.user.role === "INTEGRATIVE_THERAPIST" && appointment.integrativeTherapistId) {
    const it = await db.integrativeTherapistProfile.findUnique({ where: { userId: session.user.id } });
    isProvider = it?.id === appointment.integrativeTherapistId;
  }

  if (!isPatient && !isProvider) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const lang = await getUserLang(session.user.id);
  const t = (key: string, vars?: Record<string, string>) =>
    vars ? interpolate(translate(lang, key), vars) : translate(lang, key);

  const doctorName = appointment.professional
    ? `${appointment.professional.firstName} ${appointment.professional.lastName}`
    : appointment.psychoanalyst
      ? `${safeDecrypt(appointment.psychoanalyst.firstName)} ${safeDecrypt(appointment.psychoanalyst.lastName)}`
      : appointment.integrativeTherapist
        ? `${appointment.integrativeTherapist.firstName} ${appointment.integrativeTherapist.lastName}`
        : "Doctor8";

  const specialty = appointment.professional?.specialty
    ?? (appointment.integrativeTherapist ? INTEGRATIVE_THERAPY_SPECIALTY : PSYCHOANALYSIS_SPECIALTY);
  const start = new Date(appointment.scheduledAt);
  const end = new Date(start.getTime() + (appointment.durationMins || 30) * 60_000);

  const isTele = appointment.type === "TELECONSULT";
  const location = isTele
    ? t("cal.teleconsultLocation")
    : [
        appointment.professional?.clinicAddress || appointment.integrativeTherapist?.clinicAddress,
        appointment.professional?.clinicCity || appointment.integrativeTherapist?.clinicCity,
      ].filter(Boolean).join(", ") ||
      t("cal.inPersonLocation");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://doctor8.app";
  const typeLine = isTele ? t("cal.teleconsultDescription") : t("cal.inPersonDescription");
  const ics = buildAppointmentIcs({
    appointmentId: appointment.id,
    summary: t("cal.summary", { doctor: doctorName }),
    description: `${specialty}\n${typeLine}\n\nDoctor8: ${appUrl}/patient/appointments`,
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
