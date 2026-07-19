"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  FileCheck,
  Search,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useToast } from "@/components/ui/toast";
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
import { mapProfessionalPathToPortal } from "@/lib/psychologist-portal";
import AiSummarizeButton from "@/components/AiSummarizeButton";
import {
  isAppointmentInVolunteerBlock,
  type VolunteerWeeklyBlock,
} from "@/lib/availability-exceptions";
import { isWithinAppointmentJoinWindow } from "@/lib/appointment-join-window";
import { initialsOf } from "@/lib/format-name";
import { isScheduledVolunteerAppointment } from "@/lib/scheduled-volunteer";
import { ProCancelAppointmentButton } from "@/components/professional/ProfessionalCancelAppointmentModal";

export type ProfessionalAppointmentRow = {
  id: string;
  scheduledAt: string;
  durationMins: number;
  type: string;
  status: string;
  hasNotes: boolean;
  patientConfirmedAt: string | null;
  patientFirstName: string;
  patientLastName: string;
  patientUserId: string | null;
  patientPhone: string | null;
  patientJoinedAt: string | null;
  professionalJoinedAt: string | null;
  chartId: string | null;
  summarizeDocumentId: string | null;
  intakeHealthPlanLabel: string | null;
  intakeServiceName: string | null;
  intakeVisitReason: string | null;
  bookingSource?: string | null;
  priceAmount?: number;
  dentalChairId?: string | null;
  dentalChairName?: string | null;
};

type ViewMode = "list" | "week";
type StatusFilter = "ALL" | "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

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
  isDentistPortal = false,
  dentalChairs = [],
  volunteerBlocks = [],
}: {
  initialAppointments: ProfessionalAppointmentRow[];
  timeZone: string;
  portalBase: string;
  isPsychologistPortal: boolean;
  isDentistPortal?: boolean;
  dentalChairs?: { id: string; name: string }[];
  volunteerBlocks?: VolunteerWeeklyBlock[];
}) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const voiceHint = searchParams.get("voiceHint");
  const locale = localeOf(lang);
  const isMobileDay = useIsMobileDayView();
  const prescriptionsPath = mapProfessionalPathToPortal(
    `${portalBase}/appointments`,
    "/professional/prescriptions",
  );

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [appointments, setAppointments] = useState(initialAppointments);
  const [openingChartId, setOpeningChartId] = useState<string | null>(null);
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
    (apt: ProfessionalAppointmentRow) => {
      if (isScheduledVolunteerAppointment(apt)) return true;
      return isAppointmentInVolunteerBlock(new Date(apt.scheduledAt), timeZone, volunteerBlocks);
    },
    [timeZone, volunteerBlocks],
  );

  const statusColors: Record<string, string> = {
    CONFIRMED: "bg-brand-100 text-brand-600",
    PENDING: "bg-amber-100 text-amber-700",
    COMPLETED: "bg-brand-100 text-brand-600",
    CANCELLED: "bg-rose-100 text-rose-700",
  };

  const filteredAppointments = useMemo(() => {
    let list = appointments;
    if (statusFilter !== "ALL") {
      list = list.filter((a) => a.status === statusFilter);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((a) =>
        `${a.patientFirstName} ${a.patientLastName}`.toLowerCase().includes(q),
      );
    }
    return list;
  }, [appointments, statusFilter, searchQuery]);

  const now = Date.now();
  const upcoming = useMemo(
    () =>
      filteredAppointments.filter(
        (a) =>
          a.status === "CONFIRMED" &&
          new Date(a.scheduledAt).getTime() >= now - 60 * 60 * 1000,
      ),
    [filteredAppointments, now],
  );
  const upcomingIds = useMemo(() => new Set(upcoming.map((a) => a.id)), [upcoming]);
  const rest = useMemo(
    () => filteredAppointments.filter((a) => !upcomingIds.has(a.id)),
    [filteredAppointments, upcomingIds],
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
          hasNotes?: boolean;
          patientConfirmedAt: string | null;
          patient: { firstName: string; lastName: string };
        }) => {
          const meta = metaByIdRef.current.get(a.id);
          const withinWindow = isWithinAppointmentJoinWindow(
            new Date(a.scheduledAt),
            a.durationMins,
          );
          return {
            id: a.id,
            scheduledAt: a.scheduledAt,
            durationMins: a.durationMins,
            type: a.type,
            status: a.status,
            hasNotes: a.hasNotes ?? false,
            patientConfirmedAt: a.patientConfirmedAt,
            patientFirstName: a.patient?.firstName ?? "",
            patientLastName: a.patient?.lastName ?? "",
            patientUserId: null,
            patientPhone: null,
            patientJoinedAt: null,
            professionalJoinedAt: null,
            chartId: meta?.chartId ?? null,
            summarizeDocumentId: meta?.summarizeDocumentId ?? null,
            intakeHealthPlanLabel: withinWindow ? meta?.intakeHealthPlanLabel ?? null : null,
            intakeServiceName: withinWindow ? meta?.intakeServiceName ?? null : null,
            intakeVisitReason: withinWindow ? meta?.intakeVisitReason ?? null : null,
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

  async function assignChair(appointmentId: string, dentalChairId: string | null) {
    const res = await fetch(`/api/dentist/appointments/${appointmentId}/chair`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dentalChairId: dentalChairId || null }),
    });
    if (!res.ok) {
      toast.error(t("proappt.cancelError"));
      return;
    }
    const data = await res.json();
    setAppointments((prev) =>
      prev.map((row) =>
        row.id === appointmentId
          ? {
              ...row,
              dentalChairId: data.dentalChairId,
              dentalChairName: data.dentalChairName,
            }
          : row,
      ),
    );
  }

  async function openChart(apt: ProfessionalAppointmentRow) {
    if (apt.chartId) {
      router.push(`${portalBase}/patients/${apt.chartId}`);
      return;
    }
    if (!apt.patientUserId) return;
    setOpeningChartId(apt.id);
    try {
      const res = await fetch("/api/professional/records/ensure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientUserId: apt.patientUserId }),
      });
      if (!res.ok) {
        toast.error(t("proappt.ensureChartError"));
        return;
      }
      const data = (await res.json()) as { chartId: string };
      setAppointments((prev) =>
        prev.map((row) =>
          row.id === apt.id ? { ...row, chartId: data.chartId } : row,
        ),
      );
      metaByIdRef.current.set(apt.id, {
        ...(metaByIdRef.current.get(apt.id) ?? {
          chartId: null,
          summarizeDocumentId: null,
          intakeHealthPlanLabel: null,
          intakeServiceName: null,
          intakeVisitReason: null,
        }),
        chartId: data.chartId,
      });
      router.push(`${portalBase}/patients/${data.chartId}`);
    } catch {
      toast.error(t("proappt.ensureChartError"));
    } finally {
      setOpeningChartId(null);
    }
  }

  function renderRow(apt: ProfessionalAppointmentRow, highlightIntake = false) {
    const firstName = apt.patientFirstName;
    const lastName = apt.patientLastName;
    const chartId = apt.chartId;

    return (
      <div
        key={apt.id}
        id={`appt-${apt.id}`}
        className={`px-4 py-4 rounded-2xl border shadow-sm scroll-mt-24 transition ${
          highlightIntake && apt.intakeVisitReason
            ? "bg-amber-50/50 border-amber-200"
            : "bg-white border-slate-200/80"
        } ${!apt.hasNotes && apt.status === "COMPLETED" ? "ring-1 ring-violet-100" : ""}`}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-brand-100 flex items-center justify-center font-bold text-brand-500 text-sm shrink-0">
              {initialsOf(firstName, lastName)}
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
              {isDentistPortal && apt.type === "IN_PERSON" && dentalChairs.length > 0 && (
                <div className="mt-2">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase">
                    {t("dental.appt.chair")}
                  </label>
                  <select
                    value={apt.dentalChairId || ""}
                    onChange={(e) => assignChair(apt.id, e.target.value || null)}
                    className="mt-1 block w-full max-w-xs rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700"
                  >
                    <option value="">{t("dental.appt.noChair")}</option>
                    {dentalChairs.map((chair) => (
                      <option key={chair.id} value={chair.id}>{chair.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end shrink-0">
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-700">
                {formatShortDateWithYear(new Date(apt.scheduledAt), timeZone, locale)}
              </p>
              <p className="text-xs text-slate-500">
                {formatAppointmentTimeWithLabel(new Date(apt.scheduledAt), timeZone, locale)}
              </p>
            </div>
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-lg ${
                statusColors[apt.status] || "bg-slate-100 text-slate-600"
              }`}
            >
              {t(`status.${apt.status}`)}
            </span>
            {apt.patientConfirmedAt && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
                {t("proappt.patientConfirmed")}
              </span>
            )}
            {isVoluntaryAppointment(apt) && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-green-50 text-green-800 border border-green-200">
                {t("proappt.voluntaryBadge")}
              </span>
            )}
            {apt.type === "TELECONSULT" && apt.status === "CONFIRMED" && (
              <a
                href={`/video/${apt.id}`}
                className="bg-brand-500 text-white rounded-xl px-3 py-2 text-xs font-bold inline-flex items-center gap-1 hover:bg-brand-400 transition"
              >
                <Video size={12} /> {t("proappt.join")}
              </a>
            )}
          </div>
        </div>

        <div className="mt-2 ml-0 sm:ml-[3.75rem] flex flex-wrap gap-2 items-center">
          {apt.patientUserId && (
            <>
              <button
                type="button"
                onClick={() => void openChart(apt)}
                disabled={openingChartId === apt.id}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:underline disabled:opacity-50"
              >
                <FileText size={11} /> {t("proappt.viewChart")}
              </button>
              {chartId && (
                <>
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
                        href={chartActionUrl(prescriptionsPath, chartId, {
                          view: "prescription",
                          returnUrl: `${portalBase}/appointments`,
                        })}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded-lg hover:bg-brand-100 transition"
                      >
                        <Pill size={11} /> {t("chartAct.prescribe")}
                      </Link>
                      <Link
                        href={chartActionUrl(prescriptionsPath, chartId, {
                          view: "exam",
                          returnUrl: `${portalBase}/appointments`,
                        })}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded-lg hover:bg-brand-100 transition"
                      >
                        <FlaskConical size={11} /> {t("chartAct.exam")}
                      </Link>
                      <Link
                        href={(() => {
                          const sp = new URLSearchParams({ viewExamResults: "1" });
                          sp.set("returnUrl", `${portalBase}/appointments`);
                          return `${portalBase}/patients/${chartId}?${sp.toString()}`;
                        })()}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg hover:bg-indigo-100 transition"
                      >
                        <FileCheck size={11} /> {t("chartAct.examResult")}
                      </Link>
                      <Link
                        href={chartActionUrl(prescriptionsPath, chartId, {
                          view: "document",
                          returnUrl: `${portalBase}/appointments`,
                        })}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded-lg hover:bg-brand-100 transition"
                      >
                        <ScrollText size={11} /> {t("chartAct.document")}
                      </Link>
                    </>
                  )}
                </>
              )}
            </>
          )}
          <ProCancelAppointmentButton
            appointment={{
              id: apt.id,
              scheduledAt: apt.scheduledAt,
              durationMins: apt.durationMins,
              status: apt.status,
              patientFirstName: apt.patientFirstName,
              patientLastName: apt.patientLastName,
              patientUserId: apt.patientUserId,
              patientPhone: apt.patientPhone,
              patientJoinedAt: apt.patientJoinedAt,
              professionalJoinedAt: apt.professionalJoinedAt,
            }}
            portalBase={portalBase}
            timeZone={timeZone}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg hover:bg-rose-100 transition"
            onCancelled={(id) => {
              setAppointments((prev) =>
                prev.map((row) => (row.id === id ? { ...row, status: "CANCELLED" } : row)),
              );
            }}
          />
        </div>
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
      {voiceHint && (
        <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">
          <span className="font-semibold">
            {lang === "es" ? "Sugerencia de voz:" : lang === "en" ? "Voice hint:" : "Sugestão de voz:"}
          </span>{" "}
          {voiceHint}
        </div>
      )}
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["ALL", "proappt.filter.all"],
                  ["PENDING", "proappt.filter.pending"],
                  ["CONFIRMED", "proappt.filter.confirmed"],
                  ["COMPLETED", "proappt.filter.completed"],
                  ["CANCELLED", "proappt.filter.cancelled"],
                ] as const
              ).map(([value, labelKey]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatusFilter(value)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${
                    statusFilter === value
                      ? "bg-brand-500 text-white border-brand-500"
                      : "bg-white text-slate-600 border-slate-200 hover:border-brand-200"
                  }`}
                >
                  {t(labelKey)}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-64">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("proappt.searchPlaceholder")}
                className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm text-slate-700 placeholder:text-slate-400"
              />
            </div>
          </div>

          {upcoming.length > 0 && (
            <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-amber-100 bg-amber-50/60">
                <p className="text-sm font-semibold text-amber-900">{t("proappt.upcoming")}</p>
              </div>
              <div className="p-3 sm:p-4 space-y-3 bg-amber-50/30">
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
              <div className="p-3 sm:p-4 space-y-3 bg-slate-50/60">{rest.map((apt) => renderRow(apt))}</div>
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
              <div className="p-3 sm:p-4 space-y-3 bg-slate-50/60">{renderRow(selectedApt, true)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
