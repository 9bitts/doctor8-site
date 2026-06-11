"use client";

// src/app/(dashboard)/patient/appointments/page.tsx
// Full appointment booking flow with real Stripe payment:
// Step 1 — Browse doctors + filter
// Step 2 — Select date/time slot
// Step 3 — Checkout with real Stripe card payment
// Step 4 — Confirmation

import { useState, useEffect, useRef } from "react";
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

const SPECIALTIES = ["All", "General Practice", "Cardiology", "Psychology", "Nutrition", "Cannabis Medicine", "Dermatology"];

export default function AppointmentsPage() {
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

  // Stripe card element state
  const [stripeLoaded, setStripeLoaded] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const cardElementRef = useRef<any>(null);
  const stripeRef = useRef<any>(null);
  const elementsRef = useRef<any>(null);

  useEffect(() => { fetchProfessionals(); fetchAppointments(); }, []);

  // Load Stripe.js when entering payment step
  useEffect(() => {
    if (step === "payment" && !stripeLoaded) {
      loadStripe();
    }
  }, [step]);

  async function loadStripe() {
    // Dynamically load Stripe.js
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
      // 1. Create PaymentIntent on server
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
        setError(intentData.error?.general?.[0] || "Failed to initialize payment.");
        return;
      }

      // 2. Confirm payment with Stripe.js (real card charge)
      const { error: stripeError, paymentIntent } = await stripeRef.current.confirmCardPayment(
        intentData.clientSecret,
        { payment_method: { card: cardElementRef.current } }
      );

      if (stripeError) {
        setError(stripeError.message || "Payment failed. Please try again.");
        return;
      }

      if (paymentIntent.status === "succeeded") {
        // 3. Create appointment in our system
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
          setError(apptData.error?.general?.[0] || "Appointment could not be confirmed.");
          return;
        }

        setConfirmedId(apptData.appointmentId);
        setStep("confirmed");
        fetchAppointments();
      }
    } catch (e) {
      setError("Something went wrong. Please try again.");
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
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: selectedPro.currency || "USD",
      }).format(selectedPro.consultPrice / 100)
    : "";

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Appointments</h1>
          <p className="text-slate-500 text-sm mt-1">Book and manage your consultations</p>
        </div>
        {step !== "browse" && step !== "confirmed" && (
          <button
            onClick={resetFlow}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 font-medium"
          >
            <ChevronLeft size={16} /> Back to search
          </button>
        )}
      </div>

      {/* Upcoming appointments strip */}
      {appointments.length > 0 && step === "browse" && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-emerald-800 mb-3 flex items-center gap-2">
            <Calendar size={15} /> Upcoming appointments
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
                    {new Date(apt.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(apt.scheduledAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                {apt.type === "TELECONSULT" && apt.status === "CONFIRMED" && (
                  <a
                    href={`/video/${apt.id}`}
                    className="shrink-0 flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold px-3 py-2 rounded-lg transition"
                  >
                    <Video size={13} /> Join
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ STEP 1: BROWSE ═══ */}
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
                  placeholder="Search by name or specialty..."
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
                />
              </div>
              <div className="flex gap-2">
                {(["TELECONSULT", "IN_PERSON"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                      type === t ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {t === "TELECONSULT" ? <Video size={13} /> : <Building2 size={13} />}
                    {t === "TELECONSULT" ? "Online" : "In-person"}
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
              <p className="text-slate-500 mb-2">No doctors found.</p>
              <p className="text-xs text-slate-400">Professionals need to complete their profile to appear here.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {filtered.map((pro) => (
                <DoctorCard key={pro.id} pro={pro} onSelect={() => selectProfessional(pro)} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ═══ STEP 2: SELECT SLOT ═══ */}
      {step === "slots" && selectedPro && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-400/20 flex items-center justify-center text-2xl font-black text-emerald-300">
              {selectedPro.firstName[0]}
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Dr. {selectedPro.firstName} {selectedPro.lastName}</h2>
              <p className="text-slate-400 text-sm">{selectedPro.specialty}</p>
              <p className="text-emerald-400 font-semibold text-sm mt-1">{priceDisplay} / consultation</p>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {slotsLoading ? (
              <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-slate-400" /></div>
            ) : slots.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No available slots in the next 14 days.</p>
            ) : (
              <>
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-3">Select a day</p>
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
                          <span className="text-xs text-emerald-600 font-semibold mt-1">{availableCount} slots</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedDay && (
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-3">
                      {selectedDay.label} — available times
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
                    Continue to payment <ChevronRight size={18} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══ STEP 3: PAYMENT ═══ */}
      {step === "payment" && selectedPro && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <h2 className="font-bold text-slate-900 text-lg">Complete payment</h2>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
              <AlertCircle size={16} className="shrink-0" /> {error}
            </div>
          )}

          {/* Order summary */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Order summary</p>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Consultation with Dr. {selectedPro.lastName}</span>
              <span className="font-semibold">{priceDisplay}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Date</span>
              <span>{new Date(selectedSlot).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Time</span>
              <span>{new Date(selectedSlot).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Type</span>
              <span>{type === "TELECONSULT" ? "🎥 Teleconsultation" : "🏥 In-person"}</span>
            </div>
            <div className="border-t border-slate-200 mt-3 pt-3 flex justify-between font-bold text-slate-900">
              <span>Total</span>
              <span>{priceDisplay}</span>
            </div>
          </div>

          {/* Stripe card element */}
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <CreditCard size={16} /> Card details
            </p>
            <div
              id="card-element"
              className="border border-slate-200 rounded-xl px-4 py-3.5 bg-white focus-within:ring-2 focus-within:ring-emerald-500/30 focus-within:border-emerald-400 transition"
            />
            {!stripeLoaded && (
              <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                <Loader2 size={12} className="animate-spin" /> Loading secure payment form...
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
            {payLoading ? "Processing payment..." : `Pay ${priceDisplay}`}
          </button>

          <p className="text-xs text-slate-400 text-center flex items-center justify-center gap-1">
            <Lock size={11} /> Secured by Stripe · HIPAA compliant · Your card is never stored
          </p>
        </div>
      )}

      {/* ═══ STEP 4: CONFIRMED ═══ */}
      {step === "confirmed" && selectedPro && (
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-8 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <CheckCircle2 size={40} className="text-emerald-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Appointment confirmed!</h2>
            <p className="text-slate-500 mt-2">Your consultation has been booked and paid.</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-5 text-sm space-y-2 text-left">
            <div className="flex justify-between">
              <span className="text-slate-500">Doctor</span>
              <span className="font-semibold">Dr. {selectedPro.firstName} {selectedPro.lastName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date</span>
              <span className="font-semibold">
                {new Date(selectedSlot).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Time</span>
              <span className="font-semibold">
                {new Date(selectedSlot).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Amount paid</span>
              <span className="font-semibold text-emerald-600">{priceDisplay}</span>
            </div>
          </div>
          <p className="text-sm text-slate-500">
            A confirmation email has been sent. You will receive reminders 24h and 1h before.
          </p>
          <button
            onClick={resetFlow}
            className="w-full bg-slate-900 text-white font-semibold py-3.5 rounded-xl hover:bg-slate-700 transition"
          >
            Back to appointments
          </button>
        </div>
      )}
    </div>
  );
}

function DoctorCard({ pro, onSelect }: { pro: Professional; onSelect: () => void }) {
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
            {new Intl.NumberFormat("en-US", { style: "currency", currency: pro.currency || "USD" }).format(pro.consultPrice / 100)}
          </p>
          <p className="text-xs text-slate-400">/consultation</p>
        </div>
      </div>
      {pro.bio && <p className="text-xs text-slate-500 mt-3 line-clamp-2">{pro.bio}</p>}
      <div className="flex items-center gap-2 mt-4">
        {pro.acceptsTeleconsult && (
          <span className="flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-medium">
            <Video size={11} /> Online
          </span>
        )}
        {pro.acceptsInPerson && (
          <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">
            <Building2 size={11} /> In-person
          </span>
        )}
        <button className="ml-auto flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-800">
          Book <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}
