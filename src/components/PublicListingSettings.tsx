"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  Globe, Copy, CheckCircle2, Loader2, ExternalLink, Eye, EyeOff, Clock,
} from "lucide-react";

type ListingInfo = {
  slug: string;
  isPublic: boolean;
  publicUrl: string | null;
  shortUrl: string;
  status: "pending_approval" | "hidden" | "live";
  verified: boolean;
};

export default function PublicListingSettings({ apiPath }: { apiPath: string }) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [info, setInfo] = useState<ListingInfo | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(apiPath);
      if (res.ok) setInfo(await res.json());
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
    </div>
  );
}
