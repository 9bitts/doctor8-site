"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Video,
  X,
} from "lucide-react";
import { Lang, localeOf, translate } from "@/lib/i18n/translations";
import { useUserTimeZone } from "@/hooks/useUserTimeZone";
import {
  formatAppointmentTimeWithLabel,
  formatShortDate,
  dayChipFromInstant,
  refInstantFromDaySlots,
  zonedTimeToUtc,
} from "@/lib/timezone";
import { getProfessionLabel } from "@/lib/professions";
import { formatPatientProviderDisplayName } from "@/lib/profession-label";
import { isScheduledVolunteerAppointment } from "@/lib/scheduled-volunteer";
import {
  filterDaysForScheduledVolunteerBooking,
  type BookableSlot,
  type DaySlots,
} from "@/lib/appointment-slots";
import ConfirmAttendanceButton from "@/components/patient/ConfirmAttendanceButton";

type VolunteerAppointment = {
  id: string;
  scheduledAt: string;
  status: string;
  type: string;
  bookingSource?: string | null;
  professionalId?: string | null;
  psychoanalystId?: string | null;
  integrativeTherapistId?: string | null;
  providerType?: "health" | "psychoanalyst" | "integrative";
  patientConfirmedAt?: string | null;
  professional: { firstName: string; lastName: string; specialty: string };
};

type Props = {
  lang: Lang;
};

function providerIdFor(apt: VolunteerAppointment): string | null {
  return apt.professionalId || apt.psychoanalystId || apt.integrativeTherapistId || null;
}

function providerTypeFor(apt: VolunteerAppointment): "health" | "psychoanalyst" | "integrative" {
  if (apt.providerType === "psychoanalyst" || apt.psychoanalystId) return "psychoanalyst";
  if (apt.providerType === "integrative" || apt.integrativeTherapistId) return "integrative";
  return "health";
}

function formatProviderName(apt: VolunteerAppointment, lang: Lang): string {
  return formatPatientProviderDisplayName(
    lang,
    apt.professional.firstName,
    apt.professional.lastName,
    apt.professional.specialty,
    providerTypeFor(apt) === "integrative" ? "integrative" : providerTypeFor(apt),
  );
}

export default function HumanitarianScheduledAppointmentsPanel({ lang }: Props) {
  const t = (key: string) => translate(lang, key);
  const locale = localeOf(lang);
  const userTz = useUserTimeZone();

  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<VolunteerAppointment[]>([]);

  const [cancelModal, setCancelModal] = useState<VolunteerAppointment | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelDone, setCancelDone] = useState(false);

  const [rescheduleModal, setRescheduleModal] = useState<VolunteerAppointment | null>(null);
  const [rescheduleSlots, setRescheduleSlots] = useState<DaySlots[]>([]);
  const [rescheduleDay, setRescheduleDay] = useState<DaySlots | null>(null);
  const [rescheduleSlot, setRescheduleSlot] = useState("");
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [rescheduleSlotsLoading, setRescheduleSlotsLoading] = useState(false);
  const [rescheduleSlotsError, setRescheduleSlotsError] = useState(false);

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/appointments?upcoming=true");
      if (!res.ok) return;
      const data = await res.json();
      const volunteer = (data.appointments || []).filter((apt: VolunteerAppointment) =>
        isScheduledVolunteerAppointment(apt),
      );
      setAppointments(volunteer);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAppointments();
  }, [loadAppointments]);

  const nextAppointment = appointments[0];
  const subtitle = loading
    ? t("hum.painel.scheduled.loading")
    : appointments.length === 0
      ? t("hum.painel.scheduled.empty")
      : appointments.length === 1
        ? t("hum.painel.scheduled.one")
        : t("hum.painel.scheduled.count").replace("{{count}}", String(appointments.length));

  const nextHint =
    nextAppointment && !loading
      ? t("hum.painel.scheduled.next")
          .replace(
            "{{date}}",
            formatShortDate(new Date(nextAppointment.scheduledAt), userTz, locale),
          )
          .replace(
            "{{time}}",
            formatAppointmentTimeWithLabel(new Date(nextAppointment.scheduledAt), userTz, locale),
          )
      : null;

  async function handleCancel() {
    if (!cancelModal) return;
    setCancelLoading(true);
    setCancelError(null);
    try {
      const res = await fetch(`/api/appointments/${cancelModal.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason || "Patient requested" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setCancelError(typeof data.error === "string" ? data.error : t("appt.cancelError"));
        return;
      }
      setCancelDone(true);
      await loadAppointments();
    } catch {
      setCancelError(t("appt.cancelError"));
    } finally {
      setCancelLoading(false);
    }
  }

  async function openReschedule(apt: VolunteerAppointment) {
    setRescheduleModal(apt);
    setRescheduleError(null);
    setRescheduleSlotsError(false);
    setRescheduleSlots([]);
    setRescheduleDay(null);
    setRescheduleSlot("");

    const proId = providerIdFor(apt);
    const providerType = providerTypeFor(apt);
    if (!proId) {
      setRescheduleSlotsError(true);
      return;
    }

    setRescheduleSlotsLoading(true);
    try {
      const res = await fetch(
        `/api/professionals/${proId}/slots?lang=${lang}&providerType=${providerType}&volunteer=1`,
      );
      if (!res.ok) {
        setRescheduleSlotsError(true);
        return;
      }
      const data = await res.json();
      const days = filterDaysForScheduledVolunteerBooking(data.days || []);
      setRescheduleSlots(days);
      if (days.length > 0) setRescheduleDay(days[0]);
    } catch {
      setRescheduleSlotsError(true);
    } finally {
      setRescheduleSlotsLoading(false);
    }
  }

  async function handleReschedule() {
    if (!rescheduleModal || !rescheduleSlot) return;
    setRescheduleLoading(true);
    setRescheduleError(null);
    try {
      const res = await fetch(`/api/appointments/${rescheduleModal.id}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newScheduledAt: rescheduleSlot }),
      });
      if (!res.ok) {
        setRescheduleError(
          res.status === 409 ? t("appt.rescheduleSlotTaken") : t("appt.rescheduleError"),
        );
        return;
      }
      setRescheduleModal(null);
      setRescheduleSlot("");
      await loadAppointments();
    } catch {
      setRescheduleError(t("appt.rescheduleError"));
    } finally {
      setRescheduleLoading(false);
    }
  }

  return (
    <>
      <div className="hum-painel-scheduled">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={`hum-painel-action w-full text-left ${expanded ? "hum-painel-action-open" : ""}`}
          aria-expanded={expanded}
        >
          <div className="hum-painel-action-icon bg-emerald-100 text-emerald-700">
            <Calendar size={22} />
          </div>
          <div className="hum-painel-action-text flex-1 min-w-0">
            <h2>{t("hum.painel.scheduled.title")}</h2>
            <p>{subtitle}</p>
            {nextHint ? <p className="hum-painel-scheduled-next">{nextHint}</p> : null}
          </div>
          {expanded ? (
            <ChevronUp size={18} className="text-emerald-700 shrink-0" />
          ) : (
            <ChevronDown size={18} className="text-emerald-700 shrink-0" />
          )}
        </button>

        {expanded && (
          <div className="hum-painel-scheduled-panel">
            {loading ? (
              <div className="hum-painel-scheduled-loading">
                <Loader2 size={18} className="animate-spin" />
                <span>{t("hum.painel.scheduled.loading")}</span>
              </div>
            ) : appointments.length === 0 ? (
              <div className="hum-painel-scheduled-empty">
                <p>{t("hum.painel.scheduled.emptyDetail")}</p>
                <Link href="/patient/volunteer-appointments" className="hum-painel-scheduled-book">
                  {t("volAppt.banner.cta")}
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {appointments.map((apt) => {
                  const hoursUntil =
                    (new Date(apt.scheduledAt).getTime() - Date.now()) / 3600000;
                  const canCancel = hoursUntil > 0 && apt.status !== "CANCELLED";
                  const canReschedule = hoursUntil > 24 && apt.status !== "CANCELLED";
                  const within48h = hoursUntil > 0 && hoursUntil <= 48;

                  return (
                    <div key={apt.id} className="hum-painel-scheduled-item">
                      <div className="min-w-0 flex-1">
                        <p className="hum-painel-scheduled-provider">
                          {formatProviderName(apt, lang)}
                        </p>
                        <p className="hum-painel-scheduled-specialty">
                          {getProfessionLabel(lang, apt.professional.specialty)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="hum-painel-scheduled-date">
                          {formatShortDate(new Date(apt.scheduledAt), userTz, locale)}
                        </p>
                        <p className="hum-painel-scheduled-time">
                          {formatAppointmentTimeWithLabel(
                            new Date(apt.scheduledAt),
                            userTz,
                            locale,
                          )}
                        </p>
                      </div>
                      <ConfirmAttendanceButton
                        appointmentId={apt.id}
                        confirmed={!!apt.patientConfirmedAt}
                        within48h={within48h}
                        compact
                        onConfirmed={loadAppointments}
                      />
                      <div className="flex flex-wrap gap-2 shrink-0">
                        {apt.type === "TELECONSULT" && apt.status === "CONFIRMED" && (
                          <a
                            href={`/video/${apt.id}`}
                            className="hum-painel-scheduled-btn hum-painel-scheduled-btn-video"
                          >
                            <Video size={13} />
                            {t("appt.join")}
                          </a>
                        )}
                        {canReschedule && (
                          <button
                            type="button"
                            onClick={() => openReschedule(apt)}
                            className="hum-painel-scheduled-btn hum-painel-scheduled-btn-reschedule"
                          >
                            <RefreshCw size={12} />
                            {t("appt.rescheduleBtn")}
                          </button>
                        )}
                        {canCancel && (
                          <button
                            type="button"
                            onClick={() => {
                              setCancelModal(apt);
                              setCancelReason("");
                              setCancelError(null);
                              setCancelDone(false);
                            }}
                            className="hum-painel-scheduled-btn hum-painel-scheduled-btn-cancel"
                          >
                            <X size={12} />
                            {t("appt.cancelBtn")}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                <Link href="/patient/volunteer-appointments" className="hum-painel-scheduled-book-inline">
                  {t("hum.painel.scheduled.bookAnother")}
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {cancelModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            {cancelDone ? (
              <>
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={28} className="text-emerald-500" />
                </div>
                <p className="text-sm text-emerald-700 text-center bg-emerald-50 rounded-xl p-3">
                  {t("volAppt.cancelDone")}
                </p>
                <button
                  type="button"
                  onClick={() => setCancelModal(null)}
                  className="w-full py-3 rounded-xl bg-slate-900 text-white font-semibold"
                >
                  {t("appt.close")}
                </button>
              </>
            ) : (
              <>
                <h3 className="font-bold text-slate-900 text-lg">{t("appt.cancelTitle")}</h3>
                <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3">
                  {t("volAppt.cancelConfirmHint")}
                </p>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={3}
                  placeholder={t("appt.cancelReasonPlaceholder")}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                />
                {cancelError && (
                  <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3">
                    {cancelError}
                  </p>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setCancelModal(null)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm"
                  >
                    {t("appt.back")}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={cancelLoading}
                    className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  >
                    {cancelLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                    {t("appt.confirmCancel")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {rescheduleModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <RefreshCw size={18} className="text-blue-500" />
                {t("appt.rescheduleTitle")}
              </h3>
              <button
                type="button"
                onClick={() => setRescheduleModal(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-xs text-slate-500">{t("appt.rescheduleHint")}</p>
            {rescheduleSlotsLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 size={20} className="animate-spin text-slate-400" />
              </div>
            ) : rescheduleSlotsError ? (
              <div className="text-center py-6 space-y-3">
                <p className="text-sm text-rose-600">{t("appt.rescheduleLoadError")}</p>
                <button
                  type="button"
                  onClick={() => openReschedule(rescheduleModal)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm"
                >
                  {t("common.retry")}
                </button>
              </div>
            ) : rescheduleSlots.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">{t("appt.noSlots")}</p>
            ) : (
              <>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {rescheduleSlots.map((day) => {
                    const ref = refInstantFromDaySlots(day.slots);
                    const chip = ref
                      ? dayChipFromInstant(ref, userTz, locale)
                      : dayChipFromInstant(zonedTimeToUtc(day.date, "12:00", userTz), userTz, locale);
                    return (
                      <button
                        key={day.date}
                        type="button"
                        onClick={() => {
                          setRescheduleDay(day);
                          setRescheduleSlot("");
                        }}
                        className={`shrink-0 flex flex-col items-center px-3 py-2 rounded-xl border-2 transition text-center ${
                          rescheduleDay?.date === day.date
                            ? "border-blue-500 bg-blue-50"
                            : "border-slate-200"
                        }`}
                      >
                        <span className="text-xs text-slate-500">{chip.weekday}</span>
                        <span className="text-base font-bold text-slate-800">{chip.dayNum}</span>
                      </button>
                    );
                  })}
                </div>
                {rescheduleDay && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {rescheduleDay.slots
                      .filter((s: BookableSlot) => s.available)
                      .map((slot) => (
                        <button
                          key={slot.datetime}
                          type="button"
                          onClick={() => setRescheduleSlot(slot.datetime)}
                          className={`py-2 rounded-xl text-sm font-semibold border-2 transition ${
                            rescheduleSlot === slot.datetime
                              ? "bg-blue-500 border-blue-500 text-white"
                              : "border-slate-200 hover:border-blue-400"
                          }`}
                        >
                          {formatAppointmentTimeWithLabel(
                            new Date(slot.datetime),
                            userTz,
                            locale,
                          )}
                        </button>
                      ))}
                  </div>
                )}
                {rescheduleError && (
                  <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3">
                    {rescheduleError}
                  </p>
                )}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setRescheduleModal(null)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm"
                  >
                    {t("appt.cancelBtn")}
                  </button>
                  <button
                    type="button"
                    onClick={handleReschedule}
                    disabled={!rescheduleSlot || rescheduleLoading}
                    className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  >
                    {rescheduleLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                    {t("appt.confirmReschedule")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
