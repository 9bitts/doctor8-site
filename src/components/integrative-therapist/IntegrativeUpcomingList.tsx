"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";
import { formatShortDate, formatAppointmentTimeWithLabel } from "@/lib/timezone";
import IntegrativeAppointmentStatusActions from "@/components/integrative-therapist/IntegrativeAppointmentStatusActions";

export type IntegrativeUpcomingRow = {
  id: string;
  scheduledAt: string;
  status: string;
  type: string;
  patientName: string;
  visitLabel: string;
  practiceLabel: string | null;
  durationMins: number;
};

export default function IntegrativeUpcomingList({
  appointments: initial,
  timeZone,
}: {
  appointments: IntegrativeUpcomingRow[];
  timeZone: string;
}) {
  const { t, lang } = useI18n();
  const locale = localeOf(lang);
  const [rows, setRows] = useState(initial);

  if (rows.length === 0) {
    return (
      <div className="text-center py-10 px-5 space-y-3">
        <p className="text-slate-400 text-sm">{t("proappt.empty")}</p>
        <p className="text-slate-500 text-xs max-w-md mx-auto leading-relaxed">
          {t("it.dash.consultMode.emptyHint")}
        </p>
        <Link
          href="/integrative-therapist/clients"
          className="inline-flex text-xs font-bold text-teal-600 hover:text-teal-800"
        >
          {t("it.dash.consultMode.ctaClients")} →
        </Link>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {rows.map((apt) => {
        const isUpcoming = new Date(apt.scheduledAt).getTime() >= Date.now();
        return (
          <div
            key={apt.id}
            className="px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="font-medium text-slate-800 text-sm truncate">{apt.patientName}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {formatShortDate(new Date(apt.scheduledAt), timeZone, locale)}{" "}
                {formatAppointmentTimeWithLabel(new Date(apt.scheduledAt), timeZone, locale)}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">
                  {apt.visitLabel}
                </span>
                {apt.practiceLabel && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {apt.practiceLabel}
                  </span>
                )}
                <span className="text-[10px] text-slate-400">{apt.durationMins} min</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <IntegrativeAppointmentStatusActions
                appointmentId={apt.id}
                status={apt.status}
                scheduledAt={apt.scheduledAt}
                compact
                onStatusChange={(id, status) => {
                  setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
                }}
              />
              {apt.status === "CONFIRMED" && isUpcoming && (
                apt.type === "TELECONSULT" ? (
                  <a
                    href={`/video/${apt.id}`}
                    className="w-full sm:w-auto text-center text-xs font-bold bg-teal-500 text-white px-3 py-2.5 rounded-xl hover:bg-teal-600 min-h-[44px] inline-flex items-center justify-center"
                  >
                    {t("proappt.join")}
                  </a>
                ) : (
                  <a
                    href={`/integrative-therapist/consult/${apt.id}`}
                    className="w-full sm:w-auto text-center text-xs font-bold bg-slate-800 text-white px-3 py-2.5 rounded-xl hover:bg-slate-700 min-h-[44px] inline-flex items-center justify-center"
                  >
                    {t("it.consult.start")}
                  </a>
                )
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
