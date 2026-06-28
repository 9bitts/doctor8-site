"use client";
// src/app/urgent/page.tsx
// Portal de atendimento imediato (Just-in-Time).
// Fix: plantão pago agora bloqueia entrada na fila e exige pagamento Stripe.

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import ShareHistoryPrompt from "@/components/ShareHistoryPrompt";
import Link from "next/link";
import {
  Stethoscope, Search, Loader2, Clock, Users, CheckCircle2,
  AlertCircle, Radio, ArrowLeft, Phone, X, Heart, Lock, CreditCard,
} from "lucide-react";
import { translate, normalizeLang, Lang, TranslationKey } from "@/lib/i18n/translations";
import { getProfessionLabel, specialtyMatchesSearch } from "@/lib/professions";
import { navigateBack } from "@/lib/safe-nav";

const LANG_KEY = "doctor8.lang";

function detectLang(): Lang {
  if (typeof window === "undefined") return "pt";
  try {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored) return normalizeLang(stored);
  } catch { /* ignore */ }
  const l = document.documentElement.lang || navigator.language || "pt";
  if (l.startsWith("en")) return "en";
  if (l.startsWith("es")) return "es";
  return "pt";
}

function formatCurrency(amountCents: number, currency: string, lang: Lang): string {
  const locale = lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US";
  return new Intl.NumberFormat(locale, { style: "currency", currency: currency || "BRL" }).format(amountCents / 100);
}

interface AvailablePro {
  sessionId:            string;
  mode:                 string;
  specialty:            string;
  isFree:               boolean;
  priceAmount:          number;
  currency:             string;
  queueCount:           number;
  estimatedWaitMinutes: number;
  maxQueueSize:         number;
  isFull:               boolean;
  professional: {
    id:        string;
    name:      string;
    specialty: string;
    avatarUrl: string | null;
    bio:       string | null;
  };
}

interface QueueEntry {
  id:                   string;
  status:               string;
  position:             number;
  aheadCount:           number;
  estimatedWaitMinutes: number;
  calledAt:             string | null;
  expiresAt:            string | null;
  meetingUrl:           string | null;
  sessionStatus:        string;
  professionalName:     string;
  professionalId?:      string;
  professionalUserId?:  string;
  specialty:            string;
}

function QueueSharePrompt({
  entry,
  careProfessional,
}: {
  entry: QueueEntry;
  careProfessional: { id: string; name: string } | null;
}) {
  const proId = entry.professionalId || careProfessional?.id;
  const proName = entry.professionalName || careProfessional?.name;
  if (!proId || !proName) return null;
  return (
    <ShareHistoryPrompt
      professionalId={proId}
      professionalUserId={entry.professionalUserId}
      professionalName={proName}
      className="mb-6 text-left"
    />
  );
}

export default function UrgentPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("pt");
  useEffect(() => { setLang(detectLang()); }, []);
  const t = (key: TranslationKey) => translate(lang, key);

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [available,    setAvailable]    = useState<AvailablePro[]>([]);
  const [loadingList,  setLoadingList]  = useState(true);
  const [search,       setSearch]       = useState("");
  const [joining,      setJoining]      = useState<string | null>(null);
  const [error,        setError]        = useState<string | null>(null);
  const [userId,       setUserId]       = useState<string | null>(null);

  // Payment modal for paid sessions
  const [payModal,     setPayModal]     = useState<AvailablePro | null>(null);
  const [stripeLoaded, setStripeLoaded] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [payLoading,   setPayLoading]   = useState(false);
  const cardElementRef = useRef<any>(null);
  const stripeRef      = useRef<any>(null);
  const elementsRef    = useRef<any>(null);

  // Active queue entry
  const [queueEntry, setQueueEntry] = useState<QueueEntry | null>(null);
  const [careProfessional, setCareProfessional] = useState<{ id: string; name: string } | null>(null);
  const [entering,   setEntering]   = useState(false);
  const [highlightSessionId, setHighlightSessionId] = useState<string | null>(null);
  const pollRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    fetch("/api/auth/session").then(r => r.json()).then(s => {
      if (!s?.user) { router.push(`/login?callbackUrl=/urgent`); return; }
      if (s.user.role !== "PATIENT") { router.push("/professional"); return; }
      setUserId(s.user.id);
      setCheckingAuth(false);
      loadAvailable();
    }).catch(() => { router.push("/login?callbackUrl=/urgent"); });
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  async function loadAvailable() {
    setLoadingList(true);
    try {
      const res  = await fetch("/api/jit/available");
      const data = await res.json();
      setAvailable(data.available || []);
      const sid = new URLSearchParams(window.location.search).get("sessionId");
      if (sid) setHighlightSessionId(sid);
    } catch { /* ignore */ }
    setLoadingList(false);
  }

  // ── Free session: join directly ────────────────────────────────────────────
  async function joinQueue(
    sessionId: string,
    specialty: string,
    professionalId?: string,
    professionalName?: string,
    paymentIntentId?: string,
  ) {
    setJoining(sessionId); setError(null);
    if (professionalId && professionalName) {
      setCareProfessional({ id: professionalId, name: professionalName });
    }
    try {
      const res  = await fetch("/api/jit/queue", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ sessionId, specialty, paymentIntentId }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "TCLE_REQUIRED") {
          window.location.href = `/patient/tcle?returnUrl=${encodeURIComponent("/urgent")}`;
          return;
        }
        setError(data.error || t("urgent.errJoin"));
        setJoining(null);
        return;
      }
      startQueuePolling(data.entry.id);
    } catch { setError(t("common.loadError")); }
    setJoining(null);
  }

  // ── Paid session: open payment modal ──────────────────────────────────────
  function openPayModal(pro: AvailablePro) {
    setPayModal(pro);
    setCardComplete(false);
    setStripeLoaded(false);
    setTimeout(() => loadStripe(), 100);
  }

  function loadStripe() {
    if (!(window as any).Stripe) {
      const script    = document.createElement("script");
      script.src      = "https://js.stripe.com/v3/";
      script.onload   = () => initStripe();
      document.head.appendChild(script);
    } else { initStripe(); }
  }

  function initStripe() {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key) return;
    stripeRef.current   = (window as any).Stripe(key);
    elementsRef.current = stripeRef.current.elements();
    const card = elementsRef.current.create("card", {
      style: { base: { fontSize: "16px", color: "#1e293b", fontFamily: "system-ui, sans-serif", "::placeholder": { color: "#94a3b8" } }, invalid: { color: "#ef4444" } },
    });
    setTimeout(() => {
      const el = document.getElementById("jit-card-element");
      if (el) {
        card.mount("#jit-card-element");
        card.on("change", (e: any) => setCardComplete(e.complete));
        cardElementRef.current = card;
        setStripeLoaded(true);
      }
    }, 200);
  }

  async function handleJitPayment() {
    if (!payModal || !stripeRef.current || !cardElementRef.current) return;
    setPayLoading(true); setError(null);
    try {
      // Create PaymentIntent for JIT
      const intentRes  = await fetch("/api/jit/payment-intent", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ sessionId: payModal.sessionId }),
      });
      const intentData = await intentRes.json();
      if (!intentRes.ok) { setError(intentData.error || t("urgent.errPayment")); setPayLoading(false); return; }

      const { error: stripeError, paymentIntent } = await stripeRef.current.confirmCardPayment(
        intentData.clientSecret,
        { payment_method: { card: cardElementRef.current } }
      );
      if (stripeError) { setError(stripeError.message || t("urgent.payFailed")); setPayLoading(false); return; }

      if (paymentIntent.status === "succeeded") {
        setPayModal(null);
        await joinQueue(
          payModal.sessionId,
          payModal.specialty,
          payModal.professional.id,
          payModal.professional.name,
          paymentIntent.id,
        );
      }
    } catch { setError(t("common.loadError")); }
    setPayLoading(false);
  }

  function startQueuePolling(queueId: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollQueue(queueId);
    pollRef.current = setInterval(() => pollQueue(queueId), 4000);
  }

  async function pollQueue(queueId: string) {
    try {
      const res  = await fetch(`/api/jit/queue?queueId=${queueId}`);
      const data = await res.json();
      if (res.ok) {
        setQueueEntry(data.entry);
        if (data.entry.professionalId && data.entry.professionalName) {
          setCareProfessional({
            id: data.entry.professionalId,
            name: data.entry.professionalName,
          });
        }
        if (["DONE", "CANCELLED", "NO_SHOW"].includes(data.entry.status)) clearInterval(pollRef.current);
      }
    } catch { /* ignore */ }
  }

  async function enterConsultation() {
    if (!queueEntry) return;
    setEntering(true); setError(null);
    try {
      const res  = await fetch("/api/jit/queue/enter", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ queueId: queueEntry.id }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || t("common.actionError")); setEntering(false); return; }
      window.location.href = `/video/jit/${queueEntry.id}`;
    } catch { setError(t("common.loadError")); }
    setEntering(false);
  }

  function leaveQueue() {
    clearInterval(pollRef.current);
    setQueueEntry(null);
    loadAvailable();
  }

  const filtered = available.filter(p =>
    specialtyMatchesSearch(lang, p.specialty, search) ||
    p.professional.name.toLowerCase().includes(search.toLowerCase())
  );

  if (checkingAuth) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 size={24} className="animate-spin text-emerald-500" />
    </div>
  );

  // ── Active queue screens ──────────────────────────────────────────────────
  if (queueEntry) {
    const status = queueEntry.status;

    if (status === "NO_SHOW" || status === "CANCELLED") return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={28} className="text-rose-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">{t("urgent.noShowTitle")}</h2>
          <p className="text-sm text-slate-500 mb-6">{t("urgent.noShowSub")}</p>
          <button onClick={leaveQueue} className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition">
            {t("urgent.rejoin")}
          </button>
        </div>
      </div>
    );

    if (status === "CALLED") return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border-2 border-emerald-400 p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4 animate-bounce">
            <Phone size={28} className="text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-emerald-700 mb-2">{t("urgent.calledTitle")}</h2>
          <p className="text-sm text-slate-500 mb-2">{queueEntry.professionalName}</p>
          <p className="text-sm text-slate-500 mb-4">{t("urgent.calledSub")}</p>
          <QueueSharePrompt entry={queueEntry} careProfessional={careProfessional} />
          {queueEntry.expiresAt && <CountdownTimer expiresAt={queueEntry.expiresAt} />}
          {error && <p className="text-xs text-rose-600 mb-3 mt-3">{error}</p>}
          <button onClick={enterConsultation} disabled={entering}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-base transition disabled:opacity-50 inline-flex items-center justify-center gap-2 mt-4">
            {entering ? <Loader2 size={18} className="animate-spin" /> : <><Phone size={18} /> {t("urgent.enterNow")}</>}
          </button>
        </div>
      </div>
    );

    if (status === "IN_PROGRESS") return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border-2 border-blue-400 p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <Stethoscope size={28} className="text-blue-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">{t("urgent.inProgressTitle")}</h2>
          <p className="text-sm text-slate-500 mb-4">{queueEntry.professionalName}</p>
          <QueueSharePrompt entry={queueEntry} careProfessional={careProfessional} />
          <Link
            href={`/video/jit/${queueEntry.id}`}
            className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm transition inline-flex items-center justify-center gap-2"
          >
            <Phone size={16} /> {t("urgent.enterRoom")}
          </Link>
        </div>
      </div>
    );

    // Waiting
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <Radio size={28} className="text-emerald-500 animate-pulse" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">{t("urgent.waitTitle")}</h2>
          <p className="text-sm text-slate-500 mb-4">{queueEntry.professionalName} · {getProfessionLabel(lang, queueEntry.specialty)}</p>
          <QueueSharePrompt entry={queueEntry} careProfessional={careProfessional} />
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-3xl font-bold text-emerald-600">{queueEntry.position}</p>
              <p className="text-xs text-slate-500 mt-1">{t("urgent.pos")}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-3xl font-bold text-slate-700">{queueEntry.estimatedWaitMinutes}</p>
              <p className="text-xs text-slate-500 mt-1">{t("urgent.minutes")}</p>
            </div>
          </div>
          {queueEntry.aheadCount > 0 && (
            <p className="text-sm text-slate-500 mb-4">{queueEntry.aheadCount} {t("urgent.ahead")}</p>
          )}
          <p className="text-xs text-slate-400 bg-slate-50 rounded-xl px-4 py-3 mb-6">{t("urgent.keepOpen")}</p>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Loader2 size={14} className="animate-spin text-emerald-500" />
            <span className="text-xs text-slate-400">{t("urgent.polling")}</span>
          </div>
          <button onClick={leaveQueue} className="text-xs text-slate-400 hover:text-rose-500 transition mt-2">
            {t("urgent.leaveQueue")}
          </button>
        </div>
      </div>
    );
  }

  // ── Main listing ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => navigateBack(router, "/patient")} className="text-slate-400 hover:text-slate-600">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-slate-900 flex items-center gap-2">
              <Heart size={18} className="text-rose-500" /> {t("urgent.title")}
            </h1>
            <p className="text-xs text-slate-500">{t("urgent.subtitle")}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
            <AlertCircle size={16} /> {error}
            <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
          </div>
        )}

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("urgent.searchSpec")}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-700">{t("urgent.available")}</p>
            <button onClick={loadAvailable} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">{t("urgent.refresh")}</button>
          </div>

          {loadingList ? (
            <div className="flex items-center justify-center py-12"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 py-12 text-center">
              <Stethoscope size={36} className="text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-600">{t("urgent.noAvailable")}</p>
              <p className="text-sm text-slate-400 mt-1 max-w-xs mx-auto">{t("urgent.noAvailableHint")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((pro) => (
                <div
                  key={pro.sessionId}
                  id={`jit-session-${pro.sessionId}`}
                  className={`bg-white rounded-2xl border shadow-sm p-4 ${
                    highlightSessionId === pro.sessionId
                      ? "border-emerald-400 ring-2 ring-emerald-200"
                      : "border-slate-100"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
                      {pro.professional.name.charAt(4)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900">{pro.professional.name}</p>
                      <p className="text-sm text-slate-500">{getProfessionLabel(lang, pro.specialty)}</p>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          pro.isFree ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                        }`}>
                          {pro.isFree ? t("urgent.free") : formatCurrency(pro.priceAmount, pro.currency, lang)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                          <Users size={12} /> {pro.queueCount} {t("urgent.inQueue")}
                        </span>
                        {pro.estimatedWaitMinutes > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                            <Clock size={12} /> ~{pro.estimatedWaitMinutes} {t("urgent.mins")} {t("urgent.wait")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {pro.professional.bio && (
                    <BioText bio={pro.professional.bio} readMore={t("urgent.readMore")} readLess={t("urgent.readLess")} />
                  )}
                  <div className="mt-3">
                    {pro.isFull ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg">
                        <AlertCircle size={13} /> {t("urgent.full")}
                      </span>
                    ) : pro.isFree ? (
                      <button onClick={() => joinQueue(pro.sessionId, pro.specialty, pro.professional.id, pro.professional.name)} disabled={joining === pro.sessionId}
                        className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition disabled:opacity-50 inline-flex items-center justify-center gap-2">
                        {joining === pro.sessionId ? <><Loader2 size={14} className="animate-spin" /> {t("urgent.entering")}</> : t("urgent.enter")}
                      </button>
                    ) : (
                      <button onClick={() => openPayModal(pro)} disabled={joining === pro.sessionId}
                        className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition disabled:opacity-50 inline-flex items-center justify-center gap-2">
                        <Lock size={14} /> Pagar e entrar na fila · {formatCurrency(pro.priceAmount, pro.currency, lang)}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payment modal for paid JIT sessions */}
      {payModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <CreditCard size={18} className="text-blue-500" /> {t("urgent.payTitle")}
              </h2>
              <button onClick={() => setPayModal(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Profissional</span>
                <span className="font-medium">{payModal.professional.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Especialidade</span>
                <span>{getProfessionLabel(lang, payModal.specialty)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200 mt-1">
                <span>Total</span>
                <span>{formatCurrency(payModal.priceAmount, payModal.currency, lang)}</span>
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-2 rounded-xl">{error}</div>
            )}

            <div>
              <p className="text-xs font-medium text-slate-600 mb-2 flex items-center gap-1.5">
                <CreditCard size={13} /> {t("urgent.cardDetails")}
              </p>
              <div id="jit-card-element"
                className="border border-slate-200 rounded-xl px-4 py-3.5 bg-white focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-400 transition min-h-[48px]" />
              {!stripeLoaded && (
                <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                  <Loader2 size={12} className="animate-spin" /> {t("urgent.loading")}
                </div>
              )}
            </div>

            <button onClick={handleJitPayment} disabled={payLoading || !stripeLoaded || !cardComplete}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition">
              {payLoading ? <><Loader2 size={16} className="animate-spin" /> Processando...</> : <><Lock size={16} /> Pagar e entrar na fila</>}
            </button>
            <p className="text-xs text-slate-400 text-center flex items-center justify-center gap-1">
              <Lock size={11} /> {t("urgent.secureStripe")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function BioText({ bio, readMore, readLess }: { bio: string; readMore: string; readLess: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = bio.length > 120;

  return (
    <div className="mt-2">
      <p className={`text-xs text-slate-500 leading-relaxed ${!expanded && isLong ? "line-clamp-3" : ""}`}>
        {bio}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 mt-1"
        >
          {expanded ? readLess : readMore}
        </button>
      )}
    </div>
  );
}

function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const [secs, setSecs] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  );
  useEffect(() => {
    const timer = setInterval(() => {
      setSecs(Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);
  const mins = Math.floor(secs / 60);
  const s    = secs % 60;
  return (
    <p className={`text-lg font-bold mb-2 ${secs < 30 ? "text-rose-600 animate-pulse" : "text-amber-600"}`}>
      ⏱ {mins}:{s.toString().padStart(2, "0")}
    </p>
  );
}
