import { NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { buildCalendarIcs } from "@/lib/calendar";
import { decrypt } from "@/lib/encryption";
import { getUserLang } from "@/lib/i18n/server-lang";
import { translate } from "@/lib/i18n/translations";
import { interpolate } from "@/lib/notification-i18n";
import { resolveProfessionalPortalBaseForUser } from "@/lib/psychologist-portal";

function safeDecrypt(v: string | null): string {
  if (!v) return "";
  try {
    return decrypt(v);
  } catch {
    return v;
  }
}

export async function GET() {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const lang = await getUserLang(ctx.userId);
  const t = (key: string, vars?: Record<string, string>) =>
    vars ? interpolate(translate(lang, key), vars) : translate(lang, key);

  const portalBase = await resolveProfessionalPortalBaseForUser(ctx.userId);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://doctor8.app";

  const now = new Date();
  const horizon = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

  const appointments = await db.appointment.findMany({
    where: {
      professionalId: ctx.professional.id,
      status: { in: ["CONFIRMED", "PENDING"] },
      scheduledAt: { gte: now, lte: horizon },
    },
    include: {
      patient: { select: { firstName: true, lastName: true } },
    },
    orderBy: { scheduledAt: "asc" },
  });

  const events = appointments.map((apt) => {
    const patientName = `${safeDecrypt(apt.patient.firstName)} ${safeDecrypt(apt.patient.lastName)}`.trim();
    const isTele = apt.type === "TELECONSULT";
    const start = new Date(apt.scheduledAt);
    const end = new Date(start.getTime() + (apt.durationMins || 30) * 60_000);
    const typeLine = isTele ? t("cal.teleconsultDescription") : t("cal.inPersonDescription");
    const location = isTele ? t("cal.teleconsultLocation") : t("cal.inPersonLocation");

    return {
      appointmentId: apt.id,
      summary: t("cal.proSummary", { patient: patientName }),
      description: `${typeLine}\n\nDoctor8: ${appUrl}${portalBase}/appointments`,
      location,
      url: apt.meetingUrl ?? `${appUrl}/video/${apt.id}`,
      start,
      end,
    };
  });

  const ics = buildCalendarIcs(events);

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="doctor8-agenda.ics"',
    },
  });
}
