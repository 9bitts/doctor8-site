"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Heart, Loader2, Radio, Phone, AlertCircle, Stethoscope,
  Users, Clock, ChevronRight,
} from "lucide-react";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import { translate, Lang } from "@/lib/i18n/translations";
import HumanitarianShell from "@/components/humanitarian/HumanitarianShell";
import { getHumanitarianLang } from "@/components/humanitarian/HumanitarianLangSwitcher";

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
  estimatedWaitMinutes: number;
  onlineVolunteers: number;
  poolLabel: string;
  professionalName: string | null;
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLang(getHumanitarianLang());
  }, []);

  const loadCampaign = useCallback(async () => {
    try {
      const res = await fetch(`/api/humanitarian/campaigns/${slug}?lang=${lang}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t(lang, "hum.page.unavailable"));
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
      .then((s) => {
        if (!s?.user) {
          router.push("/login?callbackUrl=/patient");
          return;
        }
        if (s.user.role !== "PATIENT") {
          router.push("/humanitarian/volunteer");
          return;
        }

        const intakeRes = await fetch(`/api/humanitarian/intake?campaignSlug=${slug}`);
        const intakeData = await intakeRes.json();
        if (intakeRes.ok && !intakeData.intake?.triageValid) {
          router.replace(`/humanitarian/${slug}/triage`);
          return;
        }
        if (intakeRes.ok && intakeData.intake) {
          setForceMedicalPool(!!intakeData.intake.forceMedicalPool);
          setComputedPriority(intakeData.intake.computedPriority ?? null);
        }

        loadCampaign();
      })
      .catch(() => router.push("/login?callbackUrl=/patient"));

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [router, slug, loadCampaign]);

  useEffect(() => {
    if (!loading) loadCampaign();
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  function startPolling(entryId: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollEntry(entryId);
    pollRef.current = setInterval(() => pollEntry(entryId), 3000);
  }

  async function pollEntry(entryId: string) {
    try {
      const res = await fetch(`/api/humanitarian/queue?entryId=${entryId}&lang=${lang}`);
      const data = await res.json();
      if (res.ok && data.entry) {
        setEntry(data.entry);
        if (["DONE", "CANCELLED", "NO_SHOW"].includes(data.entry.status)) {
          clearInterval(pollRef.current);
        }
      }
    } catch { /* ignore */ }
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
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "TRIAGE_REQUIRED") {
          router.replace(`/humanitarian/${slug}/triage`);
          return;
        }
        setError(data.message || data.error || t(lang, "hum.page.queueError"));
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
        setError(data.error || t(lang, "hum.page.networkError"));
        setEntering(false);
        return;
      }
      window.location.href = `/video/humanitarian/${entry.id}`;
    } catch {
      setError(t(lang, "hum.page.networkError"));
    }
    setEntering(false);
  }

  async function leaveQueue() {
    if (!entry) return;
    await fetch("/api/humanitarian/queue/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryId: entry.id }),
    }).catch(() => {});
    clearInterval(pollRef.current);
    setEntry(null);
    loadCampaign();
  }

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
        <QueueScreen
          lang={lang}
          entry={entry}
          error={error}
          entering={entering}
          onEnter={enterConsultation}
          onLeave={leaveQueue}
          onRejoin={() => { setEntry(null); loadCampaign(); }}
        />
      </HumanitarianShell>
    );
  }

  return (
    <HumanitarianShell lang={lang} onLangChange={setLang} dark>
      <div className="space-y-6">
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

        <div className="space-y-3">
          {pools.map((pool) => (
            <button
              key={pool.slug}
              type="button"
              disabled={!campaign?.active || pool.isFull || !!joining}
              onClick={() => setSelectedPool(pool.slug)}
              className={`w-full text-left bg-white/5 hover:bg-white/10 border rounded-2xl p-4 sm:p-5 transition disabled:opacity-40 disabled:cursor-not-allowed ${
                forceMedicalPool && pool.slug === "medico"
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

        {selectedPool && campaign?.active && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
            <p className="text-sm text-slate-300">
              {t(lang, "hum.page.joinTitle", {
                pool: pools.find((p) => p.slug === selectedPool)?.label || "",
              })}
            </p>

            <div>
              <label className="block text-xs text-slate-500 mb-1.5">{t(lang, "hum.page.complaintLabel")}</label>
              <textarea
                value={complaint}
                onChange={(e) => setComplaint(e.target.value)}
                rows={3}
                placeholder={t(lang, "hum.page.complaintPlaceholder")}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>

            <button
              type="button"
              onClick={() => joinPool(selectedPool)}
              disabled={!!joining}
              className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base"
            >
              {joining === selectedPool ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                t(lang, "hum.page.joinBtn")
              )}
            </button>
            <button
              type="button"
              onClick={() => setSelectedPool(null)}
              className="w-full text-sm text-slate-500 hover:text-slate-300 py-2"
            >
              {t(lang, "hum.page.cancel")}
            </button>
          </div>
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
          {" ? "}
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
  error,
  entering,
  onEnter,
  onLeave,
  onRejoin,
}: {
  lang: Lang;
  entry: QueueEntry;
  error: string | null;
  entering: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onRejoin: () => void;
}) {
  const card = "bg-slate-900 border rounded-2xl p-6 sm:p-8 text-center w-full";

  if (entry.status === "NO_SHOW" || entry.status === "CANCELLED") {
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
        <div className="bg-white/5 rounded-xl p-4">
          <p className="text-3xl font-bold text-slate-200">~{entry.estimatedWaitMinutes}</p>
          <p className="text-xs text-slate-500 mt-1">{t(lang, "hum.page.estMinutes")}</p>
        </div>
      </div>
      <p className="text-xs text-slate-500 mb-4 flex items-center justify-center gap-1">
        <Users size={14} /> {t(lang, "hum.page.volOnline", { count: entry.onlineVolunteers })}
      </p>
      <p className="text-xs text-slate-500 mb-6">{t(lang, "hum.page.keepOpen")}</p>
      <button type="button" onClick={onLeave} className="text-sm text-slate-500 hover:text-slate-300 underline">
        {t(lang, "hum.page.leaveQueue")}
      </button>
    </div>
  );
}
