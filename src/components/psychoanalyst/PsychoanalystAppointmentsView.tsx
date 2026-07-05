"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, Video, MapPin, ChevronRight, UserPlus } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";
import {
  formatShortDateWithYear,
  formatAppointmentTimeWithLabel,
} from "@/lib/timezone";
import { ProCancelAppointmentButton } from "@/components/professional/ProfessionalCancelAppointmentModal";

export type PsychoanalystAppointmentRow = {
  id: string;
  scheduledAt: string;
  status: string;
  type: string;
  patientFirstName: string;
  patientLastName: string;
  patientUserId: string;
  patientPhone: string | null;
  patientConfirmedAt: string | null;
  intakeHealthPlanLabel: string | null;
  intakeServiceName: string | null;
  intakeVisitReason: string | null;
  analysandId: string | null;
};

export default function PsychoanalystAppointmentsView({
  initialAppointments,
  timeZone,
}: {
  initialAppointments: PsychoanalystAppointmentRow[];
  timeZone: string;
}) {
  const { t, lang } = useI18n();
  const locale = localeOf(lang);
  const [appointments, setAppointments] = useState(initialAppointments);

  const statusColors: Record<string, string> = {
    CONFIRMED: "bg-violet-100 text-violet-700",
    PENDING: "bg-amber-100 text-amber-700",
    COMPLETED: "bg-violet-100 text-violet-700",
    CANCELLED: "bg-rose-100 text-rose-700",
  };

  if (appointments.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="text-center py-16">
          <Calendar className="mx-auto text-slate-300 mb-3" size={40} />
          <p className="text-slate-400 text-sm">{t("proappt.empty")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="divide-y divide-slate-100">
        {appointments.map((apt) => {
          const firstName = apt.patientFirstName;
          const lastName = apt.patientLastName;
          return (
            <div
              key={apt.id}
              className="flex flex-wrap items-center gap-3 sm:gap-4 px-5 py-4 hover:bg-slate-50 transition"
            >
              <div className="w-11 h-11 rounded-xl bg-violet-100 flex items-center justify-center font-bold text-violet-600 text-sm shrink-0">
                {firstName[0]}
                {lastName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm truncate">
                  {firstName} {lastName}
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  {apt.type === "TELECONSULT" ? (
                    <>
                      <Video size={12} /> {t("proappt.teleconsult")}
                    </>
                  ) : (
                    <>
                      <MapPin size={12} /> {t("proappt.inPerson")}
                    </>
                  )}
                </p>
                {apt.intakeHealthPlanLabel && (
                  <p className="text-[11px] text-violet-600 mt-1">{apt.intakeHealthPlanLabel}</p>
                )}
                {apt.intakeServiceName && (
                  <p className="text-[11px] text-slate-600 mt-1">{apt.intakeServiceName}</p>
                )}
                {apt.intakeVisitReason && (
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                    {apt.intakeVisitReason}
                  </p>
                )}
                {apt.analysandId ? (
                  <Link
                    href={`/psychoanalyst/analysands/${apt.analysandId}`}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-600 mt-2 hover:text-violet-800"
                  >
                    {t("pa.appt.viewAnalysand")} <ChevronRight size={12} />
                  </Link>
                ) : (
                  <Link
                    href="/psychoanalyst/analysands"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 mt-2 hover:text-amber-900"
                  >
                    <UserPlus size={12} /> {t("pa.appt.createAnalysand")}
                  </Link>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-semibold text-slate-700">
                  {formatShortDateWithYear(new Date(apt.scheduledAt), timeZone, locale)}
                </p>
                <p className="text-xs text-slate-500">
                  {formatAppointmentTimeWithLabel(new Date(apt.scheduledAt), timeZone, locale)}
                </p>
              </div>
              <span
                className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-lg ${
                  statusColors[apt.status] || "bg-slate-100 text-slate-600"
                }`}
              >
                {t(`status.${apt.status}`)}
              </span>
              {apt.patientConfirmedAt && (
                <span className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
                  {t("proappt.patientConfirmed")}
                </span>
              )}
              {apt.type === "TELECONSULT" && apt.status === "CONFIRMED" && (
                <a
                  href={`/video/${apt.id}`}
                  className="shrink-0 bg-violet-500 text-white rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-1 hover:bg-violet-600 transition"
                >
                  <Video size={12} /> {t("proappt.join")}
                </a>
              )}
              <ProCancelAppointmentButton
                appointment={{
                  id: apt.id,
                  scheduledAt: apt.scheduledAt,
                  status: apt.status,
                  patientFirstName: apt.patientFirstName,
                  patientLastName: apt.patientLastName,
                  patientUserId: apt.patientUserId,
                  patientPhone: apt.patientPhone,
                }}
                portalBase="/psychoanalyst"
                timeZone={timeZone}
                onCancelled={(id) => {
                  setAppointments((prev) =>
                    prev.map((row) => (row.id === id ? { ...row, status: "CANCELLED" } : row)),
                  );
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
