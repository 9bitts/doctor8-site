"use client";

// src/app/(dashboard)/patient/appointments/page.tsx
// Full appointment booking flow with:
// - CDC cancellation policy checkbox at checkout
// - Cancel button with refund rules explained
// - Reschedule button (>24h only)
// - Onboarding tooltips on first use

import { useState, useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf, formatSlotCount, Lang } from "@/lib/i18n/translations";
import { getProfessionLabel, specialtyMatchesSearch, PSYCHOANALYSIS_SPECIALTY } from "@/lib/professions";
import { getProfessionInfo } from "@/lib/profession-label";
import { parseLocalDate } from "@/lib/scheduling";
import ShareHistoryPrompt from "@/components/ShareHistoryPrompt";
import ReviewPromptModal from "@/components/ReviewPromptModal";
import {
  Calendar, Search, Video, Building2, Clock, ChevronRight, ChevronLeft,
  CreditCard, Loader2, CheckCircle2, AlertCircle, Star, MapPin, Lock,
  X, RefreshCw, AlertTriangle, Info, HelpCircle,
} from "lucide-react";

type Step = "browse" | "slots" | "payment" | "confirmed";

interface Professional {
  id: string;
  providerType?: "health" | "psychoanalyst";
  firstName: string;
  lastName: string;
  specialty: string;
  bio?: string;
  avatarUrl?: string;
  consultPrice: number;
  currency: string;
  acceptsTeleconsult: boolean;
  acceptsInPerson: boolean;
  rating: number;
  clinicCity?: string;
  clinicCountry?: string;
  license?: string | null;
  trainingInstitution?: string | null;
  yearsOfPractice?: number | null;
}

interface SlotDay {
  date: string;
  label: string;
  slots: { time: string; datetime: string; available: boolean }[];
}

interface Appointment {
  id: string;
  scheduledAt: string;
  status: string;
  type: string;
  meetingUrl?: string;
  paidAt?: string;
  professional: { firstName: string; lastName: string; specialty: string };
}

// ── Inline onboarding texts ──────────────────────────────────────────────────
const TIPS: Record<string, { pt: string; en: string; es: string }> = {
  browse:   { pt: "Escolha um médico pela especialidade ou nome. Você pode filtrar por tipo de consulta.", en: "Choose a doctor by specialty or name. You can filter by consultation type.", es: "Elige un médico por especialidad o nombre." },
  slots:    { pt: "Selecione o dia e horário que preferir. Horários em cinza já estão ocupados.", en: "Select your preferred day and time. Grey slots are already taken.", es: "Selecciona el día y horario que prefieras." },
  payment:  { pt: "Seu pagamento é seguro e processado pelo Stripe. Você pode cancelar em até 24h antes com reembolso total.", en: "Your payment is secure via Stripe. You can cancel up to 24h before for a full refund.", es: "Tu pago es seguro vía Stripe. Puedes cancelar hasta 24h antes para un reembolso total." },
  cancel:   { pt: "Cancelamentos com mais de 24h de antecedência recebem reembolso total. Com menos de 24h, o valor não é reembolsado conforme nossa política.", en: "Cancellations more than 24h before get a full refund. Less than 24h — no refund per our policy.", es: "Cancelaciones con más de 24h de anticipación reciben reembolso total." },
};

export default function AppointmentsPage() {
  const { t, lang } = useI18n();
  const locale = localeOf(lang);
  const l = (lang === "pt" || lang === "es") ? lang : "en";

  const SPECIALTIES = ["All", "General Practice", "Cardiology", "Psychology", PSYCHOANALYSIS_SPECIALTY, "Nutrition", "Cannabis Medicine", "Dermatology"] as const;

  function specialtyFilterLabel(value: string): string {
    if (value === "All") return t("map.specialty.all");
    return getProfessionLabel(lang, value);
  }

  function matchesSpecialtyFilter(filter: string, pro: Professional): boolean {
    if (filter === "All") return true;
    if (filter === PSYCHOANALYSIS_SPECIALTY) return pro.providerType === "psychoanalyst" || pro.specialty === PSYCHOANALYSIS_SPECIALTY;
    if (pro.providerType === "psychoanalyst") return false;
    if (pro.specialty === filter) return true;
    const typeKey = getProfessionInfo(pro.specialty).typeKey;
    if (filter === "Psychology") return typeKey === "psychologist";
    if (filter === "Nutrition") return typeKey === "nutritionist";
    return false;
  }

  const [step, setStep]                   = useState<Step>("browse");
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selectedPro, setSelectedPro]     = useState<Professional | null>(null);
  const [slots, setSlots]                 = useState<SlotDay[]>([]);
  const [selectedDay, setSelectedDay]     = useState<SlotDay | null>(null);
  const [selectedSlot, setSelectedSlot]   = useState<string>("");
  const [loading, setLoading]             = useState(true);
  const [slotsLoading, setSlotsLoading]   = useState(false);
  const [payLoading, setPayLoading]       = useState(false);
  const [confirmedId, setConfirmedId]     = useState("");
  const [error, setError]                 = useState("");
  const [search, setSearch]               = useState("");
  const [specialty, setSpecialty]         = useState("All");
  const [type, setType]                   = useState<"TELECONSULT" | "IN_PERSON">("TELECONSULT");
  const [appointments, setAppointments]   = useState<Appointment[]>([]);

  // CDC policy checkbox
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);

  // Cancel / reschedule modal
  const [cancelModal,     setCancelModal]     = useState<Appointment | null>(null);
  const [rescheduleModal, setRescheduleModal] = useState<Appointment | null>(null);
  const [cancelReason,    setCancelReason]    = useState("");
  const [cancelLoading,   setCancelLoading]   = useState(false);
  const [cancelResult,    setCancelResult]    = useState<{ refunded: boolean; hoursUntil: number } | null>(null);
  const [rescheduleSlots, setRescheduleSlots] = useState<SlotDay[]>([]);
  const [rescheduleDay,   setRescheduleDay]   = useState<SlotDay | null>(null);
  const [rescheduleSlot,  setRescheduleSlot]  = useState<string>("");
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  // Onboarding tip state
  const [showTip, setShowTip] = useState(true);

  // Stripe refs
  const [stripeLoaded, setStripeLoaded]   = useState(false);
  const [cardComplete, setCardComplete]   = useState(false);
  const cardElementRef = useRef<any>(null);
  const stripeRef      = useRef<any>(null);
  const elementsRef    = useRef<any>(null);

  const [reviewModal, setReviewModal] = useState<{
    providerId: string;
    providerType: "health" | "psychoanalyst";
    providerName?: string;
  } | null>(null);

  const [bookingSource, setBookingSource] = useState<
    "patient_panel" | "public_profile" | "public_search"
  >("patient_panel");

  useEffect(() => { fetchProfessionals(); fetchAppointments(); }, []);
  useEffect(() => { if (step === "payment" && !stripeLoaded) loadStripe(); }, [step]);
  useEffect(() => { setShowTip(true); }, [step]);

  // Deep link: /patient/appointments?pro=ID&providerType=...&slot=...&from=public_profile
  useEffect(() => {
    if (professionals.length === 0 || selectedPro) return;
    const params = new URLSearchParams(window.location.search);
    const proId = params.get("pro");
    if (!proId) return;
    const providerType = params.get("providerType") || undefined;
    const from = params.get("from");
    if (from === "public_profile" || from === "public_search") {
      setBookingSource(from);
    }
    const pro = professionals.find((p) =>
      p.id === proId && (!providerType || p.providerType === providerType)
    );
    if (pro) selectProfessional(pro, params.get("slot") || undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [professionals]);

  // Deep link: /patient/appointments?reviewPro=ID&providerType=health
  useEffect(() => {
    if (professionals.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const reviewPro = params.get("reviewPro");
    if (!reviewPro) return;
    const providerType = (params.get("providerType") || "health") as "health" | "psychoanalyst";
    const pro = professionals.find((p) => p.id === reviewPro && (p.providerType || "health") === providerType);
    setReviewModal({
      providerId: reviewPro,
      providerType,
      providerName: pro ? `${pro.firstName} ${pro.lastName}`.trim() : undefined,
    });
  }, [professionals]);

  async function loadStripe() {
    if (!(window as any).Stripe) {
      const script = document.createElement("script");
      script.src = "https://js.stripe.com/v3/";
      script.onload = () => initStripe();
      document.head.appendChild(script);
    } else { initStripe(); }
  }

  function initStripe() {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) return;
    stripeRef.current    = (window as any).Stripe(publishableKey);
    elementsRef.current  = stripeRef.current.elements();
    const card = elementsRef.current.create("card", {
      style: { base: { fontSize: "16px", color: "#1e293b", fontFamily: "system-ui, sans-serif", "::placeholder": { color: "#94a3b8" } }, invalid: { color: "#ef4444" } },
    });
    setTimeout(() => {
      const mount = document.getElementById("card-element");
      if (mount) {
        card.mount("#card-element");
        card.on("change", (e: any) => setCardComplete(e.complete));
        cardElementRef.current = card;
        setStripeLoaded(true);
      }
    }, 100);
  }

  async function fetchProfessionals() {
    setLoading(true);
    try {
      const res = await fetch(`/api/professionals?type=${type}`);
      const d   = await res.json();
      setProfessionals(d.professionals || []);
    } finally { setLoading(false); }
  }

  async function fetchAppointments() {
    const res = await fetch("/api/appointments?upcoming=true");
    const d   = await res.json();
    setAppointments(d.appointments || []);
  }

  async function selectProfessional(pro: Professional, preselectSlot?: string) {
    setSelectedPro(pro);
    setStep("slots");
    setSelectedDay(null);
    setSelectedSlot("");
    setSlotsLoading(true);
    try {
      const res  = await fetch(`/api/professionals/${pro.id}/slots?lang=${lang}&providerType=${pro.providerType || "health"}`);
      const d    = await res.json();
      const days = (d.days || []).filter((day: SlotDay) => day.slots.some((s) => s.available));
      setSlots(days);
      if (days.length > 0) {
        const dayWithSlot = preselectSlot
          ? days.find((day: SlotDay) =>
              day.slots.some((s) => s.datetime === preselectSlot && s.available)
            )
          : null;
        const day = dayWithSlot ?? days[0];
        setSelectedDay(day);
        if (preselectSlot && day.slots.some((s: SlotDay["slots"][number]) => s.datetime === preselectSlot && s.available)) {
          setSelectedSlot(preselectSlot);
        }
      }
    } finally { setSlotsLoading(false); }
  }

  async function handlePayment() {
    if (!selectedPro || !selectedSlot || !stripeRef.current || !cardElementRef.current || !acceptedPolicy) return;
    setPayLoading(true); setError("");
    try {
      const intentRes = await fetch("/api/payments/create-intent", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          providerType: selectedPro.providerType || "health",
          professionalId: selectedPro.providerType === "health" ? selectedPro.id : undefined,
          psychoanalystId: selectedPro.providerType === "psychoanalyst" ? selectedPro.id : undefined,
          scheduledAt: selectedSlot,
          type,
          paymentMethod: "card",
        }),
      });
      const intentData = await intentRes.json();
      if (!intentRes.ok) { setError(intentData.error?.general?.[0] || t("appt.errInitPayment")); return; }

      const { error: stripeError, paymentIntent } = await stripeRef.current.confirmCardPayment(
        intentData.clientSecret,
        { payment_method: { card: cardElementRef.current } }
      );
      if (stripeError) { setError(stripeError.message || t("appt.errPaymentFailed")); return; }

      if (paymentIntent.status === "succeeded") {
        const apptRes = await fetch("/api/appointments", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            providerType:             selectedPro.providerType || "health",
            professionalId:           selectedPro.providerType === "health" ? selectedPro.id : undefined,
            psychoanalystId:          selectedPro.providerType === "psychoanalyst" ? selectedPro.id : undefined,
            scheduledAt:                selectedSlot,
            type,
            stripePaymentIntentId:      paymentIntent.id,
            priceAmount:                intentData.amount,
            currency:                   intentData.currency,
            acceptedCancellationPolicy: acceptedPolicy,
            bookingSource,
          }),
        });
        const apptData = await apptRes.json();
        if (!apptRes.ok) { setError(apptData.error?.general?.[0] || t("appt.errNotConfirmed")); return; }
        setConfirmedId(apptData.appointmentId);
        setStep("confirmed");
        fetchAppointments();
      }
    } catch { setError(t("appt.errGeneric")); }
    finally { setPayLoading(false); }
  }

  async function handleCancel() {
    if (!cancelModal) return;
    setCancelLoading(true);
    const res  = await fetch(`/api/appointments/${cancelModal.id}/cancel`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ reason: cancelReason || "Patient requested" }),
    });
    const data = await res.json();
    setCancelResult({ refunded: data.refunded, hoursUntil: data.hoursUntil });
    setCancelLoading(false);
    fetchAppointments();
  }

  async function handleReschedule() {
    if (!rescheduleModal || !rescheduleSlot) return;
    setRescheduleLoading(true);
    const res = await fetch(`/api/appointments/${rescheduleModal.id}/reschedule`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ newScheduledAt: rescheduleSlot }),
    });
    if (res.ok) {
      setRescheduleModal(null);
      setRescheduleSlot("");
      fetchAppointments();
    }
    setRescheduleLoading(false);
  }

  async function openReschedule(apt: Appointment) {
    setRescheduleModal(apt);
    const proId = (apt as any).professionalId || (apt as any).psychoanalystId;
    const providerType = (apt as any).providerType === "psychoanalyst" ? "psychoanalyst" : "health";
    if (proId) {
      const res  = await fetch(`/api/professionals/${proId}/slots?lang=${lang}&providerType=${providerType}`);
      const d    = await res.json();
      const days = (d.days || []).filter((day: SlotDay) => day.slots.some((s) => s.available));
      setRescheduleSlots(days);
      if (days.length > 0) setRescheduleDay(days[0]);
    }
  }

  function resetFlow() {
    setStep("browse"); setSelectedPro(null); setSelectedSlot(""); setSelectedDay(null);
    setSlots([]); setError(""); setStripeLoaded(false); setCardComplete(false);
    setAcceptedPolicy(false);
    cardElementRef.current = null; stripeRef.current = null; elementsRef.current = null;
  }

  const filtered = professionals.filter((p) => {
    const matchSearch = search === "" || `${p.firstName} ${p.lastName}`.toLowerCase().includes(search.toLowerCase()) || specialtyMatchesSearch(lang, p.specialty, search);
    const matchSpec   = matchesSpecialtyFilter(specialty, p);
    return matchSearch && matchSpec;
  });

  const priceDisplay = selectedPro
    ? new Intl.NumberFormat(locale, { style: "currency", currency: selectedPro.currency || "USD" }).format(selectedPro.consultPrice / 100)
    : "";

  const canPay = stripeLoaded && cardComplete && acceptedPolicy;

  // Tips per step
  const tipText = TIPS[step === "payment" ? "payment" : step]?.[l] ?? TIPS[step]?.["en"];

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("appt.title")}</h1>
          <p className="text-slate-500 text-sm mt-1">{t("appt.subtitle")}</p>
        </div>
        {step !== "browse" && step !== "confirmed" && (
          <button onClick={resetFlow} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 font-medium">
            <ChevronLeft size={16} /> {t("appt.backToSearch")}
          </button>
        )}
      </div>

      {/* Onboarding tip */}
      {showTip && tipText && (
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700 flex-1">{tipText}</p>
          <button onClick={() => setShowTip(false)} className="text-blue-400 hover:text-blue-600 shrink-0">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Upcoming appointments */}
      {appointments.length > 0 && step === "browse" && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-emerald-800 mb-3 flex items-center gap-2">
            <Calendar size={15} /> {t("appt.upcoming")}
          </p>
          <div className="space-y-2">
            {appointments.slice(0, 3).map((apt) => {
              const hoursUntil = (new Date(apt.scheduledAt).getTime() - Date.now()) / 3600000;
              const canCancel  = hoursUntil > 0;
              const canReschedule = hoursUntil > 24;
              return (
                <div key={apt.id} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      Dr. {apt.professional?.firstName} {apt.professional?.lastName}
                    </p>
                    <p className="text-xs text-slate-500">{getProfessionLabel(lang, apt.professional?.specialty)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-emerald-700">
                      {new Date(apt.scheduledAt).toLocaleDateString(locale, { month: "short", day: "numeric" })}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(apt.scheduledAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {apt.type === "TELECONSULT" && apt.status === "CONFIRMED" && (
                      <a href={`/video/${apt.id}`} className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold px-3 py-2 rounded-lg transition">
                        <Video size={13} /> Entrar
                      </a>
                    )}
                    {canReschedule && (
                      <button onClick={() => openReschedule(apt)} className="flex items-center gap-1 text-xs text-blue-600 border border-blue-200 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition">
                        <RefreshCw size={12} /> Remarcar
                      </button>
                    )}
                    {canCancel && (
                      <button onClick={() => { setCancelModal(apt); setCancelResult(null); setCancelReason(""); }} className="flex items-center gap-1 text-xs text-rose-600 border border-rose-200 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition">
                        <X size={12} /> Cancelar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 1: BROWSE */}
      {step === "browse" && (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("appt.search")}
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400" />
              </div>
              <div className="flex gap-2">
                {(["TELECONSULT", "IN_PERSON"] as const).map((tp) => (
                  <button key={tp} onClick={() => setType(tp)} className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${type === tp ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                    {tp === "TELECONSULT" ? <Video size={13} /> : <Building2 size={13} />}
                    {tp === "TELECONSULT" ? t("appt.online") : t("appt.inPerson")}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {SPECIALTIES.map((s) => (
                <button key={s} onClick={() => setSpecialty(s)} className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition ${specialty === s ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  {specialtyFilterLabel(s)}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-slate-400" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-slate-500 mb-2">{t("appt.noDoctors")}</p>
              <p className="text-xs text-slate-400">{t("appt.noDoctorsHint")}</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {filtered.map((pro) => (
                <DoctorCard key={`${pro.providerType || "health"}-${pro.id}`} pro={pro} onSelect={() => selectProfessional(pro)} locale={locale} lang={lang} t={t} />
              ))}
            </div>
          )}
        </>
      )}

      {/* STEP 2: SELECT SLOT */}
      {step === "slots" && selectedPro && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 flex items-center gap-4">
            {selectedPro.avatarUrl ? (
              <img src={selectedPro.avatarUrl} alt="" className="w-14 h-14 rounded-2xl object-cover shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-emerald-400/20 flex items-center justify-center text-2xl font-black text-emerald-300 shrink-0">
                {selectedPro.firstName[0]}
              </div>
            )}
            <div>
              <h2 className="text-white font-bold text-lg">
                {selectedPro.providerType === "psychoanalyst" ? "" : "Dr. "}
                {selectedPro.firstName} {selectedPro.lastName}
              </h2>
              <p className="text-slate-400 text-sm">{getProfessionLabel(lang, selectedPro.specialty)}</p>
              <p className="text-emerald-400 font-semibold text-sm mt-1">{priceDisplay} {t("appt.perConsult")}</p>
            </div>
          </div>
          <div className="p-6 space-y-6">
            {slotsLoading ? (
              <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-slate-400" /></div>
            ) : slots.length === 0 ? (
              <p className="text-center text-slate-500 py-8">{t("appt.noSlots")}</p>
            ) : (
              <>
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-3">{t("appt.selectDay")}</p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {slots.map((day) => {
                      const avail = day.slots.filter((s) => s.available).length;
                      const dayDate = parseLocalDate(day.date);
                      const weekday = dayDate.toLocaleDateString(locale, { weekday: "short" });
                      const dayNum = dayDate.getDate();
                      return (
                        <button key={day.date} onClick={() => { setSelectedDay(day); setSelectedSlot(""); }}
                          className={`shrink-0 flex flex-col items-center px-4 py-3 rounded-xl border-2 transition ${selectedDay?.date === day.date ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-slate-300"}`}>
                          <span className="text-xs text-slate-500 font-medium">{weekday}</span>
                          <span className="text-lg font-bold text-slate-800 mt-0.5">{dayNum}</span>
                          <span className="text-xs text-emerald-600 font-semibold mt-1">{formatSlotCount(lang, avail)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {selectedDay && (
                  <div key={selectedDay.date}>
                    <p className="text-sm font-semibold text-slate-700 mb-3">{selectedDay.label} — {t("appt.availableTimes")}</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {selectedDay.slots.map((slot) => (
                        <button key={slot.datetime} disabled={!slot.available} onClick={() => setSelectedSlot(slot.datetime)}
                          className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition ${!slot.available ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed" : selectedSlot === slot.datetime ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-slate-200 text-slate-700 hover:border-emerald-400"}`}>
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {selectedSlot && (
                  <button onClick={() => setStep("payment")} className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-4 px-4 rounded-xl transition text-base">
                    {t("appt.continueToPayment")} <ChevronRight size={18} className="shrink-0" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: PAYMENT */}
      {step === "payment" && selectedPro && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <h2 className="font-bold text-slate-900 text-lg">{t("appt.completePayment")}</h2>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
              <AlertCircle size={16} className="shrink-0" /> {error}
            </div>
          )}

          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">{t("appt.orderSummary")}</p>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">{t("appt.consultWith")} {selectedPro.lastName}</span>
              <span className="font-semibold">{priceDisplay}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">{t("appt.date")}</span>
              <span>{new Date(selectedSlot).toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">{t("appt.time")}</span>
              <span>{new Date(selectedSlot).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">{t("appt.type")}</span>
              <span>{type === "TELECONSULT" ? t("appt.teleconsult") : t("appt.inPersonType")}</span>
            </div>
            <div className="border-t border-slate-200 mt-3 pt-3 flex justify-between font-bold text-slate-900">
              <span>{t("appt.total")}</span>
              <span>{priceDisplay}</span>
            </div>
          </div>

          {/* Cancellation policy info */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
              <AlertTriangle size={14} /> Política de cancelamento
            </p>
            <ul className="text-xs text-amber-700 space-y-1 ml-5 list-disc">
              <li>Cancelamento com mais de 24h de antecedência → reembolso 100%</li>
              <li>Cancelamento com menos de 24h → sem reembolso</li>
              <li>Dentro de 7 dias da compra (CDC) → reembolso 100% se antes da consulta</li>
              <li>Ausência do médico → reembolso 100% automático</li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <CreditCard size={16} /> {t("appt.cardDetails")}
            </p>
            <div id="card-element" className="border border-slate-200 rounded-xl px-4 py-3.5 bg-white focus-within:ring-2 focus-within:ring-emerald-500/30 focus-within:border-emerald-400 transition" />
            {!stripeLoaded && (
              <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                <Loader2 size={12} className="animate-spin" /> {t("appt.loadingPayment")}
              </div>
            )}
          </div>

          {/* CDC policy checkbox — mandatory */}
          <label className="flex items-start gap-3 cursor-pointer p-3 bg-slate-50 rounded-xl border border-slate-200">
            <input
              type="checkbox"
              checked={acceptedPolicy}
              onChange={(e) => setAcceptedPolicy(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded accent-emerald-500"
            />
            <span className="text-xs text-slate-600 leading-relaxed">
              <strong className="text-slate-800">Aceito a política de cancelamento.</strong> Compreendo que cancelamentos realizados com menos de 24 horas de antecedência não serão reembolsados, conforme os{" "}
              <a href="/terms" target="_blank" className="text-emerald-600 underline">Termos de Uso</a>.
            </span>
          </label>

          {!acceptedPolicy && (
            <p className="text-xs text-amber-600 flex items-center gap-1.5">
              <HelpCircle size={13} /> Aceite a política de cancelamento para continuar.
            </p>
          )}

          <button
            onClick={handlePayment}
            disabled={payLoading || !canPay}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-slate-800 to-emerald-600 text-white font-bold py-4 rounded-xl transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-base"
          >
            {payLoading ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
            {payLoading ? t("appt.processing") : `${t("appt.pay")} ${priceDisplay}`}
          </button>

          <p className="text-xs text-slate-400 text-center flex items-center justify-center gap-1">
            <Lock size={11} /> {t("appt.securedBy")}
          </p>
        </div>
      )}

      {/* STEP 4: CONFIRMED */}
      {step === "confirmed" && selectedPro && (
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-8 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <CheckCircle2 size={40} className="text-emerald-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{t("appt.confirmed")}</h2>
            <p className="text-slate-500 mt-2">{t("appt.confirmedSub")}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700 text-left space-y-1">
            <p className="font-semibold flex items-center gap-2"><Info size={14} /> O que acontece agora?</p>
            <ul className="ml-5 list-disc space-y-1 text-xs mt-2">
              <li>Você receberá um email de confirmação com os detalhes</li>
              <li>24 horas antes da consulta, enviaremos um lembrete por email</li>
              <li>3 horas antes, enviaremos outro lembrete com o link da videochamada</li>
              <li>No horário marcado, acesse pelo botão "Entrar" nas suas consultas</li>
            </ul>
          </div>
          <div className="bg-slate-50 rounded-xl p-5 text-sm space-y-2 text-left">
            <div className="flex justify-between">
              <span className="text-slate-500">{t("appt.doctor")}</span>
              <span className="font-semibold">Dr. {selectedPro.firstName} {selectedPro.lastName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t("appt.date")}</span>
              <span className="font-semibold">{new Date(selectedSlot).toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric" })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t("appt.time")}</span>
              <span className="font-semibold">{new Date(selectedSlot).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t("appt.amountPaid")}</span>
              <span className="font-semibold text-emerald-600">{priceDisplay}</span>
            </div>
          </div>
          <ShareHistoryPrompt
            professionalId={selectedPro.id}
            professionalName={`Dr. ${selectedPro.firstName} ${selectedPro.lastName}`}
          />
          <p className="text-sm text-slate-500">{t("appt.emailSent")}</p>
          <button onClick={resetFlow} className="w-full bg-slate-900 text-white font-semibold py-3.5 rounded-xl hover:bg-slate-700 transition">
            {t("appt.backToAppts")}
          </button>
        </div>
      )}

      {/* CANCEL MODAL */}
      {cancelModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            {cancelResult ? (
              <>
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${cancelResult.refunded ? "bg-emerald-100" : "bg-amber-100"}`}>
                  {cancelResult.refunded ? <CheckCircle2 size={28} className="text-emerald-500" /> : <AlertTriangle size={28} className="text-amber-500" />}
                </div>
                <h3 className="font-bold text-slate-900 text-center text-lg">Consulta cancelada</h3>
                {cancelResult.refunded ? (
                  <p className="text-sm text-emerald-700 text-center bg-emerald-50 rounded-xl p-3">
                    ✅ Reembolso aprovado! O valor será estornado em até 5 dias úteis.
                  </p>
                ) : (
                  <p className="text-sm text-amber-700 text-center bg-amber-50 rounded-xl p-3">
                    ⚠️ Cancelamento feito com menos de 24h — sem reembolso conforme a política aceita.
                  </p>
                )}
                <button onClick={() => { setCancelModal(null); setCancelResult(null); }} className="w-full py-3 rounded-xl bg-slate-900 text-white font-semibold">Fechar</button>
              </>
            ) : (
              <>
                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                  <AlertTriangle size={20} className="text-rose-500" /> Cancelar consulta
                </h3>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 space-y-1">
                  <p className="font-semibold">Política de reembolso:</p>
                  <p>• Mais de 24h antes → reembolso 100%</p>
                  <p>• Menos de 24h antes → sem reembolso</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Motivo (opcional)</label>
                  <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={3} placeholder="Ex.: Conflito de agenda, emergência..." className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-rose-500/30" />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setCancelModal(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm">Voltar</button>
                  <button onClick={handleCancel} disabled={cancelLoading} className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2">
                    {cancelLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                    Confirmar cancelamento
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* RESCHEDULE MODAL */}
      {rescheduleModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 flex items-center gap-2"><RefreshCw size={18} className="text-blue-500" /> Remarcar consulta</h3>
              <button onClick={() => setRescheduleModal(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <p className="text-xs text-slate-500">Escolha um novo horário com o mesmo médico. Sem custo adicional.</p>
            {rescheduleSlots.length === 0 ? (
              <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
            ) : (
              <>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {rescheduleSlots.map((day) => {
                    const dayDate = parseLocalDate(day.date);
                    const weekday = dayDate.toLocaleDateString(locale, { weekday: "short" });
                    const dayNum = dayDate.getDate();
                    return (
                    <button key={day.date} onClick={() => { setRescheduleDay(day); setRescheduleSlot(""); }}
                      className={`shrink-0 flex flex-col items-center px-3 py-2 rounded-xl border-2 transition text-center ${rescheduleDay?.date === day.date ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}>
                      <span className="text-xs text-slate-500">{weekday}</span>
                      <span className="text-base font-bold text-slate-800">{dayNum}</span>
                    </button>
                    );
                  })}
                </div>
                {rescheduleDay && (
                  <div className="grid grid-cols-3 gap-2">
                    {rescheduleDay.slots.filter(s => s.available).map((slot) => (
                      <button key={slot.datetime} onClick={() => setRescheduleSlot(slot.datetime)}
                        className={`py-2 rounded-xl text-sm font-semibold border-2 transition ${rescheduleSlot === slot.datetime ? "bg-blue-500 border-blue-500 text-white" : "border-slate-200 hover:border-blue-400"}`}>
                        {slot.time}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setRescheduleModal(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm">Cancelar</button>
                  <button onClick={handleReschedule} disabled={!rescheduleSlot || rescheduleLoading} className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2">
                    {rescheduleLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    Confirmar reagendamento
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {reviewModal && (
        <ReviewPromptModal
          providerId={reviewModal.providerId}
          providerType={reviewModal.providerType}
          providerName={reviewModal.providerName}
          onClose={() => setReviewModal(null)}
        />
      )}
    </div>
  );
}

function ProAvatar({ pro, className = "w-14 h-14 rounded-2xl" }: { pro: Pick<Professional, "firstName" | "avatarUrl">; className?: string }) {
  if (pro.avatarUrl) {
    return <img src={pro.avatarUrl} alt="" className={`${className} object-cover shrink-0`} />;
  }
  return (
    <div className={`${className} bg-gradient-to-br from-blue-400 to-emerald-500 flex items-center justify-center text-2xl font-black text-white shrink-0`}>
      {pro.firstName[0]}
    </div>
  );
}

function DoctorCard({ pro, onSelect, locale, lang, t }: { pro: Professional; onSelect: () => void; locale: string; lang: Lang; t: (k: string) => string }) {
  const isAnalyst = pro.providerType === "psychoanalyst";
  const displayName = isAnalyst
    ? `${pro.firstName} ${pro.lastName}`
    : `Dr. ${pro.firstName} ${pro.lastName}`;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md hover:border-emerald-300 transition cursor-pointer" onClick={onSelect}>
      <div className="flex items-start gap-4">
        <ProAvatar pro={pro} />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900">{displayName}</p>
          <p className={`text-sm font-medium ${isAnalyst ? "text-violet-600" : "text-emerald-600"}`}>{getProfessionLabel(lang, pro.specialty)}</p>
          {isAnalyst && pro.trainingInstitution && (
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{pro.trainingInstitution}{pro.yearsOfPractice ? ` · ${pro.yearsOfPractice} ${t("pa.settings.years").toLowerCase()}` : ""}</p>
          )}
          {!isAnalyst && (
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-slate-500 flex items-center gap-1"><Star size={11} className="text-yellow-400 fill-yellow-400" /> {pro.rating}</span>
            {pro.clinicCity && <span className="text-xs text-slate-500 flex items-center gap-1"><MapPin size={11} /> {pro.clinicCity}</span>}
          </div>
          )}
          {isAnalyst && pro.clinicCity && (
            <span className="text-xs text-slate-500 flex items-center gap-1 mt-1"><MapPin size={11} /> {pro.clinicCity}</span>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="font-bold text-slate-900 text-base">
            {new Intl.NumberFormat(locale, { style: "currency", currency: pro.currency || "USD" }).format(pro.consultPrice / 100)}
          </p>
          <p className="text-xs text-slate-400">{t("appt.perConsult")}</p>
        </div>
      </div>
      {pro.bio && <p className="text-xs text-slate-500 mt-3 line-clamp-2">{pro.bio}</p>}
      <div className="flex items-center gap-2 mt-4">
        {pro.acceptsTeleconsult && <span className="flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-medium"><Video size={11} /> {t("appt.online")}</span>}
        {pro.acceptsInPerson && <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium"><Building2 size={11} /> {t("appt.inPerson")}</span>}
        <button className="ml-auto flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-800">{t("appt.book")} <ChevronRight size={13} /></button>
      </div>
    </div>
  );
}
