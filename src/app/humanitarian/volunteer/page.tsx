"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Heart, Loader2, Power, PowerOff, Phone, Users, Radio,
  CheckCircle2, AlertCircle, MessageCircle,
} from "lucide-react";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import { translate, Lang } from "@/lib/i18n/translations";
import HumanitarianShell from "@/components/humanitarian/HumanitarianShell";
import HumanitarianIntakeSummary from "@/components/humanitarian/HumanitarianIntakeSummary";
import { getHumanitarianLang } from "@/components/humanitarian/HumanitarianLangSwitcher";

interface PoolRow {
  id: string;
  slug: string;
  labelEs: string;
  labelPt: string;
  labelEn: string;
  waiting: number;
  volunteersOnline: number;
  myStatus: string;
}

interface CurrentEntry {
  id: string;
  status: string;
  chiefComplaint: string | null;
  patientName: string;
  patientPhoneAvailable?: boolean;
  intakeSummary?: {
    priority: string | null;
    status: string;
    anamneseComplete: boolean;
    sections: { title: string; items: { label: string; value: string }[] }[];
  } | null;
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

function poolLabel(pool: PoolRow, lang: Lang) {
  if (lang === "pt") return pool.labelPt;
  if (lang === "en") return pool.labelEn;
  return pool.labelEs;
}

export default function HumanitarianVolunteerPage() {
  const router = useRouter();
  const pollRef = { current: null as NodeJS.Timeout | null };

  const [lang, setLang] = useState<Lang>("es");
  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<{ name: string; active: boolean } | null>(null);
  const [pools, setPools] = useState<PoolRow[]>([]);
  const [currentEntry, setCurrentEntry] = useState<CurrentEntry | null>(null);
  const [activePoolSlug, setActivePoolSlug] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLang(getHumanitarianLang());
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/humanitarian/volunteer?campaignSlug=${VENEZUELA_CAMPAIGN_SLUG}&lang=${lang}`,
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t(lang, "hum.vol.connectionError"));
        setLoading(false);
        return;
      }
      setCampaign(data.campaign);
      setPools(data.pools || []);
      setCurrentEntry(data.currentEntry);
      setActivePoolSlug(data.activeVolunteer?.poolSlug ?? null);

      if (data.activeVolunteer?.status === "ONLINE" || data.activeVolunteer?.status === "BUSY") {
        if (!pollRef.current) {
          pollRef.current = setInterval(load, 4000);
        }
      }
    } catch {
      setError(t(lang, "hum.vol.connectionError"));
    }
    setLoading(false);
  }, [lang]);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => {
        if (!s?.user) {
          router.push(`/login?callbackUrl=/humanitarian/volunteer`);
          return;
        }
        if (!["PROFESSIONAL", "PSYCHOANALYST"].includes(s.user.role)) {
          router.push(`/humanitarian/${VENEZUELA_CAMPAIGN_SLUG}`);
          return;
        }
        load();
      });
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [router, load]);

  async function togglePool(poolSlug: string, goOnline: boolean) {
    setToggling(poolSlug);
    setError(null);
    try {
      const res = await fetch("/api/humanitarian/volunteer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: goOnline ? "ONLINE" : "OFFLINE",
          campaignSlug: VENEZUELA_CAMPAIGN_SLUG,
          poolSlug,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t(lang, "hum.vol.connectionError"));
        setToggling(null);
        return;
      }
      await load();
      if (goOnline && !pollRef.current) {
        pollRef.current = setInterval(load, 4000);
      }
      if (!goOnline && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    } catch {
      setError(t(lang, "hum.page.networkError"));
    }
    setToggling(null);
  }

  async function requestWhatsAppContact() {
    if (!currentEntry) return;
    setWhatsappLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/humanitarian/queue/${currentEntry.id}/whatsapp-contact?lang=${lang}`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error === "NO_PHONE"
            ? t(lang, "hum.vol.noPatientPhone")
            : data.message || t(lang, "hum.page.networkError"),
        );
        return;
      }
      if (data.whatsappUrl) {
        window.open(data.whatsappUrl, "_blank", "noopener,noreferrer");
      }
      setCurrentEntry(null);
      await load();
    } catch {
      setError(t(lang, "hum.page.networkError"));
    }
    setWhatsappLoading(false);
  }

  async function completeConsultation() {
    if (!currentEntry) return;
    setCompleting(true);
    try {
      await fetch("/api/humanitarian/queue/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: currentEntry.id }),
      });
      setCurrentEntry(null);
      await load();
    } catch {
      setError(t(lang, "hum.page.networkError"));
    }
    setCompleting(false);
  }

  if (loading) {
    return (
      <HumanitarianShell lang={lang} onLangChange={setLang}>
        <div className="flex items-center justify-center py-24">
          <Loader2 size={24} className="animate-spin text-emerald-500" />
        </div>
      </HumanitarianShell>
    );
  }

  return (
    <HumanitarianShell lang={lang} onLangChange={setLang}>
      <div className="space-y-6">
        <div>
          <p className="text-xs text-rose-600 font-medium uppercase tracking-wide">
            {t(lang, "hum.shell.volunteer")}
          </p>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            {campaign?.name || t(lang, "hum.shell.subtitle")}
          </h1>
        </div>

        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          {t(lang, "hum.vol.intro")}
        </p>

        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 sm:p-5 text-sm text-blue-900 space-y-2">
          <p className="font-semibold">{t(lang, "hum.vol.guideTitle")}</p>
          <ul className="list-disc list-inside space-y-1 text-blue-800 text-xs sm:text-sm pl-1">
            <li>{t(lang, "hum.vol.guide1")}</li>
            <li>{t(lang, "hum.vol.guide2")}</li>
            <li>{t(lang, "hum.vol.guide3")}</li>
            <li>{t(lang, "hum.vol.guide4")}</li>
            <li>{t(lang, "hum.vol.guide5")}</li>
          </ul>
        </div>

        {error && (
          <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" /> {error}
          </p>
        )}

        {currentEntry && ["CALLED", "IN_PROGRESS"].includes(currentEntry.status) && (
          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 text-emerald-800 font-semibold">
              <Radio size={18} className="animate-pulse" />
              {t(lang, "hum.vol.patientAssigned")}
            </div>
            <p className="text-lg font-bold text-slate-900">{currentEntry.patientName}</p>
            <HumanitarianIntakeSummary
              summary={currentEntry.intakeSummary ?? null}
              chiefComplaint={currentEntry.chiefComplaint}
              compact
              lang={lang}
            />
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={`/video/humanitarian/${currentEntry.id}`}
                className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm flex items-center justify-center gap-2"
              >
                <Phone size={16} /> {t(lang, "hum.vol.enterConsult")}
              </Link>
              <button
                type="button"
                onClick={requestWhatsAppContact}
                disabled={whatsappLoading || !currentEntry.patientPhoneAvailable}
                title={
                  !currentEntry.patientPhoneAvailable
                    ? t(lang, "hum.vol.noPatientPhone")
                    : undefined
                }
                className="flex-1 py-3 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {whatsappLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <MessageCircle size={16} />
                )}
                {t(lang, "hum.vol.requestWhatsApp")}
              </button>
              <button
                type="button"
                onClick={completeConsultation}
                disabled={completing}
                className="flex-1 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {completing ? <Loader2 size={16} className="animate-spin" /> : <><CheckCircle2 size={16} /> {t(lang, "hum.vol.finishNext")}</>}
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">{t(lang, "hum.vol.poolsTitle")}</h2>
          {pools.length === 0 && (
            <p className="text-sm text-slate-500">{t(lang, "hum.vol.noPools")}</p>
          )}
          {pools.map((pool) => {
            const isOnline = pool.myStatus === "ONLINE" || pool.myStatus === "BUSY";
            const isBusy = pool.myStatus === "BUSY";
            return (
              <div key={pool.slug} className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 text-base">{poolLabel(pool, lang)}</p>
                    <p className="text-xs text-slate-500 mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                      <span className="inline-flex items-center gap-1">
                        <Users size={12} /> {t(lang, "hum.vol.waiting", { count: pool.waiting })}
                      </span>
                      <span>{t(lang, "hum.vol.volOnline", { count: pool.volunteersOnline })}</span>
                    </p>
                    {isOnline && (
                      <p className="text-xs text-emerald-600 font-medium mt-2 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        {isBusy ? t(lang, "hum.vol.inConsult") : t(lang, "hum.vol.onlineReceiving")}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={!!toggling || (isBusy && isOnline)}
                    onClick={() => togglePool(pool.slug, !isOnline)}
                    className={`w-full sm:w-auto shrink-0 px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 ${
                      isOnline
                        ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        : "bg-emerald-500 text-white hover:bg-emerald-600"
                    }`}
                  >
                    {toggling === pool.slug ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : isOnline ? (
                      <><PowerOff size={16} /> {t(lang, "hum.vol.goOffline")}</>
                    ) : (
                      <><Power size={16} /> {t(lang, "hum.vol.goOnline")}</>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {activePoolSlug && !currentEntry && (
          <p className="text-sm text-slate-500 text-center flex items-center justify-center gap-2 py-4">
            <Loader2 size={14} className="animate-spin" /> {t(lang, "hum.vol.waitingNext")}
          </p>
        )}
      </div>
    </HumanitarianShell>
  );
}
