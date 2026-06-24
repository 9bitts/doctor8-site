"use client";

import { useState, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  Globe, Copy, CheckCircle2, Loader2, ExternalLink, Eye, EyeOff, Clock, MapPin,
  BarChart3, MousePointerClick, CalendarCheck,
} from "lucide-react";

type ProfileAnalytics = {
  views7d: number;
  views30d: number;
  bookClicks7d: number;
  bookClicks30d: number;
  bookings30d: number;
  conversionRate30d: number | null;
};

type ListingInfo = {
  slug: string;
  isPublic: boolean;
  publicUrl: string | null;
  shortUrl: string;
  status: "pending_approval" | "hidden" | "live";
  verified: boolean;
  googleBusinessUrl: string | null;
  analytics?: ProfileAnalytics;
};

export default function PublicListingSettings({ apiPath }: { apiPath: string }) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingGoogle, setSavingGoogle] = useState(false);
  const [copied, setCopied] = useState(false);
  const [info, setInfo] = useState<ListingInfo | null>(null);
  const [googleUrl, setGoogleUrl] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(apiPath);
      if (res.ok) {
        const data = await res.json();
        setInfo(data);
        setGoogleUrl(data.googleBusinessUrl || "");
      }
    } catch { /* ignore */ }
    setLoading(false);
  }

  useEffect(() => { load(); }, [apiPath]);

  async function togglePublic() {
    if (!info) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(apiPath, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: !info.isPublic }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("pub.errGeneric"));
      setInfo((prev) => prev ? { ...prev, ...data } : prev);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("pub.errGeneric"));
    } finally {
      setSaving(false);
    }
  }

  async function saveGoogleUrl() {
    setSavingGoogle(true);
    setError("");
    try {
      const res = await fetch(apiPath, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ googleBusinessUrl: googleUrl.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("pub.googleBusinessInvalid"));
      setInfo((prev) => prev ? { ...prev, googleBusinessUrl: data.googleBusinessUrl } : prev);
      setGoogleUrl(data.googleBusinessUrl || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("pub.googleBusinessInvalid"));
    } finally {
      setSavingGoogle(false);
    }
  }

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex items-center gap-2 text-slate-400 text-sm">
        <Loader2 size={16} className="animate-spin" /> {t("pub.loading")}
      </div>
    );
  }

  if (!info) return null;

  const shareUrl = info.publicUrl || info.shortUrl;
  const statusColors = {
    pending_approval: "bg-amber-50 text-amber-700 border-amber-200",
    hidden: "bg-slate-50 text-slate-600 border-slate-200",
    live: "bg-brand-50 text-brand-600 border-brand-200",
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <Globe size={18} className="text-brand-500" /> {t("pub.title")}
          </h2>
          <p className="text-sm text-slate-500 mt-1">{t("pub.subtitle")}</p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border shrink-0 ${statusColors[info.status]}`}>
          {t(`pub.status.${info.status}`)}
        </span>
      </div>

      {info.status === "pending_approval" && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm text-amber-800">
          <Clock size={16} className="shrink-0 mt-0.5" />
          <p>{t("pub.pendingHint")}</p>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700">{error}</div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePublic}
          disabled={saving || !info.verified}
          className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50 ${
            info.isPublic && info.verified ? "bg-brand-500" : "bg-slate-200"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition mt-1 ${
              info.isPublic && info.verified ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
        <div className="flex items-center gap-2 text-sm text-slate-700">
          {info.isPublic ? <Eye size={16} className="text-brand-500" /> : <EyeOff size={16} className="text-slate-400" />}
          {t("pub.toggleLabel")}
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-2">
        <input
          readOnly
          value={shareUrl}
          className="flex-1 bg-transparent text-sm text-slate-600 outline-none truncate"
        />
        <button
          type="button"
          onClick={() => copyUrl(shareUrl)}
          className="shrink-0 p-2 rounded-lg hover:bg-white text-slate-500 hover:text-brand-500 transition"
          title={t("pub.copy")}
        >
          {copied ? <CheckCircle2 size={16} className="text-brand-500" /> : <Copy size={16} />}
        </button>
        {info.status === "live" && (
          <Link
            href={info.publicUrl!}
            target="_blank"
            className="shrink-0 p-2 rounded-lg hover:bg-white text-slate-500 hover:text-brand-500 transition"
          >
            <ExternalLink size={16} />
          </Link>
        )}
      </div>

      {info.analytics && (
        <div className="border-t border-slate-100 pt-4 space-y-3">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <BarChart3 size={16} className="text-brand-500" />
            {t("pubAnalytics.title")}
          </h3>
          <p className="text-xs text-slate-500">{t("pubAnalytics.subtitle")}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <StatCard
              label={t("pubAnalytics.views7d")}
              value={info.analytics.views7d}
              icon={<Eye size={14} className="text-brand-500" />}
            />
            <StatCard
              label={t("pubAnalytics.views30d")}
              value={info.analytics.views30d}
              icon={<Eye size={14} className="text-slate-400" />}
            />
            <StatCard
              label={t("pubAnalytics.clicks7d")}
              value={info.analytics.bookClicks7d}
              icon={<MousePointerClick size={14} className="text-brand-500" />}
            />
            <StatCard
              label={t("pubAnalytics.clicks30d")}
              value={info.analytics.bookClicks30d}
              icon={<MousePointerClick size={14} className="text-slate-400" />}
            />
            <StatCard
              label={t("pubAnalytics.bookings30d")}
              value={info.analytics.bookings30d}
              icon={<CalendarCheck size={14} className="text-emerald-500" />}
            />
            <StatCard
              label={t("pubAnalytics.conversion30d")}
              value={
                info.analytics.conversionRate30d != null
                  ? `${info.analytics.conversionRate30d}%`
                  : "?"
              }
              icon={<BarChart3 size={14} className="text-amber-500" />}
            />
          </div>
        </div>
      )}

      <div className="border-t border-slate-100 pt-4 space-y-2">
        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
          <MapPin size={16} className="text-brand-500" />
          {t("pub.googleBusinessLabel")}
        </label>
        <p className="text-xs text-slate-500">{t("pub.googleBusinessHint")}</p>
        <div className="flex gap-2">
          <input
            type="url"
            value={googleUrl}
            onChange={(e) => setGoogleUrl(e.target.value)}
            placeholder={t("pub.googleBusinessPlaceholder")}
            className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
          <button
            type="button"
            onClick={saveGoogleUrl}
            disabled={savingGoogle}
            className="shrink-0 bg-brand-500 hover:bg-brand-400 text-white text-sm font-semibold px-4 py-2 rounded-xl disabled:opacity-50 transition"
          >
            {savingGoogle ? <Loader2 size={16} className="animate-spin" /> : t("pub.googleBusinessSave")}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon: ReactNode;
}) {
  return (
    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1">
        {icon}
        <span className="leading-tight">{label}</span>
      </div>
      <p className="text-lg font-bold text-slate-800">{value}</p>
    </div>
  );
}
