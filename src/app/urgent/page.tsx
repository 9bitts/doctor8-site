"use client";
// src/app/urgent/page.tsx
// Portal de atendimento imediato (Just-in-Time).
// Paciente precisa estar logado. Caso contrário, redireciona para login.
// Fluxo: escolhe especialidade → vê profissionais disponíveis → entra na fila → tela de espera.

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Stethoscope, Search, Loader2, Clock, Users, CheckCircle2,
  AlertCircle, Radio, ArrowLeft, Phone, X, Heart,
} from "lucide-react";
import { translate, normalizeLang, Lang, TranslationKey } from "@/lib/i18n/translations";

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

interface AvailablePro {
  sessionId: string;
  mode: string;
  specialty: string;
  isFree: boolean;
  priceAmount: number;
  currency: string;
  queueCount: number;
  estimatedWaitMinutes: number;
  maxQueueSize: number;
  isFull: boolean;
  professional: {
    id: string;
    name: string;
    specialty: string;
    avatarUrl: string | null;
    bio: string | null;
  };
}

interface QueueEntry {
  id: string;
  status: string;
  position: number;
  aheadCount: number;
  estimatedWaitMinutes: number;
  calledAt: string | null;
  expiresAt: string | null;
  meetingUrl: string | null;
  sessionStatus: string;
  professionalName: string;
  specialty: string;
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

  // Active queue entry
  const [queueEntry,   setQueueEntry]   = useState<QueueEntry | null>(null);
  const [entering,     setEntering]     = useState(false);
  const pollRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Check auth
    fetch("/api/auth/session").then(r => r.json()).then(s => {
      if (!s?.user) {
        router.push(`/login?callbackUrl=/urgent`);
        return;
      }
      if (s.user.role !== "PATIENT") {
        router.push("/professional");
        return;
      }
      setCheckingAuth(false);
      loadAvailable();
    }).catch(() => {
      router.push("/login?callbackUrl=/urgent");
    });
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  async function loadAvailable() {
    setLoadingList(true);
    try {
      const res = await fetch("/api/jit/available");
      const data = await res.json();
      setAvailable(data.available || []);
    } catch { /* ignore */ }
    setLoadingList(false);
  }

  async function joinQueue(sessionId: string, specialty: string) {
    setJoining(sessionId); setError(null);
    try {
      const res = await fetch("/api/jit/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, specialty }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erro ao entrar na fila."); setJoining(null); return; }
      // Start polling queue status
      startQueuePolling(data.entry.id);
    } catch { setError("Erro de rede."); }
    setJoining(null);
  }

  function startQueuePolling(queueId: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollQueue(queueId);
    pollRef.current = setInterval(() => pollQueue(queueId), 4000);
  }

  async function pollQueue(queueId: string) {
    try {
      const res = await fetch(`/api/jit/queue?queueId=${queueId}`);
      const data = await res.json();
      if (res.ok) {
        setQueueEntry(data.entry);
        // Stop polling if done
        if (["DONE", "CANCELLED", "NO_SHOW"].includes(data.entry.status)) {
          clearInterval(pollRef.current);
        }
      }
    } catch { /* ignore */ }
  }

  async function enterConsultation() {
    if (!queueEntry) return;
    setEntering(true); setError(null);
    try {
      const res = await fetch("/api/jit/queue/enter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queueId: queueEntry.id }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erro."); setEntering(false); return; }
      if (data.meetingUrl) {
        window.open(data.meetingUrl, "_blank");
      }
      await pollQueue(queueEntry.id);
    } catch { setError("Erro de rede."); }
    setEntering(false);
  }

  function leaveQueue() {
    clearInterval(pollRef.current);
    setQueueEntry(null);
    loadAvailable();
  }

  const filtered = available.filter(p =>
    p.specialty.toLowerCase().includes(search.toLowerCase()) ||
    p.professional.name.toLowerCase().includes(search.toLowerCase())
  );

  if (checkingAuth) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 size={24} className="animate-spin text-emerald-500" />
    </div>
  );

  // ── Active queue entry screens ────────────────────────────────────────────
  if (queueEntry) {
    const status = queueEntry.status;

    // No-show / cancelled
    if (status === "NO_SHOW" || status === "CANCELLED") {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 max-w-sm w-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={28} className="text-rose-500" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">{t("urgent.noShowTitle")}</h2>
            <p className="text-sm text-slate-500 mb-6">{t("urgent.noShowSub")}</p>
            <button
              onClick={leaveQueue}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition"
            >
              {t("urgent.rejoin")}
            </button>
          </div>
        </div>
      );
    }

    // Called — enter now!
    if (status === "CALLED") {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-sm border-2 border-emerald-400 p-8 max-w-sm w-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4 animate-bounce">
              <Phone size={28} className="text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-emerald-700 mb-2">{t("urgent.calledTitle")}</h2>
            <p className="text-sm text-slate-500 mb-2">{queueEntry.professionalName}</p>
            <p className="text-sm text-slate-500 mb-6">{t("urgent.calledSub")}</p>
            {queueEntry.expiresAt && (
              <CountdownTimer expiresAt={queueEntry.expiresAt} />
            )}
            {error && (
              <p className="text-xs text-rose-600 mb-3 mt-3">{error}</p>
            )}
            <button
              onClick={enterConsultation}
              disabled={entering}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-base transition disabled:opacity-50 inline-flex items-center justify-center gap-2 mt-4"
            >
              {entering
                ? <Loader2 size={18} className="animate-spin" />
                : <><Phone size={18} /> {t("urgent.enterNow")}</>
              }
            </button>
          </div>
        </div>
      );
    }

    // In progress
    if (status === "IN_PROGRESS") {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-sm border-2 border-blue-400 p-8 max-w-sm w-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <Stethoscope size={28} className="text-blue-500" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">{t("urgent.inProgressTitle")}</h2>
            <p className="text-sm text-slate-500 mb-6">{queueEntry.professionalName}</p>
            {queueEntry.meetingUrl && (
              <a
                href={queueEntry.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm transition inline-flex items-center justify-center gap-2"
              >
                <Phone size={16} /> {t("urgent.enterRoom")}
              </a>
            )}
          </div>
        </div>
      );
    }

    // Waiting
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <Radio size={28} className="text-emerald-500 animate-pulse" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">{t("urgent.waitTitle")}</h2>
          <p className="text-sm text-slate-500 mb-6">{queueEntry.professionalName} · {queueEntry.specialty}</p>

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
            <p className="text-sm text-slate-500 mb-4">
              {queueEntry.aheadCount} {t("urgent.ahead")}
            </p>
          )}

          <p className="text-xs text-slate-400 bg-slate-50 rounded-xl px-4 py-3 mb-6">
            {t("urgent.keepOpen")}
          </p>

          <div className="flex items-center justify-center gap-2 mb-2">
            <Loader2 size={14} className="animate-spin text-emerald-500" />
            <span className="text-xs text-slate-400">{t("urgent.polling")}</span>
          </div>

          <button
            onClick={leaveQueue}
            className="text-xs text-slate-400 hover:text-rose-500 transition mt-2"
          >
            {t("urgent.leaveQueue")}
          </button>
        </div>
      </div>
    );
  }

  // ── Main listing screen ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-600">
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

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("urgent.searchSpec")}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
          />
        </div>

        {/* List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-700">{t("urgent.available")}</p>
            <button
              onClick={loadAvailable}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
            >
              {t("urgent.refresh")}
            </button>
          </div>

          {loadingList ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin text-slate-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 py-12 text-center">
              <Stethoscope size={36} className="text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-600">{t("urgent.noAvailable")}</p>
              <p className="text-sm text-slate-400 mt-1 max-w-xs mx-auto">{t("urgent.noAvailableHint")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((pro) => (
                <div key={pro.sessionId} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
                      {pro.professional.name.charAt(4)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900">{pro.professional.name}</p>
                      <p className="text-sm text-slate-500">{pro.specialty}</p>

                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {/* Free / price */}
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          pro.isFree ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                        }`}>
                          {pro.isFree ? t("urgent.free") : `${(pro.priceAmount / 100).toFixed(2)} ${pro.currency}`}
                        </span>

                        {/* Queue info */}
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                          <Users size={12} /> {pro.queueCount} {t("urgent.inQueue")}
                        </span>

                        {/* Wait time */}
                        {pro.estimatedWaitMinutes > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                            <Clock size={12} /> ~{pro.estimatedWaitMinutes} {t("urgent.mins")} {t("urgent.wait")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {pro.professional.bio && (
                    <p className="text-xs text-slate-400 mt-2 line-clamp-2">{pro.professional.bio}</p>
                  )}

                  <div className="mt-3">
                    {pro.isFull ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg">
                        <AlertCircle size={13} /> {t("urgent.full")}
                      </span>
                    ) : (
                      <button
                        onClick={() => joinQueue(pro.sessionId, pro.specialty)}
                        disabled={joining === pro.sessionId}
                        className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
                      >
                        {joining === pro.sessionId
                          ? <><Loader2 size={14} className="animate-spin" /> {t("urgent.entering")}</>
                          : t("urgent.enter")
                        }
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Countdown timer ───────────────────────────────────────────────────────────
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
  const s = secs % 60;
  return (
    <p className={`text-lg font-bold mb-2 ${secs < 30 ? "text-rose-600 animate-pulse" : "text-amber-600"}`}>
      ⏱ {mins}:{s.toString().padStart(2, "0")}
    </p>
  );
}
