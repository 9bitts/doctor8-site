"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Heart, Loader2, Radio, Phone, AlertCircle, Stethoscope,
  Users, Clock, ChevronRight, MessageCircle, Video, Calendar,
} from "lucide-react";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import { translate, Lang } from "@/lib/i18n/translations";
import HumanitarianShell from "@/components/humanitarian/HumanitarianShell";
import HumanitarianFlowStepper from "@/components/humanitarian/HumanitarianFlowStepper";
import HumanitarianPhoneGate from "@/components/humanitarian/HumanitarianPhoneGate";
import { getHumanitarianLang } from "@/components/humanitarian/HumanitarianLangSwitcher";
import { humanitarianFlowStep } from "@/lib/humanitarian/patient-flow";
import {
  cacheHumanitarianQueueState,
  loadCachedHumanitarianQueueState,
} from "@/lib/humanitarian/offline-draft";
import { humanitarianApiErrorMessage } from "@/lib/humanitarian/api-error-message";
import HumanitarianOfflineBanner from "@/components/humanitarian/HumanitarianOfflineBanner";
import { buildAuthHref } from "@/components/auth/login-shared";
import { MAIN_LOGIN } from "@/lib/auth-portals";

function NoVolunteersScheduledCta({ lang }: { lang: Lang }) {
  return (
    <div className="mt-3 pt-3 border-t border-amber-500/20 space-y-2">
      <p className="text-xs text-amber-100/90 leading-relaxed">{t(lang, "hum.noVolunteersScheduledHint")}</p>
      <Link
        href="/patient/volunteer-appointments"
        className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-300 hover:text-emerald-200 underline underline-offset-2"
      >
        <Calendar size={14} /> {t(lang, "hum.noVolunteersScheduledCta")}
      </Link>
    </div>
  );
}

interface PoolInfo {
  id: string;
  slug: string;
  label: string;
  maxWaiting: number;
  waiting: number;
  volunteersOnline: number;
  volunteersBusy: number;
  isFull: boolean;
}

interface CampaignInfo {
  slug: string;
  name: string;
  description: string | null;
  active: boolean;
}

interface QueueEntry {
  id: string;
  status: string;
  position: number;
  aheadCount: number;
  estimatedWaitMinutes: number | null;
  onlineVolunteers: number;
  poolLabel: string;
  poolSlug?: string;
  professionalName: string | null;
  completionChannel?: string | null;
  meetingUrl?: string | null;
  campaignSlug?: string;
}

function t(lang: Lang, key: string, params?: Record<string, string | number>) {
  let s = translate(lang, key);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), String(v));
    }
  }
  return s;
}

export default function HumanitarianCampaignPage() {
  const router = useRouter();
  const slug = VENEZUELA_CAMPAIGN_SLUG;
  const pollRef = useRef<NodeJS.Timeout>();
  const autoEnterRef = useRef(false);
  const joinPanelRef = useRef<HTMLDivElement>(null);

  const [lang, setLang] = useState<Lang>("es");
  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<CampaignInfo | null>(null);
  const [pools, setPools] = useState<PoolInfo[]>([]);
  const [entry, setEntry] = useState<QueueEntry | null>(null);
  const [joining, setJoining] = useState<string | null>(null);
  const [entering, setEntering] = useState(false);
  const [complaint, setComplaint] = useState("");
  const [selectedPool, setSelectedPool] = useState<string | null>(null);
  const [forceMedicalPool, setForceMedicalPool] = useState(false);
  const [computedPriority, setComputedPriority] = useState<string | null>(null);
  const [anamneseComplete, setAnamneseComplete] = useState(true);
  const [tcleAccepted, setTcleAccepted] = useState(false);
  const [phoneReady, setPhoneReady] = useState(false);
  const [phoneGateEnabled, setPhoneGateEnabled] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [queueStale, setQueueStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    setLang(getHumanitarianLang());
  }, []);

  useEffect(() => {
    if (!selectedPool) return;
    const timer = window.setTimeout(() => {
      joinPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
    return () => window.clearTimeout(timer);
  }, [selectedPool]);

  const loadCampaign = useCallback(async () => {
    try {
      const res = await fetch(`/api/humanitarian/campaigns/${slug}?lang=${lang}`);
      const data = await res.json();
      if (!res.ok) {
        setError(humanitarianApiErrorMessage(lang, data));
        setLoading(false);
        return;
      }
      setCampaign(data.campaign);
      setPools(data.pools || []);
    } catch {
      setError(t(lang, "hum.page.connectionError"));
    }
    setLoading(false);
  }, [lang, slug]);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then(async (s) => {
        if (!s?.user) {
          router.push(buildAuthHref(MAIN_LOGIN, { callbackUrl: `/humanitarian/${slug}` }));
          return;
        }
        if (s.user.role !== "PATIENT") {
          router.push("/humanitarian/volunteer");
          return;
        }
        setUserId(s.user.id);

        const currentLang = getHumanitarianLang();
        setLang(currentLang);

        const intakeRes = await fetch(`/api/humanitarian/intake?campaignSlug=${slug}`);
        const intakeData = await intakeRes.json();
        if (intakeRes.ok && !intakeData.intake?.triageValid) {
          router.replace(`/humanitarian/${slug}/triage`);
          return;
        }
        if (intakeRes.ok && intakeData.intake?.triageValid && !intakeData.intake?.tcleAccepted) {
          router.replace(`/humanitarian/${slug}/tcle`);
          return;
        }
        if (intakeRes.ok && intakeData.intake) {
          setForceMedicalPool(!!intakeData.intake.forceMedicalPool);
          setComputedPriority(intakeData.intake.computedPriority ?? null);
          setAnamneseComplete(!!intakeData.intake.anamneseComplete);
          setTcleAccepted(!!intakeData.intake.tcleAccepted);
          setPhoneReady(!!intakeData.intake.phoneReady);
          setPhoneGateEnabled(!!intakeData.intake.phoneGateEnabled);
        }

        await loadCampaign();
        // A transient queue fetch failure (flaky 3G) must not redirect to login
        // and must not blank the queue — fall back to the last cached state.
        try {
          const queueRes = await fetch(`/api/humanitarian/queue?campaignSlug=${slug}&lang=${currentLang}`);
          const queueData = await queueRes.json();
          if (queueRes.ok && queueData.entry) {
            setEntry(queueData.entry);
            cacheHumanitarianQueueState(s.user.id, slug, queueData.entry);
            setQueueStale(false);
          }
        } catch {
          const cached = loadCachedHumanitarianQueueState<QueueEntry>(s.user.id, slug);
          if (cached) {
            setEntry(cached);
            setQueueStale(true);
          }
        }
      })
      .catch(() => router.push(buildAuthHref(MAIN_LOGIN, { callbackUrl: `/humanitarian/${slug}` })));

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [router, slug, loadCampaign]);

  useEffect(() => {
    if (!loading) loadCampaign();
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!entry?.id) return;
    startPolling(entry.id);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [entry?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function startPolling(entryId: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollEntry(entryId);
    pollRef.current = setInterval(() => pollEntry(entryId), 5000);
  }

  async function pollEntry(entryId: string) {
    try {
      const res = await fetch(`/api/humanitarian/queue?entryId=${entryId}&lang=${lang}`);
      const data = await res.json();
      if (res.ok && data.entry) {
        setEntry(data.entry);
        if (userId) cacheHumanitarianQueueState(userId, slug, data.entry);
        setQueueStale(false);
        if (data.entry.status === "WAITING") {
          autoEnterRef.current = false;
        }
        if (["DONE", "CANCELLED", "NO_SHOW"].includes(data.entry.status)) {
          clearInterval(pollRef.current);
        }
      }
    } catch {
      const cached = userId ? loadCachedHumanitarianQueueState<QueueEntry>(userId, slug) : null;
      if (cached) {
        setEntry(cached);
        setQueueStale(true);
      }
    }
  }

  async function joinPool(poolSlug: string) {
    setJoining(poolSlug);
    setError(null);
    try {
      const res = await fetch("/api/humanitarian/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignSlug: slug,
          poolSlug,
          chiefComplaint: complaint.trim() || undefined,
          lang,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const code = data.errorCode || data.error;
        if (code === "TRIAGE_REQUIRED") {
          router.replace(`/humanitarian/${slug}/triage`);
          return;
        }
        if (code === "TCLE_REQUIRED") {
          router.replace(`/humanitarian/${slug}/tcle`);
          return;
        }
        if (code === "PHONE_REQUIRED") {
          setPhoneReady(false);
          setError(t(lang, "hum.phone.required"));
          setJoining(null);
          return;
        }
        if (code === "CANNOT_SWITCH_IN_CONSULT") {
          setError(t(lang, "hum.page.cannotSwitchInConsult"));
          setJoining(null);
          setSwitching(null);
          return;
        }
        setError(humanitarianApiErrorMessage(lang, data));
        setJoining(null);
        return;
      }
      setEntry(data.entry);
      setSelectedPool(null);
      startPolling(data.entry.id);
    } catch {
      setError(t(lang, "hum.page.networkError"));
    }
    setJoining(null);
    setSwitching(null);
  }

  async function switchPool(poolSlug: string, currentPoolLabel: string) {
    const target = pools.find((p) => p.slug === poolSlug);
    if (!target) return;
    const msg = t(lang, "hum.page.changeServiceConfirm", {
      pool: currentPoolLabel,
      newPool: target.label,
    });
    if (!window.confirm(msg)) return;
    setSwitching(poolSlug);
    await joinPool(poolSlug);
  }

  async function enterConsultation() {
    if (!entry) return;
    setEntering(true);
    try {
      const res = await fetch("/api/humanitarian/queue/enter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: entry.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(humanitarianApiErrorMessage(lang, data));
        setEntering(false);
        autoEnterRef.current = false;
        return;
      }
      window.location.href = `/video/humanitarian/${entry.id}`;
    } catch {
      setError(t(lang, "hum.page.networkError"));
      autoEnterRef.current = false;
    }
    setEntering(false);
  }

  useEffect(() => {
    if (!entry || entry.status !== "CALLED" || entering || autoEnterRef.current) return;
    autoEnterRef.current = true;
    void enterConsultation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.id, entry?.status, entering]);

  async function leaveQueue() {
    if (!entry) return;
    if (!window.confirm(t(lang, "hum.page.leaveQueueConfirm"))) return;
    setLeaving(true);
    await fetch("/api/humanitarian/queue/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryId: entry.id }),
    }).catch(() => {});
    clearInterval(pollRef.current);
    setEntry(null);
    setLeaving(false);
    loadCampaign();
  }

  const totalVolunteersOnline = pools.reduce(
    (sum, p) => sum + p.volunteersOnline + p.volunteersBusy,
    0,
  );

  if (loading) {
    return (
      <HumanitarianShell lang={lang} onLangChange={setLang} dark>
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-emerald-400" />
        </div>
      </HumanitarianShell>
    );
  }

  if (entry) {
    return (
      <HumanitarianShell lang={lang} onLangChange={setLang} dark>
        <div className="max-w-lg mx-auto space-y-4 mb-4">
          <HumanitarianFlowStepper lang={lang} current="waiting" dark phoneGateEnabled={phoneGateEnabled} />
          <HumanitarianOfflineBanner lang={lang} />
        </div>
        <QueueScreen
          lang={lang}
          entry={entry}
          pools={pools}
          error={error}
          entering={entering}
          leaving={leaving}
          switching={switching}
          queueStale={queueStale}
          onEnter={enterConsultation}
          onLeave={leaveQueue}
          onSwitchPool={switchPool}
          onRejoin={() => { setEntry(null); loadCampaign(); }}
          campaignSlug={slug}
          showAnamneseReminder={!anamneseComplete}
        />
      </HumanitarianShell>
    );
  }

  return (
    <HumanitarianShell lang={lang} onLangChange={setLang} dark>
      <div className="space-y-6">
        <HumanitarianOfflineBanner lang={lang} />
        <HumanitarianFlowStepper
          lang={lang}
          current={humanitarianFlowStep(
            { triageValid: true, tcleAccepted, phoneReady, anamneseComplete },
            false,
            phoneGateEnabled,
          )}
          phoneGateEnabled={phoneGateEnabled}
          dark
        />
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 flex items-center justify-center shrink-0">
            <Heart size={24} className="text-rose-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-rose-300/80 uppercase tracking-wide font-medium">
              {t(lang, "hum.page.eyebrow")}
            </p>
            <h1 className="text-xl sm:text-2xl font-bold leading-tight text-white">
              {campaign?.name || t(lang, "hum.shell.subtitle")}
            </h1>
          </div>
        </div>

        <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
          {campaign?.description || t(lang, "hum.page.descDefault")}
        </p>

        {error && (
          <p className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        {!campaign?.active && (
          <p className="text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-sm">
            {t(lang, "hum.page.inactive")}
          </p>
        )}

        <h2 className="text-sm font-semibold text-slate-300">
          {t(lang, "hum.page.whatNeed")}
        </h2>

        {(!phoneGateEnabled || phoneReady) && selectedPool && campaign?.active && (
          <div
            ref={joinPanelRef}
            className="sticky top-[6.75rem] z-20 -mx-4 px-4 sm:-mx-6 sm:px-6 py-3 bg-slate-950/95 backdrop-blur-md border border-emerald-500/40 rounded-2xl space-y-3 shadow-lg shadow-black/30"
          >
            <button
              type="button"
              onClick={() => joinPool(selectedPool)}
              disabled={!!joining}
              className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 text-base sm:text-lg shadow-lg shadow-emerald-900/30"
            >
              {joining === selectedPool ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                t(lang, "hum.page.joinBtn")
              )}
            </button>
            <p className="text-sm text-slate-300 text-center">
              {t(lang, "hum.page.joinTitle", {
                pool: pools.find((p) => p.slug === selectedPool)?.label || "",
              })}
            </p>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">{t(lang, "hum.page.complaintLabel")}</label>
              <textarea
                value={complaint}
                onChange={(e) => setComplaint(e.target.value)}
                rows={2}
                placeholder={t(lang, "hum.page.complaintPlaceholder")}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>
            <button
              type="button"
              onClick={() => setSelectedPool(null)}
              className="w-full text-sm text-slate-500 hover:text-slate-300 py-1"
            >
              {t(lang, "hum.page.cancel")}
            </button>
          </div>
        )}

        {forceMedicalPool && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-sm text-amber-100">
            {t(lang, "hum.page.medicalUrgentHint")}
          </div>
        )}

        {computedPriority && computedPriority !== "ROUTINE" && (
          <p className="text-xs text-slate-500">
            {t(lang, `hum.triage.priorityHint.${computedPriority.toLowerCase()}`)}
          </p>
        )}

        {phoneGateEnabled && !phoneReady && tcleAccepted && (
          <HumanitarianPhoneGate
            lang={lang}
            campaignSlug={slug}
            enabled={phoneGateEnabled}
            onReady={() => setPhoneReady(true)}
          />
        )}

        {(!phoneGateEnabled || phoneReady) && (
        <>
        {totalVolunteersOnline === 0 && campaign?.active && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 space-y-1">
            <p className="text-sm font-semibold text-amber-100">{t(lang, "hum.noVolunteersTitle")}</p>
            <p className="text-xs text-amber-200/80 leading-relaxed">{t(lang, "hum.noVolunteersText")}</p>
            <NoVolunteersScheduledCta lang={lang} />
          </div>
        )}

        <div className="space-y-3">
          {pools.map((pool) => (
            <button
              key={pool.slug}
              type="button"
              disabled={!campaign?.active || pool.isFull || !!joining}
              onClick={() => setSelectedPool(pool.slug)}
              className={`w-full text-left bg-white/5 hover:bg-white/10 border rounded-2xl p-4 sm:p-5 transition disabled:opacity-40 disabled:cursor-not-allowed ${
                selectedPool === pool.slug
                  ? "border-emerald-400/50 ring-1 ring-emerald-400/30 bg-emerald-500/10"
                  : forceMedicalPool && pool.slug === "medico"
                    ? "border-amber-400/50 ring-1 ring-amber-400/30"
                    : "border-white/10"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-white text-base">{pool.label}</p>
                  <p className="text-xs text-slate-500 mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="inline-flex items-center gap-1">
                      <Clock size={12} /> {t(lang, "hum.page.waiting", { count: pool.waiting })}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users size={12} /> {t(lang, "hum.page.volunteers", { count: pool.volunteersOnline + pool.volunteersBusy })}
                    </span>
                  </p>
                </div>
                {pool.isFull ? (
                  <span className="text-xs text-rose-400 shrink-0">{t(lang, "hum.page.queueFull")}</span>
                ) : (
                  <ChevronRight size={18} className="text-slate-500 shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>

        </>
        )}

        <p className="text-center text-xs text-slate-500 leading-relaxed px-2">
          {t(lang, "hum.page.disclaimer")}
        </p>
        <p className="text-center text-sm">
          <Link
            href={`/humanitarian/${slug}/triage?retake=1`}
            className="text-slate-500 hover:text-slate-300 text-xs underline underline-offset-2"
          >
            {t(lang, "hum.page.retakeTriage")}
          </Link>
          {" \u00b7 "}
          <Link
            href={`/humanitarian/${slug}/anamnese`}
            className="text-slate-400 hover:text-emerald-400 underline underline-offset-2"
          >
            {t(lang, "hum.page.anamneseLink")}
          </Link>
        </p>
        <p className="text-center text-xs text-slate-600">{t(lang, "hum.page.footer")}</p>
      </div>
    </HumanitarianShell>
  );
}

function QueueScreen({
  lang,
  entry,
  pools,
  error,
  entering,
  leaving,
  switching,
  onEnter,
  onLeave,
  onSwitchPool,
  onRejoin,
  campaignSlug,
  showAnamneseReminder,
  queueStale = false,
}: {
  lang: Lang;
  entry: QueueEntry;
  pools: PoolInfo[];
  error: string | null;
  entering: boolean;
  leaving: boolean;
  switching: string | null;
  queueStale?: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onSwitchPool: (poolSlug: string, currentPoolLabel: string) => void;
  onRejoin: () => void;
  campaignSlug: string;
  showAnamneseReminder?: boolean;
}) {
  const card = "bg-slate-900 border rounded-2xl p-6 sm:p-8 text-center w-full";
  const currentPoolSlug = entry.poolSlug;
  const otherPools = pools.filter(
    (p) => p.slug !== currentPoolSlug && !p.isFull,
  );

  function ChangeServiceBlock({ className = "" }: { className?: string }) {
    if (otherPools.length === 0) return null;
    return (
      <div className={`mt-6 pt-6 border-t border-white/10 text-left ${className}`}>
        <p className="text-sm text-slate-400 mb-3 text-center">
          {t(lang, "hum.page.changeServiceHint")}
        </p>
        <div className="space-y-2">
          {otherPools.map((pool) => (
            <button
              key={pool.slug}
              type="button"
              disabled={!!switching || leaving}
              onClick={() => onSwitchPool(pool.slug, entry.poolLabel)}
              className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-4 py-3 transition disabled:opacity-50"
            >
              <span className="text-sm font-medium text-white">{pool.label}</span>
              <span className="block text-xs text-slate-500 mt-0.5">
                {t(lang, "hum.page.waiting", { count: pool.waiting })}
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onLeave}
          disabled={leaving || !!switching}
          className="w-full mt-3 text-sm text-slate-500 hover:text-slate-300 py-2 disabled:opacity-50"
        >
          {leaving ? t(lang, "hum.page.leaving") : t(lang, "hum.page.leaveQueue")}
        </button>
      </div>
    );
  }

  if (entry.status === "DONE" && entry.completionChannel === "GOOGLE_MEET") {
    return (
      <div className={`${card} border-2 border-blue-500/40`}>
        <Video size={32} className="text-blue-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">{t(lang, "hum.page.meetHandoffTitle")}</h2>
        <p className="text-slate-300 text-sm mb-4 leading-relaxed">
          {t(lang, "hum.page.meetHandoffDesc", {
            professional: entry.professionalName || t(lang, "hum.vol.patientAssigned"),
          })}
        </p>
        <p className="text-slate-500 text-xs mb-6">{t(lang, "hum.page.meetHandoffHint")}</p>
        {entry.meetingUrl && (
          <a
            href={entry.meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm text-center mb-3"
          >
            {t(lang, "hum.page.meetHandoffJoin")}
          </a>
        )}
        <button
          type="button"
          onClick={onRejoin}
          className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm"
        >
          {t(lang, "hum.page.meetHandoffBack")}
        </button>
      </div>
    );
  }

  if (entry.status === "DONE" && entry.completionChannel === "WHATSAPP") {
    return (
      <div className={`${card} border-2 border-[#25D366]/40`}>
        <MessageCircle size={32} className="text-[#25D366] mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">{t(lang, "hum.page.whatsappHandoffTitle")}</h2>
        <p className="text-slate-300 text-sm mb-4 leading-relaxed">
          {t(lang, "hum.page.whatsappHandoffDesc", {
            professional: entry.professionalName || t(lang, "hum.vol.patientAssigned"),
          })}
        </p>
        <p className="text-slate-500 text-xs mb-6">{t(lang, "hum.page.whatsappHandoffHint")}</p>
        <button
          type="button"
          onClick={onRejoin}
          className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm"
        >
          {t(lang, "hum.page.whatsappHandoffBack")}
        </button>
      </div>
    );
  }

  if (entry.status === "NO_SHOW") {
    return (
      <div className={`${card} border-white/10`}>
        <AlertCircle size={32} className="text-rose-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">{t(lang, "hum.page.missedTitle")}</h2>
        <p className="text-slate-400 text-sm mb-6">{t(lang, "hum.page.missedDesc")}</p>
        <button type="button" onClick={onRejoin} className="w-full py-3 rounded-xl bg-emerald-500 text-white font-semibold">
          {t(lang, "hum.page.rejoin")}
        </button>
      </div>
    );
  }

  if (entry.status === "CANCELLED") {
    return (
      <div className={`${card} border-white/10`}>
        <AlertCircle size={32} className="text-amber-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">{t(lang, "hum.connectionLostTitle")}</h2>
        <p className="text-slate-400 text-sm mb-6">{t(lang, "hum.connectionLostText")}</p>
        <button type="button" onClick={onRejoin} className="w-full py-3 rounded-xl bg-emerald-500 text-white font-semibold">
          {t(lang, "hum.page.rejoin")}
        </button>
      </div>
    );
  }

  if (entry.status === "CALLED") {
    return (
      <div className={`${card} border-2 border-emerald-500/50`}>
        <Phone size={32} className="text-emerald-400 mx-auto mb-4 animate-bounce" />
        <h2 className="text-2xl font-bold text-emerald-300 mb-2">{t(lang, "hum.page.calledTitle")}</h2>
        {entry.professionalName && <p className="text-slate-300 mb-2">{entry.professionalName}</p>}
        <p className="text-slate-400 text-sm mb-6">{t(lang, "hum.page.calledDesc")}</p>
        {error && <p className="text-rose-400 text-sm mb-3">{error}</p>}
        <button
          type="button"
          onClick={onEnter}
          disabled={entering}
          className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {entering ? <Loader2 size={18} className="animate-spin" /> : <><Phone size={18} /> {t(lang, "hum.page.enterNow")}</>}
        </button>
        <ChangeServiceBlock />
      </div>
    );
  }

  if (entry.status === "IN_PROGRESS") {
    return (
      <div className={`${card} border-2 border-blue-500/50`}>
        <Stethoscope size={32} className="text-blue-400 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-white mb-4">{t(lang, "hum.page.inProgressTitle")}</h2>
        <Link
          href={`/video/humanitarian/${entry.id}`}
          className="w-full py-3.5 rounded-xl bg-blue-500 text-white font-bold flex items-center justify-center gap-2"
        >
          <Phone size={16} /> {t(lang, "hum.page.enterRoom")}
        </Link>
      </div>
    );
  }

  return (
    <div className={`${card} border-white/10`}>
      <Radio size={32} className="text-emerald-400 mx-auto mb-4 animate-pulse" />
      <h2 className="text-lg font-bold text-white mb-1">{t(lang, "hum.page.waitingTitle")}</h2>
      <p className="text-slate-400 text-sm mb-6">{entry.poolLabel}</p>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white/5 rounded-xl p-4">
          <p className="text-3xl font-bold text-emerald-400">{entry.aheadCount + 1}</p>
          <p className="text-xs text-slate-500 mt-1">{t(lang, "hum.page.yourPosition")}</p>
        </div>
        {entry.onlineVolunteers === 0 || entry.estimatedWaitMinutes == null ? (
          <div className="bg-white/5 rounded-xl p-4 col-span-1 space-y-2">
            <p className="text-sm font-semibold text-amber-200/90 leading-snug">{t(lang, "hum.noVolunteersTitle")}</p>
            <p className="text-xs text-slate-500">{t(lang, "hum.noVolunteersText")}</p>
            <NoVolunteersScheduledCta lang={lang} />
          </div>
        ) : (
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-3xl font-bold text-slate-200">~{entry.estimatedWaitMinutes}</p>
            <p className="text-xs text-slate-500 mt-1">{t(lang, "hum.page.estMinutes")}</p>
          </div>
        )}
      </div>
      <p className="text-xs text-slate-500 mb-4 flex items-center justify-center gap-1">
        <Users size={14} /> {t(lang, "hum.page.volOnline", { count: entry.onlineVolunteers })}
      </p>
      <p className="text-xs text-slate-500 mb-6">{t(lang, "hum.page.keepOpen")}</p>
      {queueStale && (
        <p className="text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-2 mb-4">
          {t(lang, "hum.offline.queueStale")}
        </p>
      )}
      {showAnamneseReminder && entry.status === "WAITING" && (
        <Link
          href={`/humanitarian/${campaignSlug}/anamnese`}
          className="block mb-4 text-sm text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
        >
          {t(lang, "hum.anamnese.waitingHint")}
        </Link>
      )}
      {switching && (
        <p className="text-sm text-emerald-400 mb-4 flex items-center justify-center gap-2">
          <Loader2 size={14} className="animate-spin" />
          {t(lang, "hum.page.switching")}
        </p>
      )}
      <ChangeServiceBlock />
    </div>
  );
}
