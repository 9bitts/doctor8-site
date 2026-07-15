"use client";

import Link from "next/link";
import { Calendar, ChevronRight, Video, ClipboardList } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";
import { useUserTimeZone } from "@/hooks/useUserTimeZone";
import { formatShortDateWithWeekday, formatAppointmentTimeWithLabel } from "@/lib/timezone";
import ConfirmAttendanceButton from "@/components/patient/ConfirmAttendanceButton";

export type UpcomingConsultProps = {
  appointmentId: string;
  scheduledAt: string;
  type: string;
  providerName: string;
  hasPreConsult: boolean;
  patientConfirmedAt?: string | null;
};

export default function PatientUpcomingConsultBanner({
  appointment,
}: {
  appointment: UpcomingConsultProps;
}) {
  const { t, lang } = useI18n();
  const locale = localeOf(lang);
  const userTz = useUserTimeZone();
  const when = new Date(appointment.scheduledAt);
  const msUntil = when.getTime() - Date.now();
  const hoursUntil = Math.max(0, Math.round(msUntil / (60 * 60 * 1000)));
  const within48h = msUntil > 0 && msUntil <= 48 * 60 * 60 * 1000;
  const needsPresence = within48h && !appointment.patientConfirmedAt;

  const timeLabel = formatAppointmentTimeWithLabel(when, userTz, locale);
  const dateLabel = formatShortDateWithWeekday(when, userTz, locale);

  const title =
    hoursUntil <= 24
      ? t("pdash.upcoming.soon").replace("{{provider}}", appointment.providerName)
      : t("pdash.upcoming.title");

  const subtitle = t("pdash.upcoming.when")
    .replace("{{date}}", dateLabel)
    .replace("{{time}}", timeLabel);

  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
          {appointment.type === "TELECONSULT" ? (
            <Video size={20} className="text-violet-600" />
          ) : (
            <Calendar size={20} className="text-violet-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-violet-900">{title}</p>
          <p className="text-xs text-violet-800 mt-1">{subtitle}</p>
          {!appointment.hasPreConsult && (
            <p className="text-xs text-violet-700 mt-2 flex items-center gap-1">
              <ClipboardList size={12} />
              {t("appt.preConsultHint")}
            </p>
          )}
          {needsPresence && (
            <p className="text-xs text-violet-800 mt-2 font-medium">{t("pdash.presence.prompt")}</p>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <ConfirmAttendanceButton
              appointmentId={appointment.appointmentId}
              confirmed={!!appointment.patientConfirmedAt}
              within48h={within48h}
            />
            <Link
              href={`/patient/appointments?id=${appointment.appointmentId}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 hover:text-violet-900"
            >
              {t("pdash.upcoming.details")} <ChevronRight size={14} />
            </Link>
            {appointment.type === "TELECONSULT" && msUntil <= 15 * 60 * 1000 && msUntil >= -60 * 60 * 1000 && (
              <Link
                href={`/video/${appointment.appointmentId}`}
                className="inline-flex items-center gap-1 text-xs font-bold text-white bg-violet-600 px-3 py-1.5 rounded-lg hover:bg-violet-500 transition"
              >
                <Video size={12} /> {t("pdash.join")}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
