"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";
import { formatAppointmentTimeWithLabel, formatShortDateWithYear, formatShortTime } from "@/lib/timezone";
import { Calendar, ChevronLeft, ChevronRight, List, MapPin, Video } from "lucide-react";
import { ProCancelAppointmentButton } from "@/components/professional/ProfessionalCancelAppointmentModal";
import IntegrativeAppointmentStatusActions from "@/components/integrative-therapist/IntegrativeAppointmentStatusActions";

export type IntegrativeAppointmentRow = {
  id: string;
  scheduledAt: string;
  status: string;
  type: string;
  patientName: string;
  patientFirstName: string;
  patientLastName: string;
  patientUserId: string | null;
  patientPhone: string | null;
  visitType: "first" | "return";
  mainPractice: string | null;
  mainPracticeLabel: string | null;
  suggestedDurationMins: number;
};

type PracticeOption = { slug: string; label: string };

type ViewMode = "list" | "week";

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, n: number): Date {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function IntegrativeAppointmentsView({
  appointments: initialAppointments,
  practiceOptions,
  timeZone,
}: {
  appointments: IntegrativeAppointmentRow[];
  practiceOptions: PracticeOption[];
  timeZone: string;
}) {
  const { t, lang } = useI18n();
  const locale = localeOf(lang);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [practiceFilter, setPracticeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [appointments, setAppointments] = useState(initialAppointments);

  const statusColors: Record<string, string> = {
    CONFIRMED: "bg-teal-100 text-teal-700",
    PENDING: "bg-amber-100 text-amber-700",
    COMPLETED: "bg-teal-100 text-teal-700",
    CANCELLED: "bg-rose-100 text-rose-700",
  };

  const filtered = useMemo(() => {
    let rows = appointments;
    if (practiceFilter) {
      rows = rows.filter((a) => a.mainPractice === practiceFilter);
    }
    if (statusFilter) {
      rows = rows.filter((a) => a.status === statusFilter);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      rows = rows.filter((a) => a.patientName.toLowerCase().includes(q));
    }
    return rows;
  }, [appointments, practiceFilter, statusFilter, searchQuery]);

  const weekEnd = addDays(weekStart, 7);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const weekAppointments = useMemo(() => {
    return filtered.filter((a) => {
      const d = new Date(a.scheduledAt);
      return d >= weekStart && d < weekEnd;
    });
  }, [filtered, weekStart, weekEnd]);

  const isCurrentWeek = sameDay(weekStart, startOfWeek(new Date()));

  function renderBadges(apt: IntegrativeAppointmentRow) {
    const visitLabel =
      apt.visitType === "first" ? t("it.consult.firstVisit") : t("it.consult.returnVisit");
    return (
      <div className="flex flex-wrap items-center gap-2 mt-1.5">
        {apt.type === "TELECONSULT" ? (
          <Video size={12} className="text-teal-500" />
        ) : (
          <MapPin size={12} className="text-teal-500" />
        )}
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">
          {visitLabel}
        </span>
        {apt.mainPracticeLabel && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {apt.mainPracticeLabel}
          </span>
        )}
        <span className="text-[10px] text-slate-400">{apt.suggestedDurationMins} min</span>
      </div>
    );
  }

  function renderActions(apt: IntegrativeAppointmentRow) {
    const isUpcoming = new Date(apt.scheduledAt).getTime() >= Date.now();
    return (
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <IntegrativeAppointmentStatusActions
          appointmentId={apt.id}
          status={apt.status}
          scheduledAt={apt.scheduledAt}
          onStatusChange={(id, status) => {
            setAppointments((prev) =>
              prev.map((row) => (row.id === id ? { ...row, status } : row)),
            );
          }}
        />
        {apt.status === "CONFIRMED" && isUpcoming && (
          <a
            href={
              apt.type === "TELECONSULT"
                ? `/video/${apt.id}`
                : `/integrative-therapist/consult/${apt.id}`
            }
            className={`text-xs font-bold text-white px-3 py-2 rounded-xl ${
              apt.type === "TELECONSULT"
                ? "bg-teal-500 hover:bg-teal-600"
                : "bg-slate-800 hover:bg-slate-700"
            }`}
          >
            {apt.type === "TELECONSULT" ? t("proappt.join") : t("it.consult.start")}
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
          portalBase="/integrative-therapist"
          timeZone={timeZone}
          onCancelled={(id) => {
            setAppointments((prev) =>
              prev.map((row) => (row.id === id ? { ...row, status: "CANCELLED" } : row)),
            );
          }}
        />
      </div>
    );
  }

  function renderRow(apt: IntegrativeAppointmentRow) {
    return (
      <div
        key={apt.id}
        className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3"
      >
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 text-sm">{apt.patientName}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {formatShortDateWithYear(new Date(apt.scheduledAt), timeZone, locale)}{" "}
            {formatAppointmentTimeWithLabel(new Date(apt.scheduledAt), timeZone, locale)}
          </p>
          {renderBadges(apt)}
        </div>
        <span
          className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${statusColors[apt.status] || "bg-slate-100 text-slate-600"}`}
        >
          {t(`status.${apt.status}`)}
        </span>
        {renderActions(apt)}
      </div>
    );
  }

  const weekLabel = `${formatShortDateWithYear(weekStart, timeZone, locale)} – ${formatShortDateWithYear(addDays(weekStart, 6), timeZone, locale)}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("it.appt.searchPatient")}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white min-w-[10rem] sm:flex-1"
        />
        <select
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white min-w-[10rem]"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">{t("it.appt.filterAllStatuses")}</option>
          <option value="PENDING">{t("status.PENDING")}</option>
          <option value="CONFIRMED">{t("status.CONFIRMED")}</option>
          <option value="COMPLETED">{t("status.COMPLETED")}</option>
          <option value="CANCELLED">{t("status.CANCELLED")}</option>
        </select>
        <select
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white min-w-[10rem]"
          value={practiceFilter}
          onChange={(e) => setPracticeFilter(e.target.value)}
        >
          <option value="">{t("it.appt.filterAllPractices")}</option>
          {practiceOptions.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.label}
            </option>
          ))}
        </select>

        <div className="flex rounded-xl border border-slate-200 overflow-hidden text-sm">
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 px-3 py-2 font-medium transition-colors ${
              viewMode === "list"
                ? "bg-teal-600 text-white"
                : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <List size={15} />
            {t("it.appt.viewList")}
          </button>
          <button
            type="button"
            onClick={() => setViewMode("week")}
            className={`flex items-center gap-1.5 px-3 py-2 font-medium transition-colors ${
              viewMode === "week"
                ? "bg-teal-600 text-white"
                : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Calendar size={15} />
            {t("it.appt.viewWeek")}
          </button>
        </div>

        {viewMode === "week" && (
          <div className="flex items-center gap-1 sm:ml-auto">
            <button
              type="button"
              onClick={() => setWeekStart((w) => addDays(w, -7))}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
              aria-label={t("it.appt.prevWeek")}
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-xs font-medium text-slate-700 min-w-[9rem] text-center">
              {weekLabel}
            </span>
            <button
              type="button"
              onClick={() => setWeekStart((w) => addDays(w, 7))}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
              aria-label={t("it.appt.nextWeek")}
            >
              <ChevronRight size={18} />
            </button>
            {!isCurrentWeek && (
              <button
                type="button"
                onClick={() => setWeekStart(startOfWeek(new Date()))}
                className="text-xs font-medium text-teal-700 hover:text-teal-800 px-2"
              >
                {t("it.appt.thisWeek")}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="mx-auto text-slate-300 mb-3" size={40} />
            <p className="text-slate-400 text-sm">
              {practiceFilter || statusFilter || searchQuery
                ? t("it.appt.noFilterMatch")
                : t("proappt.empty")}
            </p>
          </div>
        ) : viewMode === "list" ? (
          <div className="divide-y divide-slate-100">{filtered.map(renderRow)}</div>
        ) : (
          <div className="overflow-x-auto">
            <div className="grid grid-cols-7 min-w-[42rem] divide-x divide-slate-100">
              {weekDays.map((day) => {
                const dayApts = weekAppointments
                  .filter((a) => sameDay(new Date(a.scheduledAt), day))
                  .sort(
                    (a, b) =>
                      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
                  );
                const isToday = sameDay(day, new Date());
                return (
                  <div key={day.toISOString()} className="min-h-[12rem]">
                    <div
                      className={`px-2 py-2 text-center border-b border-slate-100 ${
                        isToday ? "bg-teal-50" : "bg-slate-50"
                      }`}
                    >
                      <p className="text-[10px] font-semibold text-slate-500 uppercase">
                        {day.toLocaleDateString(locale, { weekday: "short" })}
                      </p>
                      <p
                        className={`text-sm font-bold ${isToday ? "text-teal-700" : "text-slate-800"}`}
                      >
                        {day.getDate()}
                      </p>
                    </div>
                    <div className="p-1.5 space-y-1.5">
                      {dayApts.length === 0 ? (
                        <p className="text-[10px] text-slate-300 text-center py-4">?</p>
                      ) : (
                        dayApts.map((apt) => (
                          <div
                            key={apt.id}
                            className="rounded-lg border border-slate-100 bg-white p-2 shadow-sm"
                          >
                            <p className="text-[10px] font-bold text-slate-800 truncate">
                              {apt.patientName}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {formatShortTime(new Date(apt.scheduledAt), timeZone, locale)}
                            </p>
                            {apt.mainPracticeLabel && (
                              <p className="text-[9px] text-teal-700 truncate mt-0.5">
                                {apt.mainPracticeLabel}
                              </p>
                            )}
                            {apt.status === "CONFIRMED" && (
                              <a
                                href={
                                  apt.type === "TELECONSULT"
                                    ? `/video/${apt.id}`
                                    : `/integrative-therapist/consult/${apt.id}`
                                }
                                className="mt-1 block text-center text-[9px] font-bold text-teal-700 hover:text-teal-800"
                              >
                                {apt.type === "TELECONSULT"
                                  ? t("proappt.join")
                                  : t("it.consult.start")}
                              </a>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
