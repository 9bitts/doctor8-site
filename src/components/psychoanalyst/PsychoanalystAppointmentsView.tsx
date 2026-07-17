"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, Video, MapPin, ChevronRight, UserPlus, Search } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";
import {
  formatShortDateWithYear,
  formatAppointmentTimeWithLabel,
} from "@/lib/timezone";
import { initials } from "@/lib/psychoanalyst-initials";
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
  analysandId: string | null;
};

type Tab = "upcoming" | "history";
type StatusFilter = "ALL" | "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

const STATUS_FILTERS: StatusFilter[] = ["ALL", "PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"];

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
  const [tab, setTab] = useState<Tab>("upcoming");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");

  const now = useMemo(() => new Date(), []);

  const statusColors: Record<string, string> = {
    CONFIRMED: "bg-violet-100 text-violet-700",
    PENDING: "bg-amber-100 text-amber-700",
    COMPLETED: "bg-emerald-100 text-emerald-700",
    CANCELLED: "bg-rose-100 text-rose-700",
  };

  const tabCounts = useMemo(() => {
    let upcoming = 0;
    let history = 0;
    for (const apt of appointments) {
      const scheduled = new Date(apt.scheduledAt);
      if (apt.status !== "CANCELLED" && scheduled >= now) upcoming++;
      else history++;
    }
    return { upcoming, history };
  }, [appointments, now]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = appointments.filter((apt) => {
      const scheduled = new Date(apt.scheduledAt);
      const isUpcoming = apt.status !== "CANCELLED" && scheduled >= now;
      return tab === "upcoming" ? isUpcoming : !isUpcoming;
    });

    if (statusFilter !== "ALL") {
      rows = rows.filter((apt) => apt.status === statusFilter);
    }

    if (q) {
      rows = rows.filter((apt) => {
        const name = `${apt.patientFirstName} ${apt.patientLastName}`.toLowerCase();
        return name.includes(q);
      });
    }

    rows.sort((a, b) => {
      const da = new Date(a.scheduledAt).getTime();
      const db = new Date(b.scheduledAt).getTime();
      return tab === "upcoming" ? da - db : db - da;
    });

    return rows;
  }, [appointments, tab, statusFilter, search, now]);

  function createAnalysandHref(apt: PsychoanalystAppointmentRow): string {
    const params = new URLSearchParams({
      prefillFirst: apt.patientFirstName,
      prefillLast: apt.patientLastName,
      prefillUserId: apt.patientUserId,
    });
    return `/psychoanalyst/analysands?${params.toString()}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab("upcoming")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            tab === "upcoming"
              ? "bg-violet-600 text-white"
              : "bg-white border border-slate-200 text-slate-600 hover:border-violet-300"
          }`}
        >
          {t("pa.appt.tabUpcoming")} ({tabCounts.upcoming})
        </button>
        <button
          type="button"
          onClick={() => setTab("history")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            tab === "history"
              ? "bg-violet-600 text-white"
              : "bg-white border border-slate-200 text-slate-600 hover:border-violet-300"
          }`}
        >
          {t("pa.appt.tabHistory")} ({tabCounts.history})
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("pa.appt.searchPlaceholder")}
            className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/40 bg-white"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>
              {s === "ALL" ? t("pa.appt.filterAll") : t(`status.${s}`)}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="text-center py-16">
            <Calendar className="mx-auto text-slate-300 mb-3" size={40} />
            <p className="text-slate-400 text-sm">{t("proappt.empty")}</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-3 sm:p-4 space-y-3 bg-slate-50/60">
            {filtered.map((apt) => {
              const firstName = apt.patientFirstName;
              const lastName = apt.patientLastName;
              return (
                <div
                  key={apt.id}
                  className="flex flex-wrap items-center gap-3 sm:gap-4 px-4 py-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm"
                >
                  <div className="w-11 h-11 rounded-xl bg-violet-100 flex items-center justify-center font-bold text-violet-600 text-sm shrink-0">
                    {initials(firstName, lastName)}
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
                    {apt.analysandId ? (
                      <Link
                        href={`/psychoanalyst/analysands/${apt.analysandId}`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-600 mt-2 hover:text-violet-800"
                      >
                        {t("pa.appt.viewAnalysand")} <ChevronRight size={12} />
                      </Link>
                    ) : (
                      <Link
                        href={createAnalysandHref(apt)}
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
      )}
    </div>
  );
}
