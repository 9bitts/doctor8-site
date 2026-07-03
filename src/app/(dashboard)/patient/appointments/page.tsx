"use client";

// src/app/(dashboard)/patient/appointments/page.tsx
// Full appointment booking flow with:
// - CDC cancellation policy checkbox at checkout
// - Cancel button with refund rules explained
// - Reschedule button (>24h only)
// - Onboarding tooltips on first use

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AppointmentsAnchorScroll from "@/components/AppointmentsAnchorScroll";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf, formatSlotCount, Lang } from "@/lib/i18n/translations";
import {
  filterDaysForPatientBooking,
  patientSlotButtonClass,
  dayHasVolunteerSlots,
  type BookableSlot,
} from "@/lib/appointment-slots";
import { getProfessionLabel, specialtyMatchesSearch, PSYCHOANALYSIS_SPECIALTY } from "@/lib/professions";
import { getProfessionInfo } from "@/lib/profession-label";
import { parseLocalDate } from "@/lib/scheduling";
import { useUserTimeZone } from "@/hooks/useUserTimeZone";
import {
  formatShortDate,
  formatShortDateWithYear,
  formatLongDate,
  formatAppointmentTimeWithLabel,
  dayChipFromInstant,
  refInstantFromDaySlots,
} from "@/lib/timezone";
import ShareHistoryPrompt from "@/components/ShareHistoryPrompt";
import ReviewPromptModal from "@/components/ReviewPromptModal";
import ConfirmAttendanceButton from "@/components/patient/ConfirmAttendanceButton";
import PushPermissionPrompt from "@/components/PushPermissionPrompt";
import AcuraVolunteerBadge from "@/components/acura/AcuraVolunteerBadge";
import { isAcuraVolunteerProvider, compareVolunteerFirst } from "@/lib/acura-volunteer";
import { isScheduledVolunteerAppointment } from "@/lib/scheduled-volunteer";
import {
  Calendar, Search, Video, Building2, Clock, ChevronRight, ChevronLeft,
  CreditCard, Loader2, CheckCircle2, AlertCircle, Star, MapPin, Lock,
  X, RefreshCw, AlertTriangle, Info, HelpCircle, QrCode, FileText, Heart, Radio,
} from "lucide-react";

type PaymentMethodChoice = "card" | "pix" | "boleto" | "all";

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
  acuraVolunteer?: boolean;
  verified?: boolean;
  isOnline?: boolean;
  jitSessionId?: string | null;
}

interface Appointment {
  id: string;
  scheduledAt: string;
  status: string;
  type: string;
  meetingUrl?: string;
  paidAt?: string;
  priceAmount?: number;
  bookingSource?: string | null;
  professionalId?: string;
  psychoanalystId?: string;
  providerType?: "health" | "psychoanalyst";
  patientConfirmedAt?: string | null;
  professional: { firstName: string; lastName: string; specialty: string };
}

interface SlotDay {
  date: string;
  label: string;
  slots: BookableSlot[];
}

const APPT_TIP_KEYS: Partial<Record<Step, string>> = {
  browse: "appt.tip.browse",
  slots: "appt.tip.slots",
  payment: "appt.tip.payment",
};

export default function AppointmentsPage() {
  const { t, lang } = useI18n();
  const locale = localeOf(lang);
  const userTz = useUserTimeZone();
  const searchParams = useSearchParams();
  const highlightApptId = searchParams.get("id");

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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodChoice>("all");
  const [checkoutPending, setCheckoutPending] = useState("");
  const [tcleGranted, setTcleGranted] = useState<boolean | null>(null);
  const [confirmedId, setConfirmedId]     = useState("");
  const [error, setError]                 = useState("");
  const [search, setSearch]               = useState("");
  const [specialty, setSpecialty]         = useState("All");
  const [volunteersOnly, setVolunteersOnly] = useState(false);
  const [type, setType]                   = useState<"TELECONSULT" | "IN_PERSON">("TELECONSULT");
  const [appointments, setAppointments]   = useState<Appointment[]>([]);
  const [pastAppointments, setPastAppointments] = useState<Appointment[]>([]);

  // CDC policy checkbox
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);

  // Cancel / reschedule modal
  const [cancelModal,     setCancelModal]     = useState<Appointment | null>(null);
  const [rescheduleModal, setRescheduleModal] = useState<Appointment | null>(null);
  const [cancelReason,    setCancelReason]    = useState("");
  const [cancelLoading,   setCancelLoading]   = useState(false);
  const [cancelResult,    setCancelResult]    = useState<{ refunded: boolean; hoursUntil: number } | null>(null);
  const [cancelError,     setCancelError]     = useState<string | null>(null);
  const [rescheduleSlots, setRescheduleSlots] = useState<SlotDay[]>([]);
  const [rescheduleDay,   setRescheduleDay]   = useState<SlotDay | null>(null);
  const [rescheduleSlot,  setRescheduleSlot]  = useState<string>("");
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [rescheduleSlotsLoading, setRescheduleSlotsLoading] = useState(false);
  const [rescheduleSlotsError, setRescheduleSlotsError] = useState(false);

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
  const [reviewedProIds, setReviewedProIds] = useState<Set<string>>(new Set());
  const [reviewedPaIds, setReviewedPaIds] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);

  const [bookingSource, setBookingSource] = useState<
    "patient_panel" | "public_profile" | "public_search" | "public_embed" | "referral"
  >("patient_panel");
  const [providerPlans, setProviderPlans] = useState<{ slug: string; name: string }[]>([]);
  const [providerServices, setProviderServices] = useState<{ id: string; name: string; priceCents: number | null; currency: string }[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [healthPlanSlug, setHealthPlanSlug] = useState("particular");
  const [visitReason, setVisitReason] = useState("");

  useEffect(() => { fetchProfessionals(); fetchAppointments(); fetchPastAppointments(); fetchReviewStatus(); }, []);
  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => { if (s?.user?.id) setUserId(s.user.id); })
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (step !== "payment" || stripeLoaded || paymentMethod !== "card") return;
    const meta =
      selectedDay?.slots.find((s) => s.datetime === selectedSlot) ??
      slots.flatMap((d) => d.slots).find((s) => s.datetime === selectedSlot);
    if (meta?.volunteerOnly) return;
    loadStripe();
  }, [step, paymentMethod, selectedSlot, selectedDay, slots, stripeLoaded]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (params.get("checkout") !== "success" || !sessionId) return;

    (async () => {
      setPayLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/payments/checkout-consultation/confirm?session_id=${sessionId}`);
        const data = await res.json();
        if (data.status === "confirmed" && data.appointmentId) {
          setConfirmedId(data.appointmentId);
          setStep("confirmed");
          fetchAppointments();
        } else if (data.status === "pending") {
          setCheckoutPending(data.message || t("appt.paymentPending"));
          setStep("payment");
        } else {
          setError(data.error || t("appt.errNotConfirmed"));
        }
      } catch {
        setError(t("appt.errGeneric"));
      } finally {
        setPayLoading(false);
        window.history.replaceState({}, "", "/patient/appointments");
      }
    })();
  }, []);
  useEffect(() => {
    fetch("/api/consent/telemedicine-tcle")
      .then((r) => r.json())
      .then((d) => setTcleGranted(!!d.granted))
      .catch(() => setTcleGranted(false));
  }, []);
  useEffect(() => { setShowTip(true); }, [step]);

  function requireTcleForTeleconsult(): boolean {
    if (type !== "TELECONSULT") return true;
    if (tcleGranted === null) return true;
    if (tcleGranted) return true;
    window.location.href = `/patient/tcle?returnUrl=${encodeURIComponent("/patient/appointments")}`;
    return false;
  }

  function goToPayment() {
    if (!requireTcleForTeleconsult()) return;
    setStep("payment");
  }

  // Deep link: /patient/appointments?pro=ID&providerType=...&slot=...&from=public_profile
  useEffect(() => {
    if (professionals.length === 0 || selectedPro) return;
    const params = new URLSearchParams(window.location.search);
    const proId = params.get("pro");
    if (!proId) return;
    const providerType = params.get("providerType") || undefined;
    const from = params.get("from");
    if (from === "public_profile" || from === "public_search" || from === "public_embed") {
      setBookingSource(from);
    } else if (from === "referral") {
      setBookingSource("referral");
    }
    const pro = professionals.find((p) =>
      p.id === proId && (!providerType || p.providerType === providerType)
    );
    if (pro) selectProfessional(pro, params.get("slot") || undefined, params.get("service") || undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [professionals]);

  // Deep link: /patient/appointments?confirm=APPT_ID (from 24h email)
  useEffect(() => {
    const confirmId = searchParams.get("confirm");
    if (!confirmId) return;
    (async () => {
      let ok = false;
      try {
        const res = await fetch(`/api/appointments/${confirmId}/confirm-attendance`, { method: "POST" });
        ok = res.ok;
        if (ok) await fetchAppointments();
      } finally {
        const url = new URL(window.location.href);
        url.searchParams.delete("confirm");
        if (ok) url.searchParams.set("attendanceConfirmed", "1");
        window.history.replaceState({}, "", url.pathname + url.search);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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

  async function fetchPastAppointments() {
    const res = await fetch("/api/appointments?status=COMPLETED");
    const d = await res.json();
    const past = (d.appointments || []).filter(
      (a: Appointment) => new Date(a.scheduledAt).getTime() < Date.now()
    );
    setPastAppointments(past.slice(0, 5));
  }

  async function fetchReviewStatus() {
    try {
      const res = await fetch("/api/patient/reviews");
      if (!res.ok) return;
      const d = await res.json();
      setReviewedProIds(new Set(d.professionalIds || []));
      setReviewedPaIds(new Set(d.psychoanalystIds || []));
    } catch { /* silent */ }
  }

  function hasReviewForAppointment(apt: Appointment): boolean {
    const providerType = apt.providerType ?? (apt.psychoanalystId ? "psychoanalyst" : "health");
    const providerId =
      providerType === "psychoanalyst"
        ? apt.psychoanalystId || apt.professionalId
        : apt.professionalId || apt.psychoanalystId;
    if (!providerId) return true;
    return providerType === "psychoanalyst"
      ? reviewedPaIds.has(providerId)
      : reviewedProIds.has(providerId);
  }

  function openReviewForAppointment(apt: Appointment) {
    const providerType = apt.providerType ?? (apt.psychoanalystId ? "psychoanalyst" : "health");
    const providerId =
      providerType === "psychoanalyst"
        ? apt.psychoanalystId || apt.professionalId
        : apt.professionalId || apt.psychoanalystId;
    if (!providerId) return;
    const prefix = providerType === "psychoanalyst" ? "" : "Dr. ";
    setReviewModal({
      providerId,
      providerType,
      providerName: `${prefix}${apt.professional?.firstName || ""} ${apt.professional?.lastName || ""}`.trim(),
    });
  }

  async function rebookFromPast(apt: Appointment) {
    const proId = apt.professionalId || apt.psychoanalystId;
    const providerType = apt.providerType || (apt.psychoanalystId ? "psychoanalyst" : "health");
    if (!proId) return;

    let pro = professionals.find(
      (p) => p.id === proId && (p.providerType || "health") === providerType
    );

    if (!pro) {
      const res = await fetch(
        `/api/professionals/${proId}?providerType=${providerType}`
      );
      if (res.ok) {
        const data = await res.json();
        const p = data.professional;
        if (p) {
          pro = {
            ...p,
            providerType,
            rating: 4.8,
          };
        }
      }
    }

    if (pro) {
      setBookingSource("patient_panel");
      selectProfessional(pro);
    }
  }

  useEffect(() => {
    if (selectedPro && step === "slots") {
      loadSlots(selectedPro, selectedSlot || undefined, healthPlanSlug);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volunteersOnly]);

  async function loadSlots(
    pro: Professional,
    preselectSlot?: string,
    planSlug?: string
  ) {
    setSlotsLoading(true);
    try {
      const providerType = pro.providerType || "health";
      const planParam =
        planSlug && planSlug !== "particular"
          ? `&healthPlan=${encodeURIComponent(planSlug)}`
          : "";
      const slotsRes = await fetch(
        `/api/professionals/${pro.id}/slots?lang=${lang}&providerType=${providerType}${planParam}`
      );
      const d = await slotsRes.json();
      const rawDays = (d.days || []) as SlotDay[];
      const days = filterDaysForPatientBooking(rawDays, { volunteersOnly });
      setSlots(days);
      if (days.length > 0) {
        const dayWithSlot = preselectSlot
          ? days.find((day: SlotDay) =>
              day.slots.some((s) => s.datetime === preselectSlot && s.available)
            )
          : null;
        const day = dayWithSlot ?? days[0];
        setSelectedDay(day);
        if (
          preselectSlot &&
          day.slots.some(
            (s: SlotDay["slots"][number]) => s.datetime === preselectSlot && s.available
          )
        ) {
          setSelectedSlot(preselectSlot);
        } else {
          setSelectedSlot("");
        }
      } else {
        setSelectedDay(null);
        setSelectedSlot("");
      }
    } finally {
      setSlotsLoading(false);
    }
  }

  async function selectProfessional(pro: Professional, preselectSlot?: string, preselectService?: string) {
    setSelectedPro(pro);
    setStep("slots");
    setSelectedDay(null);
    setSelectedSlot("");
    setVisitReason("");
    setHealthPlanSlug("particular");
    setProviderPlans([]);
    setProviderServices([]);
    setSelectedServiceId("");
    setSlotsLoading(true);
    try {
      const providerType = pro.providerType || "health";
      const [plansRes, servicesRes] = await Promise.all([
        fetch(`/api/professionals/${pro.id}/health-plans?providerType=${providerType}`),
        fetch(`/api/professionals/${pro.id}/services?providerType=${providerType}`),
      ]);
      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setProviderPlans(plansData.plans || []);
      }
      let services: typeof providerServices = [];
      if (servicesRes.ok) {
        const servicesData = await servicesRes.json();
        services = servicesData.services || [];
        setProviderServices(services);
      }
      if (preselectService && services.some((s) => s.id === preselectService)) {
        setSelectedServiceId(preselectService);
      }
      await loadSlots(pro, preselectSlot, "particular");
    } finally { setSlotsLoading(false); }
  }

  async function onHealthPlanChange(slug: string) {
    setHealthPlanSlug(slug);
    if (selectedPro) await loadSlots(selectedPro, undefined, slug);
  }

  async function handleCheckoutPayment(method: PaymentMethodChoice) {
    if (!selectedPro || !selectedSlot || !acceptedPolicy) return;
    if (!requireTcleForTeleconsult()) return;
    setPayLoading(true); setError(""); setCheckoutPending("");
    try {
      const selectedService = providerServices.find((s) => s.id === selectedServiceId);
      const selectedPlan =
        healthPlanSlug === "particular"
          ? { slug: "particular", name: t("appt.healthPlanPrivate") }
          : providerPlans.find((p) => p.slug === healthPlanSlug) ?? {
              slug: healthPlanSlug,
              name: healthPlanSlug,
            };

      const res = await fetch("/api/payments/checkout-consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerType: selectedPro.providerType || "health",
          professionalId: selectedPro.providerType === "health" ? selectedPro.id : undefined,
          psychoanalystId: selectedPro.providerType === "psychoanalyst" ? selectedPro.id : undefined,
          scheduledAt: selectedSlot,
          type,
          paymentMethod: method,
          acceptedCancellationPolicy: acceptedPolicy,
          bookingSource,
          visitReason: visitReason.trim() || undefined,
          healthPlanSlug: selectedPlan.slug,
          healthPlanLabel: selectedPlan.name,
          ...(selectedServiceId && selectedService
            ? { serviceId: selectedServiceId, serviceName: selectedService.name }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.general?.[0] || data.error || t("appt.errInitPayment"));
        return;
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch {
      setError(t("appt.errGeneric"));
    } finally {
      setPayLoading(false);
    }
  }

  async function handlePayment() {
    if (!selectedPro || !selectedSlot || !stripeRef.current || !cardElementRef.current || !acceptedPolicy) return;
    if (!requireTcleForTeleconsult()) return;
    setPayLoading(true); setError("");
    try {
      const selectedService = providerServices.find((s) => s.id === selectedServiceId);

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
          ...(selectedServiceId ? { serviceId: selectedServiceId } : {}),
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
        const selectedPlan =
          healthPlanSlug === "particular"
            ? { slug: "particular", name: t("appt.healthPlanPrivate") }
            : providerPlans.find((p) => p.slug === healthPlanSlug) ?? {
                slug: healthPlanSlug,
                name: healthPlanSlug,
              };

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
            visitReason: visitReason.trim() || undefined,
            healthPlanSlug: selectedPlan.slug,
            healthPlanLabel: selectedPlan.name,
            ...(selectedServiceId && selectedService
              ? { serviceId: selectedServiceId, serviceName: selectedService.name }
              : {}),
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

  async function handleVolunteerBooking() {
    if (!selectedPro || !selectedSlot || !acceptedPolicy) return;
    if (!requireTcleForTeleconsult()) return;
    setPayLoading(true);
    setError("");
    try {
      const selectedService = providerServices.find((s) => s.id === selectedServiceId);
      const selectedPlan =
        healthPlanSlug === "particular"
          ? { slug: "particular", name: t("appt.healthPlanPrivate") }
          : providerPlans.find((p) => p.slug === healthPlanSlug) ?? {
              slug: healthPlanSlug,
              name: healthPlanSlug,
            };

      const res = await fetch("/api/appointments/volunteer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerType: selectedPro.providerType || "health",
          professionalId: selectedPro.providerType === "health" ? selectedPro.id : undefined,
          psychoanalystId: selectedPro.providerType === "psychoanalyst" ? selectedPro.id : undefined,
          scheduledAt: selectedSlot,
          type,
          acceptedCancellationPolicy: acceptedPolicy,
          bookingSource,
          visitReason: visitReason.trim() || undefined,
          healthPlanSlug: selectedPlan.slug,
          healthPlanLabel: selectedPlan.name,
          ...(selectedServiceId && selectedService
            ? { serviceId: selectedServiceId, serviceName: selectedService.name }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.general?.[0] || t("appt.errNotConfirmed"));
        return;
      }
      setConfirmedId(data.appointmentId);
      setStep("confirmed");
      fetchAppointments();
    } catch {
      setError(t("appt.errGeneric"));
    } finally {
      setPayLoading(false);
    }
  }

  async function handleCancel() {
    if (!cancelModal) return;
    setCancelLoading(true);
    setCancelError(null);
    try {
      const res  = await fetch(`/api/appointments/${cancelModal.id}/cancel`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ reason: cancelReason || "Patient requested" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCancelError(typeof data.error === "string" && data.error ? data.error : t("appt.cancelError"));
        return;
      }
      setCancelResult({ refunded: data.refunded === true, hoursUntil: data.hoursUntil });
      fetchAppointments();
    } catch {
      setCancelError(t("appt.cancelError"));
    } finally {
      setCancelLoading(false);
    }
  }

  async function handleReschedule() {
    if (!rescheduleModal || !rescheduleSlot) return;
    setRescheduleLoading(true);
    setRescheduleError(null);
    try {
      const res = await fetch(`/api/appointments/${rescheduleModal.id}/reschedule`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ newScheduledAt: rescheduleSlot }),
      });
      if (res.ok) {
        setRescheduleModal(null);
        setRescheduleSlot("");
        fetchAppointments();
      } else {
        setRescheduleError(res.status === 409 ? t("appt.rescheduleSlotTaken") : t("appt.rescheduleError"));
      }
    } catch {
      setRescheduleError(t("appt.rescheduleError"));
    } finally {
      setRescheduleLoading(false);
    }
  }

  async function openReschedule(apt: Appointment) {
    setRescheduleModal(apt);
    setRescheduleError(null);
    setRescheduleSlotsError(false);
    setRescheduleSlots([]);
    setRescheduleDay(null);
    setRescheduleSlot("");
    const proId = (apt as any).professionalId || (apt as any).psychoanalystId;
    const providerType = (apt as any).providerType === "psychoanalyst" ? "psychoanalyst" : "health";
    if (!proId) { setRescheduleSlotsError(true); return; }
    setRescheduleSlotsLoading(true);
    try {
      const res  = await fetch(`/api/professionals/${proId}/slots?lang=${lang}&providerType=${providerType}`);
      if (!res.ok) { setRescheduleSlotsError(true); return; }
      const d    = await res.json();
      const days = (d.days || []).filter((day: SlotDay) => day.slots.some((s) => s.available));
      setRescheduleSlots(days);
      if (days.length > 0) setRescheduleDay(days[0]);
    } catch {
      setRescheduleSlotsError(true);
    } finally {
      setRescheduleSlotsLoading(false);
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
    const matchVolunteer = !volunteersOnly || isAcuraVolunteerProvider(!!p.verified, !!p.acuraVolunteer);
    return matchSearch && matchSpec && matchVolunteer;
  }).sort(compareVolunteerFirst);

  const volunteerPros = filtered.filter((p) => isAcuraVolunteerProvider(!!p.verified, !!p.acuraVolunteer));
  const otherPros = filtered.filter((p) => !isAcuraVolunteerProvider(!!p.verified, !!p.acuraVolunteer));
  const showVolunteerSection = volunteerPros.length > 0 && step === "browse" && !volunteersOnly;
  const needsHistoryNotice = selectedPro?.providerType !== "psychoanalyst";
  const slotsShowVolunteerLegend = dayHasVolunteerSlots(slots);

  const selectedSlotMeta =
    selectedDay?.slots.find((s) => s.datetime === selectedSlot) ??
    slots.flatMap((d) => d.slots).find((s) => s.datetime === selectedSlot);
  const selectedSlotIsVolunteer = !!selectedSlotMeta?.volunteerOnly && !!selectedSlotMeta?.available;

  const selectedService = providerServices.find((s) => s.id === selectedServiceId);
  const checkoutPriceCents = selectedService?.priceCents ?? selectedPro?.consultPrice ?? 0;
  const checkoutCurrency = selectedService?.currency || selectedPro?.currency || "USD";
  const isBrlCheckout = checkoutCurrency.toUpperCase() === "BRL";

  const priceDisplay = selectedPro
    ? new Intl.NumberFormat(locale, { style: "currency", currency: checkoutCurrency }).format(checkoutPriceCents / 100)
    : "";

  const usesHostedCheckout = isBrlCheckout && paymentMethod !== "card" && !selectedSlotIsVolunteer;
  const canPay = selectedSlotIsVolunteer
    ? acceptedPolicy
    : acceptedPolicy && (usesHostedCheckout || (stripeLoaded && cardComplete));
  const summaryPriceLabel = selectedSlotIsVolunteer ? t("appt.volunteerFreeTotal") : priceDisplay;

  // Tips per step
  const tipKey = step === "payment" ? APPT_TIP_KEYS.payment : APPT_TIP_KEYS[step];
  const tipText = tipKey ? t(tipKey) : "";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <AppointmentsAnchorScroll queryId={highlightApptId} ready={!loading} />

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 break-words">{t("appt.title")}</h1>
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

      {step === "browse" && (
        <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-sky-900">{t("acura.vol.bookingBannerTitle")}</p>
            <p className="text-xs text-sky-800 mt-1 leading-relaxed">{t("acura.vol.bookingBannerText")}</p>
            {volunteersOnly && (
              <p className="text-xs font-medium text-green-800 mt-2">{t("acura.vol.filterActiveHint")}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setVolunteersOnly((v) => !v)}
            className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold transition border ${
              volunteersOnly
                ? "bg-sky-600 text-white border-sky-600"
                : "bg-white text-sky-800 border-sky-300 hover:bg-sky-100"
            }`}
          >
            {t("acura.vol.filter")}
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
              const within48h = hoursUntil > 0 && hoursUntil <= 48;
              const isVolunteerAppt = isScheduledVolunteerAppointment(apt);
              return (
                <div key={apt.id} id={`appt-${apt.id}`} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm flex-wrap scroll-mt-24">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 truncate flex items-center gap-2 flex-wrap">
                      Dr. {apt.professional?.firstName} {apt.professional?.lastName}
                      {isVolunteerAppt && (
                        <span className="text-[10px] font-bold uppercase tracking-wide bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                          {t("volAppt.badge")}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500">{getProfessionLabel(lang, apt.professional?.specialty)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-emerald-700">
                      {formatShortDate(new Date(apt.scheduledAt), userTz, locale)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatAppointmentTimeWithLabel(new Date(apt.scheduledAt), userTz, locale)}
                    </p>
                  </div>
                  <ConfirmAttendanceButton
                    appointmentId={apt.id}
                    confirmed={!!apt.patientConfirmedAt}
                    within48h={within48h}
                    compact
                    onConfirmed={fetchAppointments}
                  />
                  <div className="flex gap-2 shrink-0">
                    {apt.type === "TELECONSULT" && apt.status === "CONFIRMED" && (
                      <a href={`/video/${apt.id}`} className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold px-3 py-2 rounded-lg transition">
                        <Video size={13} /> {t("appt.join")}
                      </a>
                    )}
                    {canReschedule && (
                      <button onClick={() => openReschedule(apt)} className="flex items-center gap-1 text-xs text-blue-600 border border-blue-200 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition">
                        <RefreshCw size={12} /> {t("appt.rescheduleBtn")}
                      </button>
                    )}
                    {canCancel && (
                      <button onClick={() => { setCancelModal(apt); setCancelResult(null); setCancelReason(""); setCancelError(null); }} className="flex items-center gap-1 text-xs text-rose-600 border border-rose-200 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition">
                        <X size={12} /> {t("appt.cancelBtn")}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {pastAppointments.length > 0 && step === "browse" && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <RefreshCw size={15} /> {t("appt.rebookTitle")}
          </p>
          <div className="space-y-2">
            {pastAppointments.map((apt) => (
              <div
                key={apt.id}
                className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm flex-wrap"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {apt.providerType === "psychoanalyst"
                      ? `${apt.professional?.firstName} ${apt.professional?.lastName}`
                      : `Dr. ${apt.professional?.firstName} ${apt.professional?.lastName}`}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatShortDateWithYear(new Date(apt.scheduledAt), userTz, locale)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => rebookFromPast(apt)}
                  className="flex items-center gap-1 text-xs font-semibold text-brand-600 border border-brand-200 hover:bg-brand-50 px-3 py-2 rounded-lg transition"
                >
                  <Calendar size={13} /> {t("appt.rebookCta")}
                </button>
                {!hasReviewForAppointment(apt) && (
                  <button
                    type="button"
                    onClick={() => openReviewForAppointment(apt)}
                    className="flex items-center gap-1 text-xs font-semibold text-amber-700 border border-amber-200 hover:bg-amber-50 px-3 py-2 rounded-lg transition"
                  >
                    <Star size={13} /> {t("appt.rateCta")}
                  </button>
                )}
              </div>
            ))}
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
              <button
                type="button"
                onClick={() => setVolunteersOnly((v) => !v)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition border ${volunteersOnly ? "bg-sky-500 text-white border-sky-500" : "bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100"}`}
              >
                {t("acura.vol.filter")}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-slate-400" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-slate-500 mb-2">{t("appt.noDoctors")}</p>
              <p className="text-xs text-slate-400">{t("appt.noDoctorsHint")}</p>
            </div>
          ) : volunteersOnly ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {filtered.map((pro) => (
                <DoctorCard key={`${pro.providerType || "health"}-${pro.id}`} pro={pro} onSelect={() => selectProfessional(pro)} locale={locale} lang={lang} t={t} />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {showVolunteerSection && (
                <div className="space-y-3">
                  <p className="text-sm font-bold text-sky-800 flex items-center gap-2">
                    <Heart size={16} className="text-sky-600" />
                    {t("acura.vol.volunteersSectionTitle")}
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {volunteerPros.map((pro) => (
                      <DoctorCard key={`${pro.providerType || "health"}-${pro.id}`} pro={pro} onSelect={() => selectProfessional(pro)} locale={locale} lang={lang} t={t} />
                    ))}
                  </div>
                </div>
              )}
              {otherPros.length > 0 && (
                <div className="space-y-3">
                  {showVolunteerSection && (
                    <p className="text-sm font-semibold text-slate-700">{t("acura.vol.otherProfessionalsTitle")}</p>
                  )}
                  <div className="grid sm:grid-cols-2 gap-4">
                    {otherPros.map((pro) => (
                      <DoctorCard key={`${pro.providerType || "health"}-${pro.id}`} pro={pro} onSelect={() => selectProfessional(pro)} locale={locale} lang={lang} t={t} />
                    ))}
                  </div>
                </div>
              )}
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
              {isAcuraVolunteerProvider(!!selectedPro.verified, !!selectedPro.acuraVolunteer) && (
                <div className="mt-2">
                  <AcuraVolunteerBadge />
                </div>
              )}
              <p className="text-emerald-400 font-semibold text-sm mt-1">{priceDisplay} {t("appt.perConsult")}</p>
            </div>
          </div>
          <div className="p-6 space-y-6">
            {(providerPlans.length > 0) && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t("appt.healthPlanLabel")}
                </label>
                <select
                  value={healthPlanSlug}
                  onChange={(e) => onHealthPlanChange(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  <option value="particular">{t("appt.healthPlanPrivate")}</option>
                  {providerPlans.map((plan) => (
                    <option key={plan.slug} value={plan.slug}>{plan.name}</option>
                  ))}
                </select>
              </div>
            )}
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
                      const ref = refInstantFromDaySlots(day.slots);
                      const chip = ref
                        ? dayChipFromInstant(ref, userTz, locale)
                        : { weekday: parseLocalDate(day.date).toLocaleDateString(locale, { weekday: "short", timeZone: userTz }), dayNum: String(parseLocalDate(day.date).getDate()) };
                      return (
                        <button key={day.date} onClick={() => { setSelectedDay(day); setSelectedSlot(""); }}
                          className={`shrink-0 flex flex-col items-center px-4 py-3 rounded-xl border-2 transition ${selectedDay?.date === day.date ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-slate-300"}`}>
                          <span className="text-xs text-slate-500 font-medium">{chip.weekday}</span>
                          <span className="text-lg font-bold text-slate-800 mt-0.5">{chip.dayNum}</span>
                          <span className="text-xs text-emerald-600 font-semibold mt-1">{formatSlotCount(lang, avail)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {selectedDay && (
                  <div key={selectedDay.date}>
                    <p className="text-sm font-semibold text-slate-700 mb-3">{selectedDay.label} — {t("appt.availableTimes")}</p>
                    {slotsShowVolunteerLegend && (
                      <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-3">
                        {t("appt.volunteerSlotLegend")}
                      </p>
                    )}
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {selectedDay.slots.map((slot) => (
                        <button
                          key={slot.datetime}
                          disabled={!slot.available}
                          onClick={() => setSelectedSlot(slot.datetime)}
                          className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition ${patientSlotButtonClass(slot, selectedSlot === slot.datetime)}`}
                        >
                          {formatAppointmentTimeWithLabel(new Date(slot.datetime), userTz, locale)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {selectedSlot && needsHistoryNotice && (
                  <BookingHistoryNotice t={t} />
                )}
                {selectedSlot && (
                  <button type="button" onClick={goToPayment} className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-4 px-4 rounded-xl transition text-base">
                    {selectedSlotIsVolunteer ? t("appt.continueVolunteerBooking") : t("appt.continueToPayment")}{" "}
                    <ChevronRight size={18} className="shrink-0" />
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
          <h2 className="font-bold text-slate-900 text-lg">
            {selectedSlotIsVolunteer ? t("appt.volunteerBookingTitle") : t("appt.completePayment")}
          </h2>

          {selectedSlotIsVolunteer && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
              {t("appt.volunteerBookingIntro")}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
              <AlertCircle size={16} className="shrink-0" /> {error}
            </div>
          )}

          {checkoutPending && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-sm">
              <AlertTriangle size={16} className="shrink-0" /> {checkoutPending}
            </div>
          )}

          {needsHistoryNotice && (
            <BookingHistoryNotice t={t} />
          )}

          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">{t("appt.orderSummary")}</p>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">{t("appt.consultWith")} {selectedPro.lastName}</span>
              <span className="font-semibold">{summaryPriceLabel}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">{t("appt.date")}</span>
              <span>{formatShortDateWithYear(new Date(selectedSlot), userTz, locale)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">{t("appt.time")}</span>
              <span>{formatAppointmentTimeWithLabel(new Date(selectedSlot), userTz, locale)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">{t("appt.type")}</span>
              <span>{type === "TELECONSULT" ? t("appt.teleconsult") : t("appt.inPersonType")}</span>
            </div>
            <div className="border-t border-slate-200 mt-3 pt-3 flex justify-between font-bold text-slate-900">
              <span>{t("appt.total")}</span>
              <span className={selectedSlotIsVolunteer ? "text-green-700" : ""}>{summaryPriceLabel}</span>
            </div>
          </div>

          <div className="space-y-4 border-t border-slate-100 pt-4">
            <p className="text-sm font-semibold text-slate-800">{t("appt.preConsultTitle")}</p>
            <p className="text-xs text-slate-500">{t("appt.preConsultHint")}</p>

            {providerServices.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t("appt.serviceLabel")}
                </label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  <option value="">{t("appt.serviceDefault")}</option>
                  {providerServices.map((svc) => (
                    <option key={svc.id} value={svc.id}>{svc.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {t("appt.healthPlanLabel")}
              </label>
              <select
                value={healthPlanSlug}
                onChange={(e) => setHealthPlanSlug(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              >
                <option value="particular">{t("appt.healthPlanPrivate")}</option>
                {providerPlans.map((plan) => (
                  <option key={plan.slug} value={plan.slug}>{plan.name}</option>
                ))}
              </select>
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
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
          </div>

          {/* Cancellation policy info */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
              <AlertTriangle size={14} /> {t("appt.cancelPolicyTitle")}
            </p>
            <ul className="text-xs text-amber-700 space-y-1 ml-5 list-disc">
              <li>{t("appt.refundOver24")}</li>
              <li>{t("appt.refundUnder24")}</li>
              <li>{t("appt.cancelPolicyCdc")}</li>
              <li>{t("appt.cancelPolicyDoctorNoShow")}</li>
            </ul>
          </div>

          {isBrlCheckout && !selectedSlotIsVolunteer && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-700">{t("appt.paymentMethodLabel")}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {([
                  { id: "all" as const, label: t("appt.payAllMethods"), icon: CreditCard },
                  { id: "card" as const, label: t("appt.payCard"), icon: CreditCard },
                  { id: "pix" as const, label: t("appt.payPix"), icon: QrCode },
                  { id: "boleto" as const, label: t("appt.payBoleto"), icon: FileText },
                ]).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPaymentMethod(opt.id)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition ${
                      paymentMethod === opt.id
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <opt.icon size={18} />
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500">{t("appt.brlPaymentHint")}</p>
            </div>
          )}

          {!usesHostedCheckout && !selectedSlotIsVolunteer && (
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
          )}

          {usesHostedCheckout && !selectedSlotIsVolunteer && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
              <p className="font-medium">{t("appt.checkoutRedirect")}</p>
            </div>
          )}

          {/* CDC policy checkbox — mandatory */}
          <label className="flex items-start gap-3 cursor-pointer p-3 bg-slate-50 rounded-xl border border-slate-200">
            <input
              type="checkbox"
              checked={acceptedPolicy}
              onChange={(e) => setAcceptedPolicy(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded accent-emerald-500"
            />
            <span className="text-xs text-slate-600 leading-relaxed">
              <strong className="text-slate-800">{t("appt.acceptCancelPolicyBold")}</strong>{" "}
              {t("appt.acceptCancelPolicyText")}{" "}
              <a href="/terms" target="_blank" className="text-emerald-600 underline">{t("appt.termsOfUse")}</a>.
            </span>
          </label>

          {!acceptedPolicy && (
            <p className="text-xs text-amber-600 flex items-center gap-1.5">
              <HelpCircle size={13} /> {t("appt.acceptPolicyRequired")}
            </p>
          )}

          <button
            onClick={() => (selectedSlotIsVolunteer ? handleVolunteerBooking() : usesHostedCheckout ? handleCheckoutPayment(paymentMethod) : handlePayment())}
            disabled={payLoading || !canPay}
            className={`w-full flex items-center justify-center gap-2 text-white font-bold py-4 rounded-xl transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-base ${
              selectedSlotIsVolunteer
                ? "bg-gradient-to-r from-green-700 to-green-500"
                : "bg-gradient-to-r from-slate-800 to-emerald-600"
            }`}
          >
            {payLoading ? <Loader2 size={18} className="animate-spin" /> : selectedSlotIsVolunteer ? <CheckCircle2 size={18} /> : <Lock size={18} />}
            {payLoading
              ? t("appt.processing")
              : selectedSlotIsVolunteer
                ? t("appt.confirmVolunteerBooking")
                : `${t("appt.pay")} ${priceDisplay}`}
          </button>

          {!selectedSlotIsVolunteer && (
          <p className="text-xs text-slate-400 text-center flex items-center justify-center gap-1">
            <Lock size={11} /> {t("appt.securedBy")}
          </p>
          )}
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
            <p className="font-semibold flex items-center gap-2"><Info size={14} /> {t("appt.whatHappensNow")}</p>
            <ul className="ml-5 list-disc space-y-1 text-xs mt-2">
              <li>{t("appt.confirmedStep1")}</li>
              <li>{t("appt.confirmedStep2")}</li>
              <li>{t("appt.confirmedStep3")}</li>
              <li>{t("appt.confirmedStep4")}</li>
            </ul>
          </div>
          <div className="bg-slate-50 rounded-xl p-5 text-sm space-y-2 text-left">
            <div className="flex justify-between">
              <span className="text-slate-500">{t("appt.doctor")}</span>
              <span className="font-semibold">Dr. {selectedPro.firstName} {selectedPro.lastName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t("appt.date")}</span>
              <span className="font-semibold">{formatLongDate(new Date(selectedSlot), userTz, locale)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t("appt.time")}</span>
              <span className="font-semibold">{formatAppointmentTimeWithLabel(new Date(selectedSlot), userTz, locale)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t("appt.amountPaid")}</span>
              <span className={`font-semibold ${selectedSlotIsVolunteer ? "text-green-700" : "text-emerald-600"}`}>
                {selectedSlotIsVolunteer ? t("appt.volunteerFreeTotal") : priceDisplay}
              </span>
            </div>
          </div>
          {selectedPro.providerType !== "psychoanalyst" && (
            <ShareHistoryPrompt
              professionalId={selectedPro.id}
              professionalName={`Dr. ${selectedPro.firstName} ${selectedPro.lastName}`}
            />
          )}
          {confirmedId && (
            <a
              href={`/api/appointments/${confirmedId}/calendar`}
              className="inline-flex items-center justify-center gap-2 w-full border-2 border-brand-500 text-brand-600 font-semibold py-3 rounded-xl hover:bg-brand-50 transition"
            >
              <Calendar size={18} />
              {t("appt.addToCalendar")}
            </a>
          )}
          <p className="text-sm text-slate-500">{t("appt.emailSent")}</p>
          {userId && <PushPermissionPrompt context="booking" userId={userId} />}
          <button onClick={resetFlow} className="w-full bg-slate-900 text-white font-semibold py-3.5 rounded-xl hover:bg-slate-700 transition">
            {t("appt.backToAppts")}
          </button>
        </div>
      )}

      {/* CANCEL MODAL */}
      {cancelModal && (() => {
        const cancelIsVolunteer = isScheduledVolunteerAppointment(cancelModal);
        return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            {cancelResult ? (
              <>
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${cancelResult.refunded ? "bg-emerald-100" : "bg-amber-100"}`}>
                  {cancelResult.refunded ? <CheckCircle2 size={28} className="text-emerald-500" /> : <AlertTriangle size={28} className="text-amber-500" />}
                </div>
                <h3 className="font-bold text-slate-900 text-center text-lg">{t("appt.cancelDoneTitle")}</h3>
                {cancelIsVolunteer ? (
                  <p className="text-sm text-emerald-700 text-center bg-emerald-50 rounded-xl p-3">
                    {t("volAppt.cancelDone")}
                  </p>
                ) : cancelResult.refunded ? (
                  <p className="text-sm text-emerald-700 text-center bg-emerald-50 rounded-xl p-3">
                    ✅ {t("appt.cancelRefundOk")}
                  </p>
                ) : (
                  <p className="text-sm text-amber-700 text-center bg-amber-50 rounded-xl p-3">
                    ⚠️ {t("appt.cancelNoRefund")}
                  </p>
                )}
                <button onClick={() => { setCancelModal(null); setCancelResult(null); }} className="w-full py-3 rounded-xl bg-slate-900 text-white font-semibold">{t("appt.close")}</button>
              </>
            ) : (
              <>
                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                  <AlertTriangle size={20} className="text-rose-500" /> {t("appt.cancelTitle")}
                </h3>
                {!cancelIsVolunteer && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 space-y-1">
                    <p className="font-semibold">{t("appt.refundPolicyTitle")}</p>
                    <p>• {t("appt.refundOver24")}</p>
                    <p>• {t("appt.refundUnder24")}</p>
                  </div>
                )}
                {cancelIsVolunteer && (
                  <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3">
                    {t("volAppt.cancelConfirmHint")}
                  </p>
                )}
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">{t("appt.cancelReasonLabel")}</label>
                  <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={3} placeholder={t("appt.cancelReasonPlaceholder")} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-rose-500/30" />
                </div>
                {cancelError && (
                  <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3">{cancelError}</p>
                )}
                <div className="flex gap-3">
                  <button onClick={() => { setCancelModal(null); setCancelError(null); }} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm">{t("appt.back")}</button>
                  <button onClick={handleCancel} disabled={cancelLoading} className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2">
                    {cancelLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                    {t("appt.confirmCancel")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        );
      })()}

      {/* RESCHEDULE MODAL */}
      {rescheduleModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 flex items-center gap-2"><RefreshCw size={18} className="text-blue-500" /> {t("appt.rescheduleTitle")}</h3>
              <button onClick={() => setRescheduleModal(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <p className="text-xs text-slate-500">{t("appt.rescheduleHint")}</p>
            {rescheduleSlotsLoading ? (
              <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
            ) : rescheduleSlotsError ? (
              <div className="text-center py-6 space-y-3">
                <p className="text-sm text-rose-600">{t("appt.rescheduleLoadError")}</p>
                <button onClick={() => openReschedule(rescheduleModal)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm">
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
                      : { weekday: parseLocalDate(day.date).toLocaleDateString(locale, { weekday: "short", timeZone: userTz }), dayNum: String(parseLocalDate(day.date).getDate()) };
                    return (
                    <button key={day.date} onClick={() => { setRescheduleDay(day); setRescheduleSlot(""); }}
                      className={`shrink-0 flex flex-col items-center px-3 py-2 rounded-xl border-2 transition text-center ${rescheduleDay?.date === day.date ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}>
                      <span className="text-xs text-slate-500">{chip.weekday}</span>
                      <span className="text-base font-bold text-slate-800">{chip.dayNum}</span>
                    </button>
                    );
                  })}
                </div>
                {rescheduleDay && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {rescheduleDay.slots.filter(s => s.available).map((slot) => (
                      <button key={slot.datetime} onClick={() => setRescheduleSlot(slot.datetime)}
                        className={`py-2 rounded-xl text-sm font-semibold border-2 transition ${rescheduleSlot === slot.datetime ? "bg-blue-500 border-blue-500 text-white" : "border-slate-200 hover:border-blue-400"}`}>
                        {formatAppointmentTimeWithLabel(new Date(slot.datetime), userTz, locale)}
                      </button>
                    ))}
                  </div>
                )}
                {rescheduleError && (
                  <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3">{rescheduleError}</p>
                )}
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setRescheduleModal(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm">{t("appt.cancelBtn")}</button>
                  <button onClick={handleReschedule} disabled={!rescheduleSlot || rescheduleLoading} className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2">
                    {rescheduleLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    {t("appt.confirmReschedule")}
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
          onClose={() => {
            setReviewModal(null);
            fetchReviewStatus();
          }}
        />
      )}
    </div>
  );
}

function BookingHistoryNotice({ t }: { t: (k: string) => string }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-900">{t("appt.bookingHistoryTitle")}</p>
          <p className="text-xs text-amber-800 mt-1 leading-relaxed">{t("appt.bookingHistoryText")}</p>
        </div>
      </div>
      <Link
        href="/patient/history"
        className="flex w-full items-center justify-center gap-2 text-sm font-semibold text-amber-950 bg-amber-200 hover:bg-amber-300 border border-amber-400 px-4 py-2.5 rounded-xl transition"
      >
        <FileText size={16} /> {t("appt.bookingHistoryAction")}
      </Link>
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
  const showAcuraBadge = isAcuraVolunteerProvider(!!pro.verified, !!pro.acuraVolunteer);
  const displayName = isAnalyst
    ? `${pro.firstName} ${pro.lastName}`
    : `Dr. ${pro.firstName} ${pro.lastName}`;
  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-5 hover:shadow-md transition cursor-pointer ${
      showAcuraBadge
        ? "border-sky-200 ring-1 ring-sky-100 hover:border-sky-300"
        : "border-slate-200 hover:border-emerald-300"
    }`} onClick={onSelect}>
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
      <div className="flex items-center gap-2 mt-4 flex-wrap">
        {showAcuraBadge && <AcuraVolunteerBadge />}
        {pro.isOnline && pro.providerType !== "psychoanalyst" && (
          <Link
            href={pro.jitSessionId ? `/urgent?sessionId=${pro.jitSessionId}` : "/urgent"}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-xs bg-emerald-500 text-white px-2.5 py-1 rounded-full font-semibold hover:bg-emerald-600 transition"
          >
            <Radio size={11} /> {t("map.attendsNow")}
          </Link>
        )}
        {pro.acceptsTeleconsult && <span className="flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-medium"><Video size={11} /> {t("appt.online")}</span>}
        {pro.acceptsInPerson && <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium"><Building2 size={11} /> {t("appt.inPerson")}</span>}
        <button className="ml-auto flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-800">{t("appt.book")} <ChevronRight size={13} /></button>
      </div>
    </div>
  );
}
