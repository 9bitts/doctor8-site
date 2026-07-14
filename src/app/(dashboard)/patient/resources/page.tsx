"use client";

// src/app/(dashboard)/patient/resources/page.tsx
// Inbox of materials shared by doctors from their library.

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";
import { useUserTimeZone } from "@/hooks/useUserTimeZone";
import { formatShortDateWithYear } from "@/lib/timezone";
import { getProfessionLabel } from "@/lib/professions";
import {
  BookOpen, ExternalLink, Download, Loader2, AlertCircle, RefreshCw, FileText,
} from "lucide-react";
import { openUrlAfterAsync } from "@/lib/open-url-safely";

interface ResourceItem {
  id: string;
  title: string;
  contentPreview: string | null;
  fullContent?: string | null;
  url: string | null;
  hasFile: boolean;
  sharedAt: string;
  viewedAt: string | null;
  viewCount: number;
  provider?: { name: string; specialty: string };
  doctor?: { name: string; specialty: string };
}

export default function PatientResourcesPage() {
  const { t, lang } = useI18n();
  const locale = localeOf(lang);
  const userTz = useUserTimeZone();
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch("/api/patient/resources");
      if (!res.ok) { setLoadError(true); return; }
      const d = await res.json();
      setResources(d.resources || []);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  function fmt(date: string) {
    return formatShortDateWithYear(new Date(date), userTz, locale);
  }

  async function trackView(shareId: string) {
    try {
      await fetch(`/api/patient/resources/${shareId}/view`, { method: "POST" });
    } catch { /* ignore */ }
  }

  async function openLink(shareId: string, url: string) {
    void trackView(shareId);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function downloadFile(shareId: string) {
    void trackView(shareId);
    setDownloadingId(shareId);
    setActionError(false);
    try {
      await openUrlAfterAsync(async () => {
        const res = await fetch(`/api/patient/resources/${shareId}/file`);
        const data = await res.json();
        if (res.ok && data.url) return data.url as string;
        setActionError(true);
        return null;
      });
    } catch {
      setActionError(true);
    }
    setDownloadingId(null);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("presRes.title")}</h1>
        <p className="text-slate-500 text-sm mt-1">{t("presRes.subtitle")}</p>
      </div>

      {actionError && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl">
          <AlertCircle size={16} className="shrink-0" />
          <span>{t("common.actionError")}</span>
        </div>
      )}

      {loadError ? (
        <div className="flex flex-col items-center gap-3 py-16 bg-white rounded-2xl border border-amber-200">
          <AlertCircle size={28} className="text-amber-500" />
          <p className="text-sm text-slate-600">{t("common.loadError")}</p>
          <button type="button" onClick={fetchData} className="text-sm font-semibold text-emerald-600 flex items-center gap-1">
            <RefreshCw size={14} /> {t("common.retry")}
          </button>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-slate-400" /></div>
      ) : resources.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <BookOpen size={40} className="text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">{t("presRes.empty")}</p>
          <p className="text-slate-400 text-xs mt-1">{t("presRes.emptyHint")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {resources.map((r) => {
            const provider = r.provider ?? r.doctor ?? { name: "", specialty: "" };
            const showFull = expandedId === r.id;
            const textBody = showFull ? (r.fullContent || r.contentPreview) : r.contentPreview;
            return (
            <div key={r.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800">{r.title}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {t("presRes.fromProvider").replace("{{name}}", provider.name)}
                    {provider.specialty && (
                      <span> · {getProfessionLabel(lang, provider.specialty)}</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t("presRes.sharedAt").replace("{{date}}", fmt(r.sharedAt))}
                  </p>
                  {textBody && (
                    <div className="mt-2">
                      <p className={`text-sm text-slate-600 whitespace-pre-line ${!showFull ? "line-clamp-3" : ""}`}>
                        {textBody}
                      </p>
                      {(r.fullContent && r.fullContent.length > 300) && (
                        <button
                          type="button"
                          onClick={() => setExpandedId(showFull ? null : r.id)}
                          className="text-xs text-brand-600 mt-1 font-medium"
                        >
                          {showFull ? t("libHub.seeLess") : t("libHub.seeMore")}
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  {r.url && (
                    <button
                      type="button"
                      onClick={() => openLink(r.id, r.url!)}
                      className="flex items-center gap-2 border border-slate-200 hover:border-slate-300 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold transition"
                    >
                      <ExternalLink size={14} /> {t("presRes.openLink")}
                    </button>
                  )}
                  {r.hasFile && (
                    <button
                      type="button"
                      onClick={() => downloadFile(r.id)}
                      disabled={downloadingId === r.id}
                      className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-semibold transition"
                    >
                      {downloadingId === r.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                      {t("presRes.downloadFile")}
                    </button>
                  )}
                  {!r.url && !r.hasFile && (
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <FileText size={14} /> {r.title}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
          })}
        </div>
      )}
    </div>
  );
}
