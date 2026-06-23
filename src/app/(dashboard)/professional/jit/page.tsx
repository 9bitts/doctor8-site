"use client";
// src/app/(dashboard)/professional/jit/page.tsx
// Plantão Online — painel do profissional.
// Fix 1: campo de preço em valor real (R$ 1,00) em vez de centavos
// Fix 2: sessionIdRef para evitar closure stale no polling

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import {
  Radio, Power, PowerOff, Users, Clock, ChevronRight,
  Loader2, CheckCircle2, AlertCircle, Phone, Pause, Play,
  Stethoscope, Settings, X,
} from "lucide-react";
import { useT, useI18n } from "@/lib/i18n/I18nProvider";

interface QueueEntry {
  id: string;
  status: string;
  position: number;
  specialty: string;
  enteredAt: string;
  calledAt: string | null;
  expiresAt: string | null;
  meetingUrl: string | null;
  patientName: string;
}

interface JitSessionData {
  id: string;
  mode: string;
  status: string;
  specialty: string;
  isFree: boolean;
  priceAmount: number;
  currency: string;
  maxQueueSize: number;
  estimatedMinutesPerPatient: number;
  queueCount: number;
  queue: QueueEntry[];
}

// Format currency for display
function formatCurrency(amountCents: number, currency: string): string {
  return new Intl.NumberFormat("pt-BR", {
    style:    "currency",
    currency: currency || "BRL",
  }).format(amountCents / 100);
}

export default function JitPage() {
  const t = useT();
  const { lang } = useI18n();

  const [session,  setSession]  = useState<JitSessionData | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [calling,  setCalling]  = useState(false);
  const [toggling, setToggling] = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  // Config form
  const [showConfig,   setShowConfig]   = useState(false);
  const [cfgMode,      setCfgMode]      = useState<"QUEUE" | "SHOWCASE">("QUEUE");
  const [cfgSpecialty, setCfgSpecialty] = useState("");
  const [cfgFree,      setCfgFree]      = useState(true);
  // Price stored in REAIS (not cents) for user input — converted on save
  const [cfgPriceReais, setCfgPriceReais] = useState("0,00");
  const [cfgCurrency,  setCfgCurrency]  = useState("BRL");
  const [cfgMax,       setCfgMax]       = useState(50);
  const [cfgEstTime,   setCfgEstTime]   = useState(20);
  const [cfgSaving,    setCfgSaving]    = useState(false);

  const pollRef      = useRef<NodeJS.Timeout>();
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    loadSession();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  async function loadSession() {
    try {
      const res  = await fetch("/api/jit/session");
      const data = await res.json();
      setSession(data.session);
      sessionIdRef.current = data.session?.id ?? null;
      if (data.session?.status === "ONLINE" || data.session?.status === "PAUSED") {
        startPolling();
      }
    } catch { /* ignore */ }
    setLoading(false);
  }

  function startPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        // Expire no-shows using ref (avoids stale closure)
        if (sessionIdRef.current) {
          await fetch("/api/jit/queue", {
            method:  "PATCH",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ action: "EXPIRE_NOSHOWS", sessionId: sessionIdRef.current }),
          });
        }
        const res  = await fetch("/api/jit/session");
        const data = await res.json();
        setSession(data.session);
        sessionIdRef.current = data.session?.id ?? null;
        if (!data.session || data.session.status === "OFFLINE") {
          clearInterval(pollRef.current);
        }
      } catch { /* ignore */ }
    }, 5000);
  }

  // Parse "1,50" or "1.50" to cents (150)
  function parsePriceToCents(raw: string): number {
    const normalized = raw.replace(/\./g, "").replace(",", ".");
    const val = parseFloat(normalized);
    return isNaN(val) ? 0 : Math.round(val * 100);
  }

  async function startDuty() {
    setCfgSaving(true); setError(null);
    const priceAmountCents = cfgFree ? 0 : parsePriceToCents(cfgPriceReais);
    try {
      const res = await fetch("/api/jit/session", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          mode:                       cfgMode,
          specialty:                  cfgSpecialty,
          isFree:                     cfgFree,
          priceAmount:                priceAmountCents,
          currency:                   cfgCurrency,
          maxQueueSize:               cfgMax,
          estimatedMinutesPerPatient: cfgEstTime,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erro"); setCfgSaving(false); return; }
      setShowConfig(false);
      await loadSession();
      startPolling();
    } catch { setError("Erro de rede."); }
    setCfgSaving(false);
  }

  async function toggleStatus(newStatus: "ONLINE" | "PAUSED" | "OFFLINE") {
    if (!session) return;
    setToggling(true); setError(null);
    try {
      if (newStatus === "OFFLINE") clearInterval(pollRef.current);
      const res  = await fetch("/api/jit/session", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        setSession(data.session);
        sessionIdRef.current = data.session?.id ?? null;
      }
    } catch { setError("Erro de rede."); }
    setToggling(false);
  }

  async function callNext() {
    if (!session) return;
    setCalling(true); setError(null);
    try {
      const res  = await fetch("/api/jit/queue", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "CALL_NEXT", sessionId: session.id }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Erro");
      await loadSession();
    } catch { setError("Erro de rede."); }
    setCalling(false);
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString(
      lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US",
      { hour: "2-digit", minute: "2-digit" }
    );
  }

  const isOnline  = session?.status === "ONLINE";
  const isPaused  = session?.status === "PAUSED";
  const isOffline = !session || session.status === "OFFLINE";

  const queue           = session?.queue ?? [];
  const waitingCount    = queue.filter(q => q.status === "WAITING").length;
  const inProgressEntry = queue.find(q => q.status === "IN_PROGRESS");
  const calledEntry     = queue.find(q => q.status === "CALLED");

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-slate-400" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Radio className={`${isOnline ? "text-emerald-500 animate-pulse" : "text-slate-400"}`} size={24} />
            {t("jit.title")}
          </h1>
          <p className="text-slate-500 text-sm mt-1">{t("jit.subtitle")}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
          isOnline ? "bg-emerald-100 text-emerald-700" :
          isPaused ? "bg-amber-100 text-amber-700" :
                     "bg-slate-100 text-slate-500"
        }`}>
          <span className={`w-2 h-2 rounded-full ${
            isOnline ? "bg-emerald-500 animate-pulse" :
            isPaused ? "bg-amber-500" : "bg-slate-400"
          }`} />
          {isOnline ? t("jit.statusOnline") : isPaused ? t("jit.statusPaused") : t("jit.statusOffline")}
        </span>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertCircle size={16} /> {error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* ── OFFLINE: config panel ── */}
      {isOffline && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          {!showConfig ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                <Stethoscope size={28} className="text-emerald-500" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-2">{t("jit.configTitle")}</h2>
              <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">{t("jit.disclaimer")}</p>
              <button
                onClick={() => setShowConfig(true)}
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-3 rounded-xl transition"
              >
                <Settings size={18} /> {t("jit.configTitle")}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <Settings size={18} className="text-emerald-500" /> {t("jit.configTitle")}
              </h2>

              {/* Specialty */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("jit.specialty")} *</label>
                <input
                  value={cfgSpecialty}
                  onChange={(e) => setCfgSpecialty(e.target.value)}
                  placeholder="ex.: Medicina Geral, Psicologia, Nutrição..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm"
                />
              </div>

              {/* Mode */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Modo de atendimento</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["QUEUE", "SHOWCASE"] as const).map((m) => (
                    <button key={m} onClick={() => setCfgMode(m)}
                      className={`py-3 px-4 rounded-xl border text-sm font-medium transition text-left ${
                        cfgMode === m ? "bg-emerald-500 text-white border-emerald-500" : "border-slate-200 text-slate-600 hover:border-emerald-300"
                      }`}
                    >
                      {m === "QUEUE" ? t("jit.modeQueue") : t("jit.modeShowcase")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Free / Price */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={cfgFree} onChange={(e) => setCfgFree(e.target.checked)}
                    className="w-4 h-4 rounded accent-emerald-500" />
                  <span className="text-sm font-medium text-slate-700">{t("jit.free")}</span>
                </label>
              </div>

              {!cfgFree && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    {/* Price in REAIS — not centavos */}
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Valor da consulta
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">
                        {cfgCurrency === "BRL" ? "R$" : cfgCurrency === "USD" ? "$" : "€"}
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={cfgPriceReais}
                        onChange={(e) => {
                          // Allow digits, comma and dot only
                          const v = e.target.value.replace(/[^0-9,\.]/g, "");
                          setCfgPriceReais(v);
                        }}
                        placeholder="0,00"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-400 outline-none text-sm"
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Ex.: 50,00 → R$ 50,00
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{t("jit.currency")}</label>
                    <select value={cfgCurrency} onChange={(e) => setCfgCurrency(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-400 outline-none text-sm bg-white">
                      <option value="BRL">BRL (R$)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Preview price */}
              {!cfgFree && cfgPriceReais && parsePriceToCents(cfgPriceReais) > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-sm text-emerald-700">
                  ✓ Paciente pagará <strong>{formatCurrency(parsePriceToCents(cfgPriceReais), cfgCurrency)}</strong> para entrar na fila
                </div>
              )}

              {/* Queue settings */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t("jit.maxQueue")}</label>
                  <input type="number" value={cfgMax} onChange={(e) => setCfgMax(Number(e.target.value))}
                    min={1} max={500}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-400 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t("jit.estTime")}</label>
                  <input type="number" value={cfgEstTime} onChange={(e) => setCfgEstTime(Number(e.target.value))}
                    min={5} max={120}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-400 outline-none text-sm" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowConfig(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50">
                  Cancelar
                </button>
                <button onClick={startDuty} disabled={cfgSaving || !cfgSpecialty.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2">
                  {cfgSaving
                    ? <><Loader2 size={14} className="animate-spin" /> Iniciando...</>
                    : <><Power size={14} /> {t("jit.saveStart")}</>}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ONLINE / PAUSED: active panel ── */}
      {(isOnline || isPaused) && session && (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{waitingCount}</p>
              <p className="text-xs text-slate-500 mt-0.5">{t("jit.waiting")}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{inProgressEntry ? 1 : 0}</p>
              <p className="text-xs text-slate-500 mt-0.5">{t("jit.inProgress")}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
              <p className="text-sm font-semibold text-slate-700">{session.specialty}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {session.isFree ? t("jit.free") : formatCurrency(session.priceAmount, session.currency)}
              </p>
            </div>
          </div>

          {/* Current patient */}
          {(inProgressEntry || calledEntry) && (
            <div className={`rounded-2xl border-2 p-5 ${inProgressEntry ? "bg-emerald-50 border-emerald-300" : "bg-amber-50 border-amber-300"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                    {inProgressEntry ? t("jit.inProgress") : t("jit.called")}
                  </p>
                  <p className="font-bold text-slate-900 text-lg">
                    {(inProgressEntry || calledEntry)?.patientName}
                  </p>
                </div>
                {(inProgressEntry?.id || calledEntry?.id) && (
                  <Link
                    href={`/video/jit/${(inProgressEntry?.id || calledEntry?.id) ?? ""}`}
                    className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-4 py-2.5 rounded-xl transition text-sm"
                  >
                    <Phone size={16} /> Entrar na sala
                  </Link>
                )}
              </div>
              {calledEntry?.expiresAt && <CountdownTimer expiresAt={calledEntry.expiresAt} />}
            </div>
          )}

          {/* Call next */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800">
                  {waitingCount > 0 ? `${waitingCount} paciente${waitingCount > 1 ? "s" : ""} aguardando` : t("jit.queueEmpty")}
                </p>
                {waitingCount > 0 && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    Espera estimada: ~{waitingCount * session.estimatedMinutesPerPatient} min
                  </p>
                )}
              </div>
              <button onClick={callNext}
                disabled={calling || waitingCount === 0 || isPaused || !!calledEntry}
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-semibold px-5 py-2.5 rounded-xl transition text-sm">
                {calling
                  ? <><Loader2 size={16} className="animate-spin" /> {t("jit.calling")}</>
                  : <><ChevronRight size={16} /> {t("jit.callNext")}</>}
              </button>
            </div>
          </div>

          {/* Queue list */}
          {queue.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                <Users size={16} className="text-slate-400" />
                <span className="text-sm font-semibold text-slate-700">Fila de espera</span>
              </div>
              <div className="divide-y divide-slate-100">
                {queue.map((entry) => (
                  <div key={entry.id} className="px-5 py-3 flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0">
                      {entry.position}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{entry.patientName}</p>
                      <p className="text-xs text-slate-400">{t("jit.enteredLabel")} {formatTime(entry.enteredAt)}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                      entry.status === "IN_PROGRESS" ? "bg-emerald-100 text-emerald-700" :
                      entry.status === "CALLED"      ? "bg-amber-100 text-amber-700" :
                                                       "bg-slate-100 text-slate-500"
                    }`}>
                      {entry.status === "IN_PROGRESS" ? t("jit.inProgress") :
                       entry.status === "CALLED"      ? t("jit.called") : t("jit.waiting")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-3">
            <button onClick={() => toggleStatus(isOnline ? "PAUSED" : "ONLINE")} disabled={toggling}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50 inline-flex items-center justify-center gap-2 disabled:opacity-50">
              {toggling ? <Loader2 size={14} className="animate-spin" /> :
               isOnline ? <><Pause size={14} /> {t("jit.pause")}</> :
                          <><Play size={14} /> {t("jit.resume")}</>}
            </button>
            <button onClick={() => toggleStatus("OFFLINE")} disabled={toggling}
              className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50">
              {toggling ? <Loader2 size={14} className="animate-spin" /> : <><PowerOff size={14} /> {t("jit.goOffline")}</>}
            </button>
          </div>
        </>
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
    <p className={`text-xs font-semibold mt-2 ${secs < 30 ? "text-rose-600" : "text-amber-700"}`}>
      ⏱ Expira em: {mins}:{s.toString().padStart(2, "0")}
    </p>
  );
}
