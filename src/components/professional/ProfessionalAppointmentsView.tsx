"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  FileText,
  FlaskConical,
  List,
  MapPin,
  Pill,
  ScrollText,
  Video,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";
import {
  addCalendarDays,
  calendarDateInTimeZone,
  dayOfWeekForDateStr,
  formatAppointmentTimeWithLabel,
  formatShortDateWithYear,
  formatShortTime,
  zonedTimeToUtc,
} from "@/lib/timezone";
import { chartActionUrl } from "@/lib/video-chart-nav";
import AiSummarizeButton from "@/components/AiSummarizeButton";
import {
  isAppointmentInVolunteerBlock,
  type VolunteerWeeklyBlock,
} from "@/lib/availability-exceptions";

export type ProfessionalAppointmentRow = {
  id: string;
  scheduledAt: string;
  durationMins: number;
  type: string;
  status: string;
  chiefComplaint: string | null;
  notes: string | null;
  patientConfirmedAt: string | null;
  patientFirstName: string;
  patientLastName: string;
  chartId: string | null;
  summarizeDocumentId: string | null;
  intakeHealthPlanLabel: string | null;
  intakeServiceName: string | null;
  intakeVisitReason: string | null;
};

type ViewMode = "list" | "week";

function startOfWeekDateStr(ref: Date, timeZone: string): string {
  const todayStr = calendarDateInTimeZone(ref, timeZone);
  const dow = dayOfWeekForDateStr(todayStr, timeZone);
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  return addCalendarDays(todayStr, mondayOffset);
}

function useIsMobileDayView(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return mobile;
}

export default function ProfessionalAppointmentsView({
  initialAppointments,
  timeZone,
  portalBase,
  isPsychologistPortal,
  volunteerBlocks = [],
}: {
  initialAppointments: ProfessionalAppointmentRow[];
  timeZone: string;
  portalBase: string;
  isPsychologistPortal: boolean;
  volunteerBlocks?: VolunteerWeeklyBlock[];
}) {
  const { t, lang } = useI18n();
  const locale = localeOf(lang);
  const isMobileDay = useIsMobileDayView();

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [appointments, setAppointments] = useState(initialAppointments);
  const [weekStartStr, setWeekStartStr] = useState(() => startOfWeekDateStr(new Date(), timeZone));
  const [mobileDayStr, setMobileDayStr] = useState(() => calendarDateInTimeZone(new Date(), timeZone));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [weekLoading, setWeekLoading] = useState(false);
  const metaByIdRef = useRef(
    new Map(
      initialAppointments.map((a) => [
        a.id,
        {
          chartId: a.chartId,
          summarizeDocumentId: a.summarizeDocumentId,
          intakeHealthPlanLabel: a.intakeHealthPlanLabel,
          intakeServiceName: a.intakeServiceName,
          intakeVisitReason: a.intakeVisitReason,
        },
      ]),
    ),
  );

  const isVoluntaryAppointment = useCallback(
    (apt: ProfessionalAppointmentRow) =>
      isAppointmentInVolunteerBlock(new Date(apt.scheduledAt), timeZone, volunteerBlocks),
    [timeZone, volunteerBlocks],
  );

  const statusColors: Record<string, string> = {
    CONFIRMED: "bg-brand-100 text-brand-600",
    PENDING: "bg-amber-100 text-amber-700",
    COMPLETED: "bg-brand-100 text-brand-600",
    CANCELLED: "bg-rose-100 text-rose-700",
  };

  const now = Date.now();
  const upcoming = useMemo(
    () =>
      appointments.filter(
        (a) =>
          a.status === "CONFIRMED" &&
          new Date(a.scheduledAt).getTime() >= now - 60 * 60 * 1000,
      ),
    [appointments, now],
  );
  const upcomingIds = useMemo(() => new Set(upcoming.map((a) => a.id)), [upcoming]);
  const rest = useMemo(
    () => appointments.filter((a) => !upcomingIds.has(a.id)),
    [appointments, upcomingIds],
  );

  const weekEndStr = addCalendarDays(weekStartStr, 7);
  const weekDayStrs = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addCalendarDays(weekStartStr, i)),
    [weekStartStr],
  );

  const fetchWeekRange = useCallback(async () => {
    setWeekLoading(true);
    try {
      const from = zonedTimeToUtc(weekStartStr, "00:00", timeZone).toISOString();
      const to = zonedTimeToUtc(weekEndStr, "00:00", timeZone).toISOString();
      const res = await fetch(
        `/api/appointments?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      );
      if (!res.ok) return;
      const data = await res.json();
      const mapped: ProfessionalAppointmentRow[] = (data.appointments || []).map(
        (a: {
          id: string;
          scheduledAt: string;
          durationMins: number;
          type: string;
          status: string;
          chiefComplaint: string | null;
          notes: string | null;
          patientConfirmedAt: string | null;
          patient: { firstName: string; lastName: string };
        }) => {
          const meta = metaByIdRef.current.get(a.id);
          return {
            id: a.id,
            scheduledAt: a.scheduledAt,
            durationMins: a.durationMins,
            type: a.type,
            status: a.status,
            chiefComplaint: a.chiefComplaint,
            notes: a.notes,
            patientConfirmedAt: a.patientConfirmedAt,
            patientFirstName: a.patient?.firstName ?? "",
            patientLastName: a.patient?.lastName ?? "",
            chartId: meta?.chartId ?? null,
            summarizeDocumentId: meta?.summarizeDocumentId ?? null,
            intakeHealthPlanLabel: meta?.intakeHealthPlanLabel ?? null,
            intakeServiceName: meta?.intakeServiceName ?? null,
            intakeVisitReason: meta?.intakeVisitReason ?? null,
          };
        },
      );
      setAppointments((prev) => {
        const byId = new Map(prev.map((p) => [p.id, p]));
        for (const row of mapped) byId.set(row.id, row);
        return Array.from(byId.values()).sort(
          (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
        );
      });
    } finally {
      setWeekLoading(false);
    }
  }, [weekStartStr, weekEndStr, timeZone]);

  useEffect(() => {
    if (viewMode === "week") void fetchWeekRange();
  }, [viewMode, weekStartStr, fetchWeekRange]);

  const weekAppointments = useMemo(() => {
    return appointments.filter((a) => {
      const d = calendarDateInTimeZone(new Date(a.scheduledAt), timeZone);
      return d >= weekStartStr && d < weekEndStr;
    });
  }, [appointments, weekStartStr, weekEndStr, timeZone]);

  const todayStr = calendarDateInTimeZone(new Date(), timeZone);
  const isCurrentWeek = weekStartStr === startOfWeekDateStr(new Date(), timeZone);

  const displayDayStrs = isMobileDay && viewMode === "week" ? [mobileDayStr] : weekDayStrs;

  function renderRow(apt: ProfessionalAppointmentRow, highlightIntake = false) {
    const firstName = apt.patientFirstName;
    const lastName = apt.patientLastName;
    const chartId = apt.chartId;

    return (
      <div
        key={apt.id}
        id={`appt-${apt.id}`}
        className={`flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition scroll-mt-24 ${
          highlightIntake && apt.intakeVisitReason ? "bg-amber-50/40" : ""
        } ${!apt.notes && apt.status === "COMPLETED" ? "ring-1 ring-inset ring-violet-100" : ""}`}
      >
        <div className="w-11 h-11 rounded-xl bg-brand-100 flex items-center justify-center font-bold text-brand-500 text-sm shrink-0">
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
            <p className="text-[11px] text-brand-600 mt-1">{apt.intakeHealthPlanLabel}</p>
          )}
          {apt.intakeServiceName && (
            <p className="text-[11px] text-slate-600 mt-1">{apt.intakeServiceName}</p>
          )}
          {apt.intakeVisitReason && (
            <div
              className={`mt-2 rounded-lg p-2 ${
                highlightIntake ? "bg-white border border-amber-200" : ""
              }`}
            >
              <p className="text-[10px] font-semibold text-slate-500 uppercase flex items-center gap-1">
                <ClipboardList size={10} /> {t("proappt.intakeLabel")}
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-3">
                {apt.intakeVisitReason}
              </p>
            </div>
          )}
          {chartId && (
            <div className="mt-2 flex flex-wrap gap-2 items-center">
              <Link
                href={`${portalBase}/patients/${chartId}`}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:underline"
              >
                <FileText size={11} /> {t("proappt.viewChart")}
              </Link>
              {apt.summarizeDocumentId && (
                <AiSummarizeButton
                  documentId={apt.summarizeDocumentId}
                  variant="compact"
                  labelKey="proappt.patientSummary"
                />
              )}
              {!isPsychologistPortal && (
                <>
                  <Link
                    href={chartActionUrl("/professional/prescriptions", chartId, {
                      view: "prescription",
                      returnUrl: `${portalBase}/appointments`,
                    })}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded-lg hover:bg-brand-100 transition"
                  >
                    <Pill size={11} /> {t("chartAct.prescribe")}
                  </Link>
                  <Link
                    href={chartActionUrl("/professional/prescriptions", chartId, {
                      view: "exam",
                      returnUrl: `${portalBase}/appointments`,
                    })}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded-lg hover:bg-brand-100 transition"
                  >
                    <FlaskConical size={11} /> {t("chartAct.exam")}
                  </Link>
                  <Link
                    href={chartActionUrl("/professional/prescriptions", chartId, {
                      view: "document",
                      returnUrl: `${portalBase}/appointments`,
                    })}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded-lg hover:bg-brand-100 transition"
                  >
                    <ScrollText size={11} /> {t("chartAct.document")}
                  </Link>
                </>
              )}
            </div>
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
        {isVoluntaryAppointment(apt) && (
          <span className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-lg bg-green-50 text-green-800 border border-green-200">
            {t("proappt.voluntaryBadge")}
          </span>
        )}
        {apt.type === "TELECONSULT" && apt.status === "CONFIRMED" && (
          <a
            href={`/video/${apt.id}`}
            className="shrink-0 bg-brand-500 text-white rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-1 hover:bg-brand-400 transition"
          >
            <Video size={12} /> {t("proappt.join")}
          </a>
        )}
      </div>
    );
  }

  function renderWeekCard(apt: ProfessionalAppointmentRow) {
    const isSelected = selectedId === apt.id;
    return (
      <button
        key={apt.id}
        type="button"
        onClick={() => setSelectedId(isSelected ? null : apt.id)}
        className={`w-full text-left rounded-lg border p-2 shadow-sm transition ${
          isSelected ? "border-brand-300 bg-brand-50" : "border-slate-100 bg-white hover:border-brand-200"
        }`}
      >
        <p className="text-[10px] font-bold text-slate-800 truncate">
          {apt.patientFirstName} {apt.patientLastName}
        </p>
        <p className="text-[10px] text-slate-500">
          {formatShortTime(new Date(apt.scheduledAt), timeZone, locale)}
        </p>
        <span
          className={`inline-block mt-1 text-[9px] font-medium px-1.5 py-0.5 rounded ${
            statusColors[apt.status] || "bg-slate-100 text-slate-600"
          }`}
        >
          {t(`status.${apt.status}`)}
        </span>
        {isVoluntaryAppointment(apt) && (
          <span className="inline-block mt-1 ml-1 text-[9px] font-medium px-1.5 py-0.5 rounded bg-green-50 text-green-800 border border-green-200">
            {t("proappt.voluntaryBadge")}
          </span>
        )}
      </button>
    );
  }

  const weekStartLabel = formatShortDateWithYear(
    zonedTimeToUtc(weekStartStr, "12:00", timeZone),
    timeZone,
    locale,
  );
  const weekEndLabel = formatShortDateWithYear(
    zonedTimeToUtc(addCalendarDays(weekStartStr, 6), "12:00", timeZone),
    timeZone,
    locale,
  );
  const weekLabel = `${weekStartLabel} - ${weekEndLabel}`;

  const selectedApt = selectedId ? appointments.find((a) => a.id === selectedId) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
        <div className="flex rounded-xl border border-slate-200 overflow-hidden text-sm">
          <button
            type="button"
            onClick={() => {
              setViewMode("list");
              setSelectedId(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 font-medium transition-colors ${
              viewMode === "list"
                ? "bg-brand-500 text-white"
                : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <List size={15} />
            {t("proappt.viewList")}
          </button>
          <button
            type="button"
            onClick={() => setViewMode("week")}
            className={`flex items-center gap-1.5 px-3 py-2 font-medium transition-colors ${
              viewMode === "week"
                ? "bg-brand-500 text-white"
                : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Calendar size={15} />
            {t("proappt.viewWeek")}
          </button>
        </div>

        <a
          href="/api/professional/calendar/export"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 border border-brand-200 hover:bg-brand-50 px-3 py-2 rounded-xl transition"
        >
          <Download size={15} />
          {t("proappt.exportIcs")}
        </a>

        {viewMode === "week" && (
          <div className="flex items-center gap-1 sm:ml-auto">
            {isMobileDay ? (
              <>
                <button
                  type="button"
                  onClick={() => setMobileDayStr((d) => addCalendarDays(d, -1))}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
                  aria-label={t("proappt.prevDay")}
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-xs font-medium text-slate-700 min-w-[9rem] text-center">
                  {formatShortDateWithYear(zonedTimeToUtc(mobileDayStr, "12:00", timeZone), timeZone, locale)}
                </span>
                <button
                  type="button"
                  onClick={() => setMobileDayStr((d) => addCalendarDays(d, 1))}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
                  aria-label={t("proappt.nextDay")}
                >
                  <ChevronRight size={18} />
                </button>
                {mobileDayStr !== todayStr && (
                  <button
                    type="button"
                    onClick={() => setMobileDayStr(todayStr)}
                    className="text-xs font-medium text-brand-600 hover:text-brand-700 px-2"
                  >
                    {t("proappt.today")}
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setWeekStartStr((w) => addCalendarDays(w, -7))}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
                  aria-label={t("proappt.prevWeek")}
                  disabled={weekLoading}
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-xs font-medium text-slate-700 min-w-[9rem] text-center">
                  {weekLabel}
                </span>
                <button
                  type="button"
                  onClick={() => setWeekStartStr((w) => addCalendarDays(w, 7))}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
                  aria-label={t("proappt.nextWeek")}
                  disabled={weekLoading}
                >
                  <ChevronRight size={18} />
                </button>
                {!isCurrentWeek && (
                  <button
                    type="button"
                    onClick={() => {
                      setWeekStartStr(startOfWeekDateStr(new Date(), timeZone));
                      setMobileDayStr(todayStr);
                    }}
                    className="text-xs font-medium text-brand-600 hover:text-brand-700 px-2"
                  >
                    {t("proappt.thisWeek")}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {viewMode === "list" ? (
        <>
          {upcoming.length > 0 && (
            <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-amber-100 bg-amber-50/60">
                <p className="text-sm font-semibold text-amber-900">{t("proappt.upcoming")}</p>
              </div>
              <div className="divide-y divide-slate-100">
                {upcoming.map((apt) => renderRow(apt, true))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {rest.length === 0 && upcoming.length === 0 ? (
              <div className="text-center py-16">
                <Calendar className="mx-auto text-slate-300 mb-3" size={40} />
                <p className="text-slate-400 text-sm">{t("proappt.empty")}</p>
              </div>
            ) : rest.length > 0 ? (
              <div className="divide-y divide-slate-100">{rest.map((apt) => renderRow(apt))}</div>
            ) : null}
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {weekLoading && weekAppointments.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-sm">{t("proappt.loading")}</div>
            ) : (
              <div className={isMobileDay ? "" : "overflow-x-auto"}>
                <div
                  className={`grid divide-x divide-slate-100 ${
                    isMobileDay ? "grid-cols-1" : "grid-cols-7 min-w-[42rem]"
                  }`}
                >
                  {displayDayStrs.map((dayStr) => {
                    const dayApts = weekAppointments
                      .filter(
                        (a) => calendarDateInTimeZone(new Date(a.scheduledAt), timeZone) === dayStr,
                      )
                      .sort(
                        (a, b) =>
                          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
                      );
                    const isToday = dayStr === todayStr;
                    const dayNum = Number(dayStr.split("-")[2]);
                    const labelDate = zonedTimeToUtc(dayStr, "12:00", timeZone);
                    return (
                      <div key={dayStr} className="min-h-[12rem]">
                        <div
                          className={`px-2 py-2 text-center border-b border-slate-100 ${
                            isToday ? "bg-brand-50" : "bg-slate-50"
                          }`}
                        >
                          <p className="text-[10px] font-semibold text-slate-500 uppercase">
                            {labelDate.toLocaleDateString(locale, { weekday: "short" })}
                          </p>
                          <p
                            className={`text-sm font-bold ${
                              isToday ? "text-brand-600" : "text-slate-800"
                            }`}
                          >
                            {dayNum}
                          </p>
                        </div>
                        <div className="p-1.5 space-y-1.5">
                          {dayApts.length === 0 ? (
                            <p className="text-[10px] text-slate-300 text-center py-4">-</p>
                          ) : (
                            dayApts.map(renderWeekCard)
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {selectedApt && (
            <div className="bg-white rounded-2xl border border-brand-200 shadow-sm overflow-hidden">
              <div className="divide-y divide-slate-100">{renderRow(selectedApt, true)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
