"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Award, BarChart3, Heart, Loader2, Users } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

type ImpactStats = {
  totalMinutes: number;
  monthMinutes: number;
  patientsSupported: number;
  followUpCount: number;
  missionsCompleted: number;
  hoursByTrack: { track: string; minutes: number }[];
  milestones: { key: string; achievedAt: string }[];
  certificateEligible: boolean;
  certificateMinMinutes: number;
  certificate: { verifyCode: string; issuedAt: string; totalMinutes: number } | null;
};

export default function AngelImpactClient() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ImpactStats | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [certUrl, setCertUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/humanitarian/angel/impact");
      const data = await res.json();
      if (res.ok) setStats(data);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function issueCertificate() {
    setIssuing(true);
    try {
      const res = await fetch("/api/humanitarian/angel/certificate");
      const data = await res.json();
      if (res.ok && data.available) {
        setCertUrl(data.certificate.verifyUrl);
        await load();
      }
    } catch {
      /* ignore */
    }
    setIssuing(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
      </div>
    );
  }

  if (!stats) {
    return <p className="text-center text-slate-500 py-12">{t("angel.impact.loadError")}</p>;
  }

  const totalHours = (stats.totalMinutes / 60).toFixed(1);
  const monthHours = (stats.monthMinutes / 60).toFixed(1);
  const minHours = (stats.certificateMinMinutes / 60).toFixed(0);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center">
          <BarChart3 className="w-6 h-6 text-rose-500" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-rose-600 font-semibold">
            {t("angel.impact.eyebrow")}
          </p>
          <h1 className="text-xl font-bold text-slate-900">{t("angel.impact.title")}</h1>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: Heart, label: t("angel.impact.totalHours"), value: totalHours },
          { icon: BarChart3, label: t("angel.impact.monthHours"), value: monthHours },
          { icon: Users, label: t("angel.impact.patients"), value: String(stats.patientsSupported) },
          { icon: Award, label: t("angel.impact.missions"), value: String(stats.missionsCompleted) },
        ].map((card) => (
          <div key={card.label} className="bg-white border border-slate-200 rounded-2xl p-4">
            <card.icon className="w-5 h-5 text-rose-500 mb-2" />
            <p className="text-2xl font-bold text-slate-900">{card.value}</p>
            <p className="text-xs text-slate-500 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">{t("angel.impact.byTrack")}</h2>
        {stats.hoursByTrack.length === 0 ? (
          <p className="text-sm text-slate-400">{t("angel.impact.noHours")}</p>
        ) : (
          <ul className="space-y-2">
            {stats.hoursByTrack.map((row) => (
              <li key={row.track} className="flex justify-between text-sm">
                <span>{t(`angel.track.${row.track}`)}</span>
                <span className="font-medium">{(row.minutes / 60).toFixed(1)} h</span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-slate-500 mt-4">
          {t("angel.impact.followUps")}: {stats.followUpCount}
        </p>
      </div>

      {stats.milestones.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">{t("angel.impact.milestones")}</h2>
          <div className="flex flex-wrap gap-2">
            {stats.milestones.map((m) => (
              <span
                key={m.key}
                className="text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 px-2 py-1 rounded-full"
              >
                {t(`angel.milestone.${m.key}`)}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">{t("angel.impact.certificateTitle")}</h2>
        {stats.certificate ? (
          <div className="space-y-2 text-sm">
            <p>{t("angel.impact.certificateIssued")}</p>
            <p className="font-mono text-xs text-slate-600">{stats.certificate.verifyCode}</p>
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/humanitarian/angel/certificado/${stats.certificate.verifyCode}`}
                className="text-rose-600 hover:text-rose-800 text-sm font-medium"
              >
                {t("angel.impact.verifyLink")}
              </Link>
              <a
                href="/api/humanitarian/angel/certificate/pdf"
                className="text-rose-600 hover:text-rose-800 text-sm font-medium"
              >
                {t("angel.impact.downloadPdf")}
              </a>
            </div>
          </div>
        ) : stats.certificateEligible ? (
          <button
            type="button"
            disabled={issuing}
            onClick={issueCertificate}
            className="rounded-xl bg-rose-600 text-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {issuing ? t("angel.impact.issuing") : t("angel.impact.issueCertificate")}
          </button>
        ) : (
          <p className="text-sm text-slate-500">
            {t("angel.impact.certificateNeedHours").replace("{{hours}}", minHours)}
          </p>
        )}
        {certUrl && (
          <p className="text-xs text-emerald-700">{t("angel.impact.certificateReady")}</p>
        )}
      </div>
    </div>
  );
}
