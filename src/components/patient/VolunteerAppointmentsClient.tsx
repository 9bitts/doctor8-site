"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ShareHistoryPrompt from "@/components/ShareHistoryPrompt";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf, type Lang } from "@/lib/i18n/translations";
import { getProfessionLabel, PSYCHOANALYSIS_SPECIALTY } from "@/lib/professions";
import { formatPatientProviderDisplayName } from "@/lib/profession-label";
import { useUserTimeZone } from "@/hooks/useUserTimeZone";
import {
  filterDaysForScheduledVolunteerBooking,
  patientSlotButtonClass,
  type BookableSlot,
  type DaySlots,
} from "@/lib/appointment-slots";
import {
  formatShortDateWithYear,
  formatAppointmentTimeWithLabel,
  formatLongDate,
  dayChipFromInstant,
  refInstantFromDaySlots,
} from "@/lib/timezone";
import { parseLocalDate } from "@/lib/scheduling";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Heart,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Video,
  Building2,
  AlertTriangle,
} from "lucide-react";

type Step = "browse" | "slots" | "confirm" | "done";

type VolunteerProfessional = {
  id: string;
  providerType: "health" | "psychoanalyst" | "integrative";
  firstName: string;
  lastName: string;
  specialty: string;
  avatarUrl: string | null;
  bio: string | null;
  acceptsTeleconsult: boolean;
  acceptsInPerson: boolean;
  professionalUserId?: string;
  upcomingSlots: { datetime: string; timeLabel: string }[];
};

const BOOKING_ERROR_KEYS: Record<string, string> = {
  slot_not_found: "volAppt.err.slotNotFound",
  slot_unavailable: "volAppt.err.slotUnavailable",
  not_scheduled_volunteer_slot: "volAppt.err.notVolunteerSlot",
  not_free_volunteer_slot: "volAppt.err.notVolunteerSlot",
  provider_not_found: "volAppt.err.providerNotFound",
  volunteer_limit_exceeded: "volAppt.err.limitExceeded",
  volunteer_scheduled_not_approved: "volAppt.err.notApproved",
  policy_required: "appt.acceptPolicyRequired",
};

function formatVolunteerProviderName(
  pro: { firstName: string; lastName: string; specialty: string; providerType: VolunteerProfessional["providerType"] },
  lang: Lang,
): string {
  return formatPatientProviderDisplayName(
    lang,
    pro.firstName,
    pro.lastName,
    pro.specialty,
    pro.providerType,
  );
}

function ProfessionalAvatar({ pro }: { pro: VolunteerProfessional }) {
  const initials = `${pro.firstName.charAt(0)}${pro.lastName.charAt(0)}`.toUpperCase();
  if (pro.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={pro.avatarUrl} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
    );
  }
  return (
    <div className="w-12 h-12 rounded-xl bg-green-100 text-green-700 font-bold flex items-center justify-center shrink-0">
      {initials}
    </div>
  );
}

export default function VolunteerAppointmentsClient() {
  const { t, lang } = useI18n();
  const locale = localeOf(lang);
  const userTz = useUserTimeZone();

  const [step, setStep] = useState<Step>("browse");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [professionals, setProfessionals] = useState<VolunteerProfessional[]>([]);
  const [selectedPro, setSelectedPro] = useState<VolunteerProfessional | null>(null);
  const [slots, setSlots] = useState<DaySlots[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DaySlots | null>(null);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [type, setType] = useState<"TELECONSULT" | "IN_PERSON">("TELECONSULT");
  const [visitReason, setVisitReason] = useState("");
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmedId, setConfirmedId] = useState("");
  const [tcleGranted, setTcleGranted] = useState<boolean | null>(null);

  const loadProfessionals = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch(`/api/patient/volunteer-professionals?lang=${lang}`);
      if (!res.ok) {
        setLoadError(true);
        return;
      }
      const data = await res.json();
      setProfessionals(data.professionals || []);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    void loadProfessionals();
  }, [loadProfessionals]);

  useEffect(() => {
    fetch("/api/consent/telemedicine-tcle")
      .then((r) => r.json())
      .then((d) => setTcleGranted(!!d.granted))
      .catch(() => setTcleGranted(false));
  }, []);

  function requireTcleForTeleconsult(): boolean {
    if (type !== "TELECONSULT") return true;
    if (tcleGranted === null) return true;
    if (tcleGranted) return true;
    window.location.href = `/patient/tcle?returnUrl=${encodeURIComponent("/patient/volunteer-appointments")}`;
    return false;
  }

  async function openProfessional(pro: VolunteerProfessional, preselectSlot?: string) {
    setSelectedPro(pro);
    setStep("slots");
    setSelectedSlot("");
    setSelectedDay(null);
    setSlots([]);
    setError("");
    setType(pro.acceptsTeleconsult ? "TELECONSULT" : "IN_PERSON");
    setSlotsLoading(true);
    try {
      const res = await fetch(
        `/api/professionals/${pro.id}/slots?lang=${lang}&providerType=${pro.providerType}&volunteer=1`,
      );
      if (!res.ok) {
        setError(t("volAppt.err.loadSlots"));
        return;
      }
      const data = await res.json();
      const days = filterDaysForScheduledVolunteerBooking(data.days || []);
      setSlots(days);
      if (days.length === 0) return;

      if (preselectSlot) {
        const dayWithSlot = days.find((day) =>
          day.slots.some((s) => s.datetime === preselectSlot && s.available),
        );
        if (dayWithSlot) {
          setSelectedDay(dayWithSlot);
          setSelectedSlot(preselectSlot);
          return;
        }
      }
      setSelectedDay(days[0]);
    } catch {
      setError(t("volAppt.err.loadSlots"));
    } finally {
      setSlotsLoading(false);
    }
  }

  useEffect(() => {
    if (typeof window === "undefined" || selectedPro) return;
    const params = new URLSearchParams(window.location.search);
    const proId = params.get("pro");
    if (!proId) return;

    const providerType = (params.get("providerType") || "health") as VolunteerProfessional["providerType"];
    const preselectSlot = params.get("slot") || undefined;

    const listed = professionals.find((p) => p.id === proId && p.providerType === providerType);
    if (listed) {
      void openProfessional(listed, preselectSlot);
      return;
    }

    if (!loading) {
      const stub: VolunteerProfessional = {
        id: proId,
        providerType,
        firstName: "",
        lastName: "",
        specialty:
          providerType === "psychoanalyst"
            ? PSYCHOANALYSIS_SPECIALTY
            : providerType === "integrative"
              ? "Terapia integrativa"
              : "",
        avatarUrl: null,
        bio: null,
        acceptsTeleconsult: true,
        acceptsInPerson: true,
        upcomingSlots: [],
      };
      void openProfessional(stub, preselectSlot);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [professionals, loading]);

  function goToConfirm() {
    if (!selectedSlot) return;
    if (!requireTcleForTeleconsult()) return;
    setStep("confirm");
    setError("");
  }

  async function handleBook() {
    if (!selectedPro || !selectedSlot || !acceptedPolicy) return;
    if (!requireTcleForTeleconsult()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/appointments/volunteer-book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professionalId: selectedPro.id,
          providerType: selectedPro.providerType,
          scheduledAt: selectedSlot,
          type,
          acceptedCancellationPolicy: acceptedPolicy,
          visitReason: visitReason.trim() || undefined,
          healthPlanSlug: "particular",
          healthPlanLabel: t("appt.healthPlanPrivate"),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const code = data.error?.code as string | undefined;
        const key = code ? BOOKING_ERROR_KEYS[code] : undefined;
        setError(key ? t(key) : t("appt.errNotConfirmed"));
        return;
      }
      setConfirmedId(data.appointmentId);
      setStep("done");
    } catch {
      setError(t("appt.errGeneric"));
    } finally {
      setSubmitting(false);
    }
  }

  function resetFlow() {
    setStep("browse");
    setSelectedPro(null);
    setSelectedSlot("");
    setSelectedDay(null);
    setSlots([]);
    setVisitReason("");
    setAcceptedPolicy(false);
    setError("");
    void loadProfessionals();
  }

  const hasAnyAvailableSlot = professionals.some((p) => p.upcomingSlots.length > 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-green-700 mb-1">
          <Heart size={18} />
          <span className="text-xs font-semibold uppercase tracking-wide">{t("volAppt.eyebrow")}</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{t("volAppt.title")}</h1>
        <p className="text-slate-500 mt-2 text-sm leading-relaxed">{t("volAppt.intro")}</p>
      </div>

      {step === "browse" && (
        <>
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={28} className="animate-spin text-slate-400" />
            </div>
          ) : loadError ? (
            <div className="text-center py-12 space-y-3">
              <AlertCircle size={32} className="mx-auto text-rose-400" />
              <p className="text-sm text-slate-600">{t("volAppt.loadError")}</p>
              <button
                type="button"
                onClick={() => void loadProfessionals()}
                className="text-sm font-semibold text-emerald-600 hover:underline"
              >
                {t("common.retry")}
              </button>
            </div>
          ) : !hasAnyAvailableSlot ? (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-10 text-center">
              <Calendar size={36} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-600 font-medium">{t("volAppt.empty")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {professionals
                .filter((p) => p.upcomingSlots.length > 0)
                .map((pro) => (
                  <button
                    key={pro.id}
                    type="button"
                    onClick={() => void openProfessional(pro)}
                    className="w-full text-left bg-white border border-slate-200 rounded-2xl p-4 hover:border-green-300 hover:shadow-sm transition flex gap-4 items-start"
                  >
                    <ProfessionalAvatar pro={pro} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900">
                        {formatVolunteerProviderName(pro, lang)}
                      </p>
                      <p className="text-xs text-slate-500">{getProfessionLabel(lang, pro.specialty)}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {pro.upcomingSlots.slice(0, 4).map((slot) => (
                          <span
                            key={slot.datetime}
                            className="text-xs font-medium bg-green-50 text-green-800 border border-green-200 rounded-full px-2.5 py-0.5"
                          >
                            {slot.timeLabel}
                          </span>
                        ))}
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-400 shrink-0 mt-3" />
                  </button>
                ))}
            </div>
          )}
        </>
      )}

      {step === "slots" && selectedPro && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <button
            type="button"
            onClick={resetFlow}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
          >
            <ChevronLeft size={16} /> {t("appt.back")}
          </button>

          <div className="flex items-center gap-3">
            <ProfessionalAvatar pro={selectedPro} />
            <div>
              <p className="font-bold text-slate-900">
                {formatVolunteerProviderName(selectedPro, lang)}
              </p>
              <p className="text-xs text-slate-500">{getProfessionLabel(lang, selectedPro.specialty)}</p>
            </div>
          </div>

          {(selectedPro.acceptsTeleconsult || selectedPro.acceptsInPerson) && (
            <div className="flex gap-2">
              {selectedPro.acceptsTeleconsult && (
                <button
                  type="button"
                  onClick={() => setType("TELECONSULT")}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                    type === "TELECONSULT"
                      ? "bg-green-600 text-white border-green-600"
                      : "border-slate-200 text-slate-600"
                  }`}
                >
                  <Video size={14} /> {t("appt.teleconsult")}
                </button>
              )}
              {selectedPro.acceptsInPerson && (
                <button
                  type="button"
                  onClick={() => setType("IN_PERSON")}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                    type === "IN_PERSON"
                      ? "bg-green-600 text-white border-green-600"
                      : "border-slate-200 text-slate-600"
                  }`}
                >
                  <Building2 size={14} /> {t("appt.inPersonType")}
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
              <AlertCircle size={16} className="shrink-0" /> {error}
            </div>
          )}

          {slotsLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={24} className="animate-spin text-slate-400" />
            </div>
          ) : slots.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">{t("volAppt.noSlotsForPro")}</p>
          ) : (
            <>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {slots.map((day) => {
                  const ref = refInstantFromDaySlots(day.slots);
                  const chip = ref
                    ? dayChipFromInstant(ref, userTz, locale)
                    : {
                        weekday: parseLocalDate(day.date).toLocaleDateString(locale, {
                          weekday: "short",
                          timeZone: userTz,
                        }),
                        dayNum: String(parseLocalDate(day.date).getDate()),
                      };
                  return (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => {
                        setSelectedDay(day);
                        setSelectedSlot("");
                      }}
                      className={`shrink-0 flex flex-col items-center px-4 py-3 rounded-xl border-2 transition ${
                        selectedDay?.date === day.date
                          ? "border-green-500 bg-green-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <span className="text-xs text-slate-500 font-medium">{chip.weekday}</span>
                      <span className="text-lg font-bold text-slate-800 mt-0.5">{chip.dayNum}</span>
                    </button>
                  );
                })}
              </div>

              {selectedDay && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {selectedDay.slots.map((slot: BookableSlot) => (
                    <button
                      key={slot.datetime}
                      type="button"
                      onClick={() => setSelectedSlot(slot.datetime)}
                      className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition ${patientSlotButtonClass(
                        slot,
                        selectedSlot === slot.datetime,
                      )}`}
                    >
                      {formatAppointmentTimeWithLabel(new Date(slot.datetime), userTz, locale)}
                    </button>
                  ))}
                </div>
              )}

              {selectedSlot && (
                <button
                  type="button"
                  onClick={goToConfirm}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl transition"
                >
                  {t("volAppt.continueConfirm")} <ChevronRight size={18} />
                </button>
              )}
            </>
          )}
        </div>
      )}

      {step === "confirm" && selectedPro && selectedSlot && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <button
            type="button"
            onClick={() => setStep("slots")}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
          >
            <ChevronLeft size={16} /> {t("appt.back")}
          </button>

          <h2 className="font-bold text-slate-900 text-lg">{t("volAppt.confirmTitle")}</h2>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
            {t("volAppt.confirmIntro")}
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
              <AlertCircle size={16} className="shrink-0" /> {error}
            </div>
          )}

          <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">{t("appt.consultWith")} {selectedPro.lastName}</span>
              <span className="font-semibold text-green-700">{t("appt.volunteerFreeTotal")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">{t("appt.date")}</span>
              <span>{formatShortDateWithYear(new Date(selectedSlot), userTz, locale)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">{t("appt.time")}</span>
              <span>{formatAppointmentTimeWithLabel(new Date(selectedSlot), userTz, locale)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">{t("appt.type")}</span>
              <span>{type === "TELECONSULT" ? t("appt.teleconsult") : t("appt.inPersonType")}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {t("appt.visitReasonLabel")}
            </label>
            <textarea
              value={visitReason}
              onChange={(e) => setVisitReason(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder={t("appt.visitReasonPlaceholder")}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500/30"
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
              <AlertTriangle size={14} /> {t("volAppt.cancelPolicyTitle")}
            </p>
            <p className="text-xs text-amber-700">{t("volAppt.cancelPolicyText")}</p>
          </div>

          <label className="flex items-start gap-3 cursor-pointer p-3 bg-slate-50 rounded-xl border border-slate-200">
            <input
              type="checkbox"
              checked={acceptedPolicy}
              onChange={(e) => setAcceptedPolicy(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded accent-green-600"
            />
            <span className="text-xs text-slate-600 leading-relaxed">
              <strong className="text-slate-800">{t("appt.acceptCancelPolicyBold")}</strong>{" "}
              {t("volAppt.acceptPolicyText")}{" "}
              <a href="/terms" target="_blank" className="text-green-600 underline">
                {t("appt.termsOfUse")}
              </a>.
            </span>
          </label>

          <button
            type="button"
            onClick={() => void handleBook()}
            disabled={submitting || !acceptedPolicy}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-700 to-green-500 text-white font-bold py-4 rounded-xl transition disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <CheckCircle2 size={18} />
            )}
            {submitting ? t("appt.processing") : t("volAppt.confirmBooking")}
          </button>
        </div>
      )}

      {step === "done" && selectedPro && (
        <div className="bg-white border border-green-200 rounded-2xl p-8 text-center space-y-5">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle2 size={40} className="text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{t("appt.confirmed")}</h2>
            <p className="text-slate-500 mt-2">{t("volAppt.confirmedSub")}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-5 text-sm space-y-2 text-left">
            <div className="flex justify-between">
              <span className="text-slate-500">{t("appt.doctor")}</span>
              <span className="font-semibold">
                {formatVolunteerProviderName(selectedPro, lang)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t("appt.date")}</span>
              <span className="font-semibold">{formatLongDate(new Date(selectedSlot), userTz, locale)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t("appt.amountPaid")}</span>
              <span className="font-semibold text-green-700">{t("appt.volunteerFreeTotal")}</span>
            </div>
          </div>
          {selectedPro.providerType === "psychoanalyst" ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600 text-left">
              <p className="font-semibold text-slate-800">{t("volAppt.noHistoryTitle")}</p>
              <p className="text-xs mt-1">{t("volAppt.noHistoryText")}</p>
            </div>
          ) : (
            <ShareHistoryPrompt
              professionalId={selectedPro.providerType === "health" ? selectedPro.id : undefined}
              professionalUserId={selectedPro.professionalUserId}
              professionalName={formatVolunteerProviderName(selectedPro, lang)}
            />
          )}
          {confirmedId && (
            <a
              href={`/api/appointments/${confirmedId}/calendar`}
              className="inline-flex items-center justify-center gap-2 w-full border-2 border-green-500 text-green-700 font-semibold py-3 rounded-xl hover:bg-green-50 transition"
            >
              <Calendar size={18} /> {t("appt.addToCalendar")}
            </a>
          )}
          <Link
            href="/patient/appointments"
            className="block w-full bg-slate-900 text-white font-semibold py-3.5 rounded-xl hover:bg-slate-700 transition text-center"
          >
            {t("appt.backToAppts")}
          </Link>
          <button
            type="button"
            onClick={resetFlow}
            className="w-full text-sm text-slate-500 hover:text-slate-800"
          >
            {t("volAppt.bookAnother")}
          </button>
        </div>
      )}
    </div>
  );
}
