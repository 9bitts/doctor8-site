"use client";

// src/app/(dashboard)/patient/appointments/page.tsx
// Full appointment booking flow with real Stripe payment. i18n via useI18n().

import { useState, useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";
import {
  Calendar, Search, Video, Building2,
  Clock, ChevronRight, ChevronLeft, CreditCard, Loader2,
  CheckCircle2, AlertCircle, Star, MapPin, Lock,
} from "lucide-react";

type Step = "browse" | "slots" | "payment" | "confirmed";

interface Professional {
  id: string;
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
}

interface SlotDay {
  date: string;
  label: string;
  slots: { time: string; datetime: string; available: boolean }[];
}

export default function AppointmentsPage() {
  const { t, lang } = useI18n();
  const locale = localeOf(lang);

  const SPECIALTIES = ["All", "General Practice", "Cardiology", "Psychology", "Nutrition", "Cannabis Medicine", "Dermatology"];

  const [step, setStep] = useState<Step>("browse");
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selectedPro, setSelectedPro] = useState<Professional | null>(null);
  const [slots, setSlots] = useState<SlotDay[]>([]);
  const [selectedDay, setSelectedDay] = useState<SlotDay | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [confirmedId, setConfirmedId] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("All");
  const [type, setType] = useState<"TELECONSULT" | "IN_PERSON">("TELECONSULT");
  const [appointments, setAppointments] = useState<any[]>([]);

  const [stripeLoaded, setStripeLoaded] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const cardElementRef = useRef<any>(null);
  const stripeRef = useRef<any>(null);
  const elementsRef = useRef<any>(null);

  useEffect(() => { fetchProfessionals(); fetchAppointments(); }, []);

  useEffect(() => {
    if (step === "payment" && !stripeLoaded) {
      loadStripe();
    }
  }, [step]);

  async function loadStripe() {
    if (!(window as any).Stripe) {
      const script = document.createElement("script");
      script.src = "https://js.stripe.com/v3/";
      script.onload = () => initStripe();
      document.head.appendChild(script);
    } else {
      initStripe();
    }
  }

  function initStripe() {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) return;

    stripeRef.current = (window as any).Stripe(publishableKey);
    elementsRef.current = stripeRef.current.elements();

    const card = elementsRef.current.create("card", {
      style: {
        base: {
          fontSize: "16px",
          color: "#1e293b",
          fontFamily: "system-ui, sans-serif",
          "::placeholder": { color: "#94a3b8" },
        },
        invalid: { color: "#ef4444" },
      },
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
      const d = await res.json();
      setProfessionals(d.professionals || []);
    } finally { setLoading(false); }
  }

  async function fetchAppointments() {
    const res = await fetch("/api/appointments?upcoming=true");
    const d = await res.json();
    setAppointments(d.appointments || []);
  }

  async function selectProfessional(pro: Professional) {
    setSelectedPro(pro);
    setStep("slots");
    setSlotsLoading(true);
    try {
      const res = await fetch(`/api/professionals/${pro.id}/slots`);
      const d = await res.json();
      const daysWithSlots = (d.days || []).filter((day: SlotDay) =>
        day.slots.some((s) => s.available)
      );
      setSlots(daysWithSlots);
      if (daysWithSlots.length > 0) setSelectedDay(daysWithSlots[0]);
    } finally { setSlotsLoading(false); }
  }

  async function handlePayment() {
    if (!selectedPro || !selectedSlot || !stripeRef.current || !cardElementRef.current) return;

    setPayLoading(true);
    setError("");

    try {
      const intentRes = await fetch("/api/payments/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professionalId: selectedPro.id,
          scheduledAt: selectedSlot,
          type,
          paymentMethod: "card",
        }),
      });
      const intentData = await intentRes.json();

      if (!intentRes.ok) {
        setError(intentData.error?.general?.[0] || t("appt.errInitPayment"));
        return;
      }

      const { error: stripeError, paymentIntent } = await stripeRef.current.confirmCardPayment(
        intentData.clientSecret,
        { payment_method: { card: cardElementRef.current } }
      );

      if (stripeError) {
        setError(stripeError.message || t("appt.errPaymentFailed"));
        return;
      }

      if (paymentIntent.status === "succeeded") {
        const apptRes = await fetch("/api/appointments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            professionalId: selectedPro.id,
            scheduledAt: selectedSlot,
            type,
            stripePaymentIntentId: paymentIntent.id,
            priceAmount: intentData.amount,
            currency: intentData.currency,
          }),
        });

        const apptData = await apptRes.json();
        if (!apptRes.ok) {
          setError(apptData.error?.general?.[0] || t("appt.errNotConfirmed"));
          return;
        }

        setConfirmedId(apptData.appointmentId);
        setStep("confirmed");
        fetchAppointments();
      }
    } catch (e) {
      setError(t("appt.errGeneric"));
    } finally {
      setPayLoading(false);
    }
  }

  function resetFlow() {
    setStep("browse");
    setSelectedPro(null);
    setSelectedSlot("");
    setSelectedDay(null);
    setSlots([]);
    setError("");
    setStripeLoaded(false);
    setCardComplete(false);
    cardElementRef.current = null;
    stripeRef.current = null;
    elementsRef.current = null;
  }

  const filtered = professionals.filter((p) => {
    const matchSearch = search === "" ||
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      p.specialty.toLowerCase().includes(search.toLowerCase());
    const matchSpecialty = specialty === "All" || p.specialty === specialty;
    return matchSearch && matchSpecialty;
  });

  const priceDisplay = selectedPro
    ? new Intl.NumberFormat(locale, {
        style: "currency",
        currency: selectedPro.currency || "USD",
      }).format(selectedPro.consultPrice / 100)
    : "";

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("appt.title")}</h1>
          <p className="text-slate-500 text-sm mt-1">{t("appt.subtitle")}</p>
        </div>
        {step !== "browse" && step !== "confirmed" && (
          <button
            onClick={resetFlow}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 font-medium"
          >
            <ChevronLeft size={16} /> {t("appt.backToSearch")}
          </button>
        )}
      </div>

      {/* Upcoming appointments strip */}
      {appointments.length > 0 && step === "browse" && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-emerald-800 mb-3 flex items-center gap-2">
            <Calendar size={15} /> {t("appt.upcoming")}
          </p>
          <div className="space-y-2">
            {appointments.slice(0, 2).map((apt: any) => (
              <div key={apt.id} className="flex items-center justify-between gap-3 bg-white rounded-xl px-4 py-3 shadow-sm">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    Dr. {apt.professional?.firstName} {apt.professional?.lastName}
                  </p>
                  <p className="text-xs text-slate-500">{apt.professional?.specialty}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-semibold text-emerald-700">
                    {new Date(apt.scheduledAt).toLocaleDateString(locale, { month: "short", day: "numeric" })}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(apt.scheduledAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                {apt.type === "TELECONSULT" && apt.status === "CONFIRMED" && (
                  <a
                    href={`/video/${apt.id}`}
                    className="shrink-0 flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold px-3 py-2 rounded-lg transition"
                  >
                    <Video size={13} /> {t("appt.join")}
                  </a>
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
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("appt.search")}
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
                />
              </div>
              <div className="flex gap-2">
                {(["TELECONSULT", "IN_PERSON"] as const).map((tp) => (
                  <button
                    key={tp}
                    onClick={() => setType(tp)}
                    className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                      type === tp ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {tp === "TELECONSULT" ? <Video size={13} /> : <Building2 size={13} />}
                    {tp === "TELECONSULT" ? t("appt.online") : t("appt.inPerson")}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {SPECIALTIES.map((s) => (
                <button
                  key={s}
                  onClick={() => setSpecialty(s)}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                    specialty === s ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {s}
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
                <DoctorCard key={pro.id} pro={pro} onSelect={() => selectProfessional(pro)} locale={locale} t={t} />
              ))}
            </div>
          )}
        </>
      )}

      {/* STEP 2: SELECT SLOT */}
      {step === "slots" && selectedPro && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-400/20 flex items-center justify-center text-2xl font-black text-emerald-300">
              {selectedPro.firstName[0]}
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Dr. {selectedPro.firstName} {selectedPro.lastName}</h2>
              <p className="text-slate-400 text-sm">{selectedPro.specialty}</p>
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
                      const availableCount = day.slots.filter((s) => s.available).length;
                      return (
                        <button
                          key={day.date}
                          onClick={() => { setSelectedDay(day); setSelectedSlot(""); }}
                          className={`shrink-0 flex flex-col items-center px-4 py-3 rounded-xl border-2 transition ${
                            selectedDay?.date === day.date
                              ? "border-emerald-500 bg-emerald-50"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <span className="text-xs text-slate-500 font-medium">{day.label.split(",")[0]}</span>
                          <span className="text-lg font-bold text-slate-800 mt-0.5">{day.label.split(" ").pop()}</span>
                          <span className="text-xs text-emerald-600 font-semibold mt-1">{availableCount} {t("appt.slots")}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedDay && (
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-3">
                      {selectedDay.label} — {t("appt.availableTimes")}
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {selectedDay.slots.map((slot) => (
                        <button
                          key={slot.datetime}
                          disabled={!slot.available}
                          onClick={() => setSelectedSlot(slot.datetime)}
                          className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition ${
                            !slot.available
                              ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
                              : selectedSlot === slot.datetime
                              ? "bg-emerald-500 border-emerald-500 text-white"
                              : "bg-white border-slate-200 text-slate-700 hover:border-emerald-400"
                          }`}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedSlot && (
                  <button
                    onClick={() => setStep("payment")}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-4 rounded-xl transition text-base"
                  >
                    {t("appt.continueToPayment")} <ChevronRight size={18} />
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

          <div>
            <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <CreditCard size={16} /> {t("appt.cardDetails")}
            </p>
            <div
              id="card-element"
              className="border border-slate-200 rounded-xl px-4 py-3.5 bg-white focus-within:ring-2 focus-within:ring-emerald-500/30 focus-within:border-emerald-400 transition"
            />
            {!stripeLoaded && (
              <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                <Loader2 size={12} className="animate-spin" /> {t("appt.loadingPayment")}
              </div>
            )}
          </div>

          <button
            onClick={handlePayment}
            disabled={payLoading || !stripeLoaded || !cardComplete}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-slate-800 to-emerald-600 text-white font-bold py-4 rounded-xl transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-base"
          >
            {payLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Lock size={18} />
            )}
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
          <div className="bg-slate-50 rounded-xl p-5 text-sm space-y-2 text-left">
            <div className="flex justify-between">
              <span className="text-slate-500">{t("appt.doctor")}</span>
              <span className="font-semibold">Dr. {selectedPro.firstName} {selectedPro.lastName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t("appt.date")}</span>
              <span className="font-semibold">
                {new Date(selectedSlot).toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric" })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t("appt.time")}</span>
              <span className="font-semibold">
                {new Date(selectedSlot).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t("appt.amountPaid")}</span>
              <span className="font-semibold text-emerald-600">{priceDisplay}</span>
            </div>
          </div>
          <p className="text-sm text-slate-500">{t("appt.emailSent")}</p>
          <button
            onClick={resetFlow}
            className="w-full bg-slate-900 text-white font-semibold py-3.5 rounded-xl hover:bg-slate-700 transition"
          >
            {t("appt.backToAppts")}
          </button>
        </div>
      )}
    </div>
  );
}

function DoctorCard({ pro, onSelect, locale, t }: { pro: Professional; onSelect: () => void; locale: string; t: (k: string) => string }) {
  return (
    <div
      className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md hover:border-emerald-300 transition cursor-pointer"
      onClick={onSelect}
    >
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-emerald-500 flex items-center justify-center text-2xl font-black text-white shrink-0">
          {pro.firstName[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900">Dr. {pro.firstName} {pro.lastName}</p>
          <p className="text-sm text-emerald-600 font-medium">{pro.specialty}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Star size={11} className="text-yellow-400 fill-yellow-400" /> {pro.rating}
            </span>
            {pro.clinicCity && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <MapPin size={11} /> {pro.clinicCity}
              </span>
            )}
          </div>
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
        {pro.acceptsTeleconsult && (
          <span className="flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-medium">
            <Video size={11} /> {t("appt.online")}
          </span>
        )}
        {pro.acceptsInPerson && (
          <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">
            <Building2 size={11} /> {t("appt.inPerson")}
          </span>
        )}
        <button className="ml-auto flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-800">
          {t("appt.book")} <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}
