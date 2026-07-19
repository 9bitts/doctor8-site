"use client";
// src/app/(dashboard)/professional/jit/JitClient.tsx
// Plantão Online — painel do profissional (client).

import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useRef, useMemo } from "react";
import {
  Radio, Power, PowerOff, Users, ChevronRight,
  Loader2, AlertCircle, Phone, Pause, Play,
  Stethoscope, Settings, X, RefreshCw, UserPlus, MessageCircle, Copy, Check,
} from "lucide-react";
import { useT, useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";
import { getProfessionLabel } from "@/lib/professions";
import { useToast } from "@/components/ui/toast";
import { formatAppointmentTimeWithLabel } from "@/lib/timezone";

interface ChartOption {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  hasAccount: boolean;
  linkedUserId: string | null;
}

interface PrivateConsultResult {
  appointmentId: string;
  joinPath: string;
  joinUrl: string;
  patientUserId: string;
  patientName: string;
  whatsappUrl: string;
  messageBody: string;
}

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

function formatCurrency(amountCents: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style:    "currency",
    currency: currency || "BRL",
  }).format(amountCents / 100);
}

export default function JitClient({ providerTz }: { providerTz: string }) {
  const t = useT();
  const toast = useToast();
  const { lang } = useI18n();
  const locale = localeOf(lang);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [session,  setSession]  = useState<JitSessionData | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [calling,  setCalling]  = useState(false);
  const [toggling, setToggling] = useState(false);
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const [showConfig,   setShowConfig]   = useState(false);
  const [cfgMode,      setCfgMode]      = useState<"QUEUE" | "SHOWCASE">("QUEUE");
  const [cfgSpecialty, setCfgSpecialty] = useState("");
  const [cfgFree,      setCfgFree]      = useState(true);
  const [cfgPriceReais, setCfgPriceReais] = useState("0,00");
  const [cfgCurrency,  setCfgCurrency]  = useState("BRL");
  const [cfgMax,       setCfgMax]       = useState(50);
  const [cfgEstTime,   setCfgEstTime]   = useState(20);
  const [cfgSaving,    setCfgSaving]    = useState(false);

  const [privateOpen, setPrivateOpen] = useState(false);
  const [charts, setCharts] = useState<ChartOption[]>([]);
  const [chartsLoading, setChartsLoading] = useState(false);
  const [chartQuery, setChartQuery] = useState("");
  const [selectedChartId, setSelectedChartId] = useState<string | null>(null);
  const [creatingPrivate, setCreatingPrivate] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [privateResult, setPrivateResult] = useState<PrivateConsultResult | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [pendingPrivateRecordId, setPendingPrivateRecordId] = useState<string | null>(null);

  const pollRef      = useRef<NodeJS.Timeout>();
  const sessionIdRef = useRef<string | null>(null);
  const deepLinkHandledRef = useRef(false);

  useEffect(() => {
    loadSession();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  useEffect(() => {
    if (loading || deepLinkHandledRef.current) return;
    const wantsPrivate = searchParams.get("private") === "1";
    const recordId = searchParams.get("recordId");
    if (!wantsPrivate || !recordId) return;

    deepLinkHandledRef.current = true;
    setPendingPrivateRecordId(recordId);
    // Clean query so refresh does not re-trigger.
    router.replace(pathname, { scroll: false });

    const status = session?.status;
    if (status === "ONLINE" || status === "PAUSED") {
      void openPrivateConsult(recordId);
    } else {
      setShowConfig(true);
    }
  }, [loading, searchParams, session?.status, pathname, router]);

  async function loadSession() {
    setLoadError(false);
    try {
      const res  = await fetch("/api/jit/session");
      if (!res.ok) { setLoadError(true); return; }
      const data = await res.json();
      setSession(data.session);
      sessionIdRef.current = data.session?.id ?? null;
      if (data.session?.status === "ONLINE" || data.session?.status === "PAUSED") {
        startPolling();
      }
    } catch {
      setLoadError(true);
    }
    setLoading(false);
  }

  function startPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch("/api/jit/session");
        if (!res.ok) return;
        const data = await res.json();
        setSession(data.session);
        sessionIdRef.current = data.session?.id ?? null;
        if (!data.session || data.session.status === "OFFLINE") {
          clearInterval(pollRef.current);
        }
      } catch { /* retry on next cycle */ }
    }, 5000);
  }

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
      if (!res.ok) { setError(data.message || t("jit.errGeneric")); setCfgSaving(false); return; }
      setShowConfig(false);
      await loadSession();
      startPolling();
      toast.success(t("jit.toast.started"));
      if (pendingPrivateRecordId) {
        const recordId = pendingPrivateRecordId;
        setPendingPrivateRecordId(null);
        void openPrivateConsult(recordId);
      }
    } catch { setError(t("jit.errNetwork")); toast.error(t("jit.errNetwork")); }
    setCfgSaving(false);
  }

  async function toggleStatus(newStatus: "ONLINE" | "PAUSED" | "OFFLINE") {
    if (!session) return;
    const prevStatus = session.status;
    setToggling(true); setError(null);
    try {
      const res  = await fetch("/api/jit/session", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.message || t("jit.errGeneric");
        setError(msg);
        toast.error(msg);
        return;
      }
      setSession(data.session);
      sessionIdRef.current = data.session?.id ?? null;
      if (newStatus === "OFFLINE") {
        clearInterval(pollRef.current);
        toast.success(t("jit.toast.offline"));
      } else if (newStatus === "PAUSED") {
        toast.success(t("jit.toast.paused"));
      } else if (prevStatus === "PAUSED") {
        toast.success(t("jit.toast.resumed"));
        startPolling();
      }
    } catch {
      setError(t("jit.errNetwork"));
      toast.error(t("jit.errNetwork"));
    }
    setToggling(false);
  }

  async function openPrivateConsult(preselectRecordId?: string | null) {
    const recordId = preselectRecordId || null;
    setPrivateOpen(true);
    setPrivateResult(null);
    setSelectedChartId(recordId);
    setChartQuery("");
    setLinkCopied(false);
    setError(null);
    setChartsLoading(true);
    try {
      const res = await fetch("/api/professional/records");
      if (!res.ok) {
        toast.error(t("jit.private.loadChartsError"));
        return;
      }
      const data = await res.json();
      const loaded = (data.records || []) as ChartOption[];
      setCharts(loaded);
      if (recordId) {
        const match = loaded.find((c) => c.id === recordId);
        if (match?.hasAccount) {
          setSelectedChartId(recordId);
        } else if (match && !match.hasAccount) {
          setSelectedChartId(null);
          setError(t("jit.private.errNoAccount"));
        } else {
          setSelectedChartId(null);
          toast.error(t("jit.private.recordNotFound"));
        }
      }
    } catch {
      toast.error(t("jit.private.loadChartsError"));
    } finally {
      setChartsLoading(false);
    }
  }

  function closePrivateConsult() {
    setPrivateOpen(false);
    setPrivateResult(null);
    setSelectedChartId(null);
    setChartQuery("");
    setLinkCopied(false);
  }

  async function createPrivateConsult() {
    if (!session || !selectedChartId) return;
    setCreatingPrivate(true);
    setError(null);
    try {
      const res = await fetch("/api/jit/private-consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientRecordId: selectedChartId,
          sessionId: session.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const code = data.error as string | undefined;
        if (code === "PATIENT_NO_ACCOUNT") {
          setError(t("jit.private.errNoAccount"));
        } else if (code === "SESSION_NOT_ACTIVE") {
          setError(t("jit.private.errSession"));
        } else if (code === "PROVIDER_NOT_VERIFIED") {
          setError(data.message || t("jit.private.errVerified"));
        } else {
          setError(data.message || t("jit.errGeneric"));
        }
        toast.error(t("jit.private.createError"));
        return;
      }
      setPrivateResult({
        appointmentId: data.appointmentId,
        joinPath: data.joinPath,
        joinUrl: data.joinUrl,
        patientUserId: data.patientUserId,
        patientName: data.patientName,
        whatsappUrl: data.whatsappUrl,
        messageBody: data.messageBody,
      });
      toast.success(t("jit.private.created"));
    } catch {
      setError(t("jit.errNetwork"));
      toast.error(t("jit.errNetwork"));
    } finally {
      setCreatingPrivate(false);
    }
  }

  async function sendDoctor8Message() {
    if (!privateResult) return;
    setSendingMsg(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: privateResult.patientUserId,
          content: privateResult.messageBody,
        }),
      });
      if (!res.ok) {
        toast.error(t("jit.private.sendMsgError"));
        return;
      }
      toast.success(t("jit.private.sendMsgOk"));
    } catch {
      toast.error(t("jit.errNetwork"));
    } finally {
      setSendingMsg(false);
    }
  }

  function shareWhatsApp() {
    if (!privateResult?.whatsappUrl) return;
    window.open(privateResult.whatsappUrl, "_blank", "noopener,noreferrer");
  }

  async function copyJoinLink() {
    if (!privateResult?.joinUrl) return;
    try {
      await navigator.clipboard.writeText(privateResult.joinUrl);
      setLinkCopied(true);
      toast.success(t("jit.private.linkCopied"));
      setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      toast.error(t("jit.errGeneric"));
    }
  }

  async function callNext(confirmed = false) {
    if (!session) return;
    const activeInProgress = session.queue.find(q => q.status === "IN_PROGRESS");
    if (activeInProgress && !confirmed) {
      setConfirmEndOpen(true);
      return;
    }
    setCalling(true); setError(null);
    setConfirmEndOpen(false);
    try {
      const res  = await fetch("/api/jit/queue", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          action: "CALL_NEXT",
          sessionId: session.id,
          confirmEndInProgress: !!activeInProgress,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "ALREADY_CALLING") {
          setError(t("jit.alreadyCalling"));
        } else if (data.error === "IN_PROGRESS_ACTIVE") {
          setError(t("jit.confirmEndInProgress"));
        } else if (data.error === "VIDEO_ROOM_FAILED") {
          setError(t("jit.videoRoomFailed"));
        } else if (data.error === "SESSION_NOT_ONLINE") {
          setError(t("jit.sessionNotOnline"));
        } else {
          setError(data.message || t("jit.errGeneric"));
        }
      }
      await loadSession();
    } catch { setError(t("jit.errNetwork")); }
    setCalling(false);
  }

  function formatTime(iso: string) {
    return formatAppointmentTimeWithLabel(new Date(iso), providerTz, locale);
  }

  const filteredCharts = useMemo(() => {
    const q = chartQuery.trim().toLowerCase();
    const linked = charts.filter((c) => c.hasAccount);
    if (!q) return linked.slice(0, 40);
    return linked
      .filter((c) =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
        (c.phone || "").includes(q),
      )
      .slice(0, 40);
  }, [charts, chartQuery]);

  const selectedChart = charts.find((c) => c.id === selectedChartId) ?? null;

  const queue           = session?.queue ?? [];
  const waitingCount    = queue.filter(q => q.status === "WAITING").length;
  const inProgressEntry = queue.find(q => q.status === "IN_PROGRESS");
  const calledEntry     = queue.find(q => q.status === "CALLED");
  const isOnline  = session?.status === "ONLINE";
  const isPaused  = session?.status === "PAUSED";
  const isOffline = !session || session.status === "OFFLINE";

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-slate-400" />
    </div>
  );

  if (loadError) return (
    <div className="max-w-md mx-auto mt-16 text-center space-y-4">
      <AlertCircle size={32} className="mx-auto text-amber-500" />
      <p className="text-sm text-slate-600">{t("jit.loadError")}</p>
      <button
        type="button"
        onClick={() => { setLoading(true); void loadSession(); }}
        className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700"
      >
        <RefreshCw size={14} /> {t("common.retry")}
      </button>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2 break-words">
            <Radio className={`shrink-0 ${isOnline ? "text-brand-500 animate-pulse" : "text-slate-400"}`} size={24} />
            {t("jit.title")}
          </h1>
          <p className="text-slate-500 text-sm mt-1">{t("jit.subtitle")}</p>
        </div>
        <span className={`self-start inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full shrink-0 ${
          isOnline ? "bg-brand-100 text-brand-600" :
          isPaused ? "bg-amber-100 text-amber-700" :
                     "bg-slate-100 text-slate-500"
        }`}>
          <span className={`w-2 h-2 rounded-full ${
            isOnline ? "bg-brand-500 animate-pulse" :
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

      {isOffline && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          {!showConfig ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-4">
                <Stethoscope size={28} className="text-brand-500" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-2">{t("jit.configTitle")}</h2>
              <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">{t("jit.disclaimer")}</p>
              {pendingPrivateRecordId && (
                <p className="text-sm text-brand-700 bg-brand-50 border border-brand-100 rounded-xl px-4 py-3 max-w-sm mx-auto mb-4">
                  {t("jit.private.startDutyFirst")}
                </p>
              )}
              <button
                onClick={() => setShowConfig(true)}
                className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-500 text-white font-semibold px-6 py-3 rounded-xl transition"
              >
                <Settings size={18} /> {t("jit.configTitle")}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <Settings size={18} className="text-brand-500" /> {t("jit.configTitle")}
              </h2>
              {pendingPrivateRecordId && (
                <p className="text-sm text-brand-700 bg-brand-50 border border-brand-100 rounded-xl px-4 py-3">
                  {t("jit.private.startDutyFirst")}
                </p>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("jit.specialty")} *</label>
                <input
                  value={cfgSpecialty}
                  onChange={(e) => setCfgSpecialty(e.target.value)}
                  placeholder={t("jit.specialtyPlaceholder")}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">{t("jit.serviceMode")}</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["QUEUE", "SHOWCASE"] as const).map((m) => (
                    <button key={m} onClick={() => setCfgMode(m)}
                      className={`py-3 px-4 rounded-xl border text-sm font-medium transition text-left ${
                        cfgMode === m ? "bg-brand-500 text-white border-brand-500" : "border-slate-200 text-slate-600 hover:border-brand-200"
                      }`}
                    >
                      {m === "QUEUE" ? t("jit.modeQueue") : t("jit.modeShowcase")}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={cfgFree} onChange={(e) => setCfgFree(e.target.checked)}
                    className="w-4 h-4 rounded accent-brand-500" />
                  <span className="text-sm font-medium text-slate-700">{t("jit.free")}</span>
                </label>
              </div>

              {!cfgFree && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      {t("jit.consultPrice")}
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
                          const v = e.target.value.replace(/[^0-9,\.]/g, "");
                          setCfgPriceReais(v);
                        }}
                        placeholder="0,00"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 outline-none text-sm"
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {t("jit.priceExample")}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{t("jit.currency")}</label>
                    <select value={cfgCurrency} onChange={(e) => setCfgCurrency(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 outline-none text-sm bg-white">
                      <option value="BRL">BRL (R$)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
                </div>
              )}

              {!cfgFree && cfgPriceReais && parsePriceToCents(cfgPriceReais) > 0 && (
                <div className="bg-brand-50 border border-brand-200 rounded-xl px-4 py-2.5 text-sm text-brand-600">
                  {t("jit.patientWillPay").replace("{{price}}", formatCurrency(parsePriceToCents(cfgPriceReais), cfgCurrency, locale))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t("jit.maxQueue")}</label>
                  <input type="number" value={cfgMax} onChange={(e) => setCfgMax(Number(e.target.value))}
                    min={1} max={500}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t("jit.estTime")}</label>
                  <input type="number" value={cfgEstTime} onChange={(e) => setCfgEstTime(Number(e.target.value))}
                    min={5} max={120}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 outline-none text-sm" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowConfig(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50">
                  {t("common.cancel")}
                </button>
                <button onClick={startDuty} disabled={cfgSaving || !cfgSpecialty.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-500 text-white font-semibold text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2">
                  {cfgSaving
                    ? <><Loader2 size={14} className="animate-spin" /> {t("jit.starting")}</>
                    : <><Power size={14} /> {t("jit.saveStart")}</>}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {(isOnline || isPaused) && session && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 sm:p-4 text-center">
              <p className="text-xl sm:text-2xl font-bold text-slate-900">{waitingCount}</p>
              <p className="text-xs text-slate-500 mt-0.5">{t("jit.waiting")}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 sm:p-4 text-center">
              <p className="text-xl sm:text-2xl font-bold text-slate-900">{inProgressEntry ? 1 : 0}</p>
              <p className="text-xs text-slate-500 mt-0.5">{t("jit.inProgress")}</p>
            </div>
            <div className="col-span-2 sm:col-span-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-3 sm:p-4 text-center min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-slate-700 line-clamp-2">{getProfessionLabel(lang, session.specialty)}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {session.isFree ? t("jit.free") : formatCurrency(session.priceAmount, session.currency, locale)}
              </p>
            </div>
          </div>

          {(inProgressEntry || calledEntry) && (
            <div className={`rounded-2xl border-2 p-5 ${inProgressEntry ? "bg-brand-50 border-brand-200" : "bg-amber-50 border-amber-300"}`}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                    {inProgressEntry ? t("jit.inProgress") : t("jit.called")}
                  </p>
                  <p className="font-bold text-slate-900 text-lg truncate">
                    {(inProgressEntry || calledEntry)?.patientName}
                  </p>
                </div>
                {(inProgressEntry?.id || calledEntry?.id) && (
                  <Link
                    href={`/video/jit/${(inProgressEntry?.id || calledEntry?.id) ?? ""}`}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-500 text-white font-semibold px-4 py-2.5 rounded-xl transition text-sm min-h-[44px]"
                  >
                    <Phone size={16} /> {t("jit.enterRoom")}
                  </Link>
                )}
              </div>
              {calledEntry?.expiresAt && <CountdownTimer expiresAt={calledEntry.expiresAt} t={t} />}
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-semibold text-slate-800">
                  {waitingCount > 0
                    ? t("jit.waitingPatients").replace("{{count}}", String(waitingCount))
                    : t("jit.queueEmpty")}
                </p>
                {waitingCount > 0 && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t("jit.waitEst").replace("{{minutes}}", String(waitingCount * session.estimatedMinutesPerPatient))}
                  </p>
                )}
              </div>
              <button onClick={() => callNext()}
                disabled={calling || waitingCount === 0 || isPaused || !!calledEntry}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-500 disabled:opacity-40 text-white font-semibold px-5 py-2.5 rounded-xl transition text-sm min-h-[44px]">
                {calling
                  ? <><Loader2 size={16} className="animate-spin" /> {t("jit.calling")}</>
                  : <><ChevronRight size={16} /> {t("jit.callNext")}</>}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-semibold text-slate-800">{t("jit.private.title")}</p>
                <p className="text-xs text-slate-500 mt-0.5">{t("jit.private.subtitle")}</p>
              </div>
              {!privateOpen && (
                <button
                  type="button"
                  onClick={() => void openPrivateConsult()}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-brand-200 bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold px-5 py-2.5 rounded-xl transition text-sm min-h-[44px]"
                >
                  <UserPlus size={16} /> {t("jit.private.create")}
                </button>
              )}
            </div>

            {privateOpen && !privateResult && (
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-700">{t("jit.private.pickPatient")}</p>
                  <button
                    type="button"
                    onClick={closePrivateConsult}
                    className="text-slate-400 hover:text-slate-600"
                    aria-label={t("common.cancel")}
                  >
                    <X size={16} />
                  </button>
                </div>
                <input
                  value={chartQuery}
                  onChange={(e) => setChartQuery(e.target.value)}
                  placeholder={t("jit.private.searchPlaceholder")}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm"
                />
                {chartsLoading ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-500">
                    <Loader2 size={16} className="animate-spin" /> {t("common.loading")}
                  </div>
                ) : filteredCharts.length === 0 ? (
                  <p className="text-sm text-slate-500 py-2">{t("jit.private.noLinkedPatients")}</p>
                ) : (
                  <div className="border border-slate-100 rounded-xl divide-y max-h-56 overflow-y-auto">
                    {filteredCharts.map((c) => {
                      const active = selectedChartId === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedChartId(c.id)}
                          className={`w-full text-left px-3 py-2.5 text-sm transition ${
                            active ? "bg-brand-50 text-brand-800" : "hover:bg-slate-50 text-slate-800"
                          }`}
                        >
                          <span className="font-medium">{c.firstName} {c.lastName}</span>
                          {c.phone && (
                            <span className="block text-xs text-slate-400 mt-0.5">{c.phone}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
                {selectedChart && !selectedChart.hasAccount && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                    {t("jit.private.errNoAccount")}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={closePrivateConsult}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void createPrivateConsult()}
                    disabled={creatingPrivate || !selectedChartId || !selectedChart?.hasAccount}
                    className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  >
                    {creatingPrivate
                      ? <><Loader2 size={14} className="animate-spin" /> {t("jit.private.creating")}</>
                      : t("jit.private.confirmCreate")}
                  </button>
                </div>
              </div>
            )}

            {privateResult && (
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">
                      {t("jit.private.readyTitle").replace("{{name}}", privateResult.patientName)}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 break-all">{privateResult.joinUrl}</p>
                  </div>
                  <button
                    type="button"
                    onClick={closePrivateConsult}
                    className="text-slate-400 hover:text-slate-600 shrink-0"
                    aria-label={t("common.cancel")}
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={shareWhatsApp}
                    className="inline-flex items-center justify-center gap-2 min-h-[44px] rounded-xl bg-[#25D366] hover:bg-[#1ebe57] text-white font-semibold text-sm px-4"
                  >
                    <Phone size={16} /> {t("jit.private.sendWhatsApp")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void sendDoctor8Message()}
                    disabled={sendingMsg}
                    className="inline-flex items-center justify-center gap-2 min-h-[44px] rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm px-4 disabled:opacity-50"
                  >
                    {sendingMsg
                      ? <Loader2 size={16} className="animate-spin" />
                      : <MessageCircle size={16} />}
                    {t("jit.private.sendDoctor8")}
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => void copyJoinLink()}
                    className="flex-1 inline-flex items-center justify-center gap-2 min-h-[40px] rounded-xl border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-50"
                  >
                    {linkCopied ? <Check size={15} className="text-brand-500" /> : <Copy size={15} />}
                    {linkCopied ? t("jit.private.linkCopied") : t("jit.private.copyLink")}
                  </button>
                  <Link
                    href={privateResult.joinPath}
                    className="flex-1 inline-flex items-center justify-center gap-2 min-h-[40px] rounded-xl border border-brand-200 bg-brand-50 text-brand-700 font-semibold text-sm hover:bg-brand-100"
                  >
                    <Phone size={15} /> {t("jit.enterRoom")}
                  </Link>
                </div>
              </div>
            )}
          </div>

          {confirmEndOpen && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
              <p className="text-sm text-amber-900 font-medium">{t("jit.confirmEndInProgress")}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmEndOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-medium"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  onClick={() => callNext(true)}
                  disabled={calling}
                  className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {t("jit.confirmEndContinue")}
                </button>
              </div>
            </div>
          )}

          {queue.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                <Users size={16} className="text-slate-400" />
                <span className="text-sm font-semibold text-slate-700">{t("jit.queueTitle")}</span>
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
                      entry.status === "IN_PROGRESS" ? "bg-brand-100 text-brand-600" :
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

function CountdownTimer({ expiresAt, t }: { expiresAt: string; t: (k: string) => string }) {
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
      {t("jit.expLabel")}: {mins}:{s.toString().padStart(2, "0")}
    </p>
  );
}
