"use client";

// src/app/(dashboard)/professional/shared/SharedWithMeClient.tsx
// Documents patients shared with this professional + chart actions. i18n via useT().

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import AiSummarizeButton from "@/components/AiSummarizeButton";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { professionalPatientsHref } from "@/lib/psychologist-portal";
import { getCategoryLabel } from "@/lib/category-i18n";
import {
  FileText, Download, Loader2, Tag, User, FolderPlus, FolderOpen, FilePlus2, CheckCircle2,
  Users, Eye, Pencil,
} from "lucide-react";
import { openUrlAfterAsync } from "@/lib/open-url-safely";

interface TeamChart {
  shareId: string;
  recordId: string;
  permission: string;
  patientName: string;
  ownerName: string;
  ownerSpecialty: string;
  sharedVia: string;
  sharedAt: string;
}

interface Item {
  shareId: string;
  documentId: string;
  title: string;
  content: string | null;
  categoryName: string | null;
  categoryGroup: string | null;
  type: string;
  hasFile: boolean;
  patientName: string;
  patientFirstName: string;
  patientLastName: string;
  patientEmail: string | null;
  existingChartId: string | null;
  alreadyAttached?: boolean;
  sharedAt: string;
}

const LEGACY_KEYS: Record<string, string> = {
  PRESCRIPTION: "doctype.PRESCRIPTION",
  EXAM_REQUEST: "doctype.EXAM_REQUEST",
  EXAM_RESULT: "doctype.EXAM_RESULT",
  CERTIFICATE: "doctype.CERTIFICATE",
  REFERRAL: "doctype.REFERRAL",
  CLINICAL_NOTE: "doctype.CLINICAL_NOTE",
  OTHER: "doctype.OTHER",
};

export default function SharedWithMeClient({ initialItems }: { initialItems: Item[] }) {
  const { lang, t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [items, setItems] = useState<Item[]>(initialItems);
  const [teamCharts, setTeamCharts] = useState<TeamChart[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const legacyLabel = (type: string) => t(LEGACY_KEYS[type] || "doctype.OTHER");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [sharedRes, chartsRes] = await Promise.all([
          fetch("/api/professional/shared"),
          fetch("/api/professional/records/shared-charts"),
        ]);
        const sharedData = await sharedRes.json();
        const chartsData = await chartsRes.json();
        if (!active) return;
        if (Array.isArray(sharedData.items)) setItems(sharedData.items);
        if (Array.isArray(chartsData.charts)) setTeamCharts(chartsData.charts);
      } catch { /* keep initial */ }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const documentId = new URLSearchParams(window.location.search).get("documentId");
    if (!documentId) return;
    const el = document.getElementById(`shared-doc-${documentId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.classList.add("ring-2", "ring-brand-400", "bg-brand-50/40");
  }, [items]);

  async function handleDownload(documentId: string) {
    setDownloadingId(documentId);
    try {
      await openUrlAfterAsync(async () => {
        const res = await fetch(`/api/professional/shared?documentId=${documentId}`);
        const data = await res.json();
        if (res.ok && data.url) return data.url as string;
        return null;
      });
    } catch { /* ignore */ }
    setDownloadingId(null);
  }

  async function handleCreateChart(it: Item) {
    setBusyId(it.shareId);
    try {
      const res = await fetch("/api/professional/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: it.patientFirstName || "Patient",
          lastName: it.patientLastName || "",
          email: it.patientEmail || "",
          attachDocumentId: it.documentId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.id) {
        router.push(professionalPatientsHref(pathname, data.id));
      }
    } catch { /* ignore */ }
    setBusyId(null);
  }

  async function handleAddToChart(it: Item) {
    if (!it.existingChartId) return;
    setBusyId(it.shareId);
    try {
      const res = await fetch(`/api/professional/shared/${it.documentId}/attach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chartId: it.existingChartId }),
      });
      const data = await res.json();
      if (res.ok && data.attached) {
        setItems((prev) => prev.map((p) =>
          p.shareId === it.shareId ? { ...p, alreadyAttached: true } : p
        ));
      }
    } catch { /* ignore */ }
    setBusyId(null);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("shared.title")}</h1>
        <p className="text-slate-500 mt-1">{t("shared.subtitle")}</p>
      </div>

      {teamCharts.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <Users size={18} className="text-brand-500" /> {t("shared.teamChartsTitle")}
            </h2>
            <p className="text-xs text-slate-500 mt-1">{t("shared.teamChartsHint")}</p>
          </div>
          <ul className="divide-y divide-slate-100">
            {teamCharts.map((c) => (
              <li key={c.shareId} className="px-5 py-4 flex items-center gap-4 hover:bg-slate-50">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800">{c.patientName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {c.ownerName} · {c.ownerSpecialty}
                    {c.sharedVia !== "direct" && ` · ${c.sharedVia}`}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {new Date(c.sharedAt).toLocaleDateString()}
                    {" · "}
                    {c.permission === "EDIT" ? t("clinic.permEdit") : t("clinic.permView")}
                  </p>
                </div>
                <Link
                  href={professionalPatientsHref(pathname, c.recordId)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-2 rounded-lg shrink-0"
                >
                  {c.permission === "EDIT" ? <Pencil size={14} /> : <Eye size={14} />}
                  {t("shared.openChart")}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm text-center py-16">
          <FileText className="mx-auto text-slate-300 mb-3" size={40} />
          <p className="text-slate-400 text-sm">{t("shared.empty")}</p>
          <p className="text-slate-400 text-xs mt-1">{t("shared.emptyHint")}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-100">
          {items.map((it) => {
            const label = it.categoryName
              ? getCategoryLabel(lang, { name: it.categoryName })
              : legacyLabel(it.type);
            const isBusy = busyId === it.shareId;
            return (
              <div id={`shared-doc-${it.documentId}`} key={it.shareId} className="px-5 py-4 hover:bg-slate-50 transition">
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                        <Tag size={11} /> {label}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        <User size={11} /> {it.patientName}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-800 text-sm">{it.title}</p>
                    {it.content && (
                      <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{it.content}</p>
                    )}
                  </div>
                  {it.hasFile && (
                    <button
                      onClick={() => handleDownload(it.documentId)}
                      disabled={downloadingId === it.documentId}
                      className="shrink-0 text-slate-400 hover:text-brand-500 transition p-2 rounded-lg hover:bg-brand-50 disabled:opacity-50"
                      aria-label={t("shared.download")}
                    >
                      {downloadingId === it.documentId ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                    </button>
                  )}
                </div>

                {/* Chart actions */}
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <AiSummarizeButton documentId={it.documentId} />
                  {it.existingChartId ? (
                    <>
                      <Link
                        href={professionalPatientsHref(pathname, it.existingChartId)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-500 hover:text-brand-600 border border-brand-200 hover:border-brand-200 px-3 py-1.5 rounded-lg transition"
                      >
                        <FolderOpen size={14} /> {t("shared.openChart")}
                      </Link>
                      {it.alreadyAttached ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
                          <CheckCircle2 size={14} /> {t("shared.addedToChart")}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAddToChart(it)}
                          disabled={isBusy}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-brand-500 border border-slate-200 hover:border-brand-200 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                        >
                          {isBusy ? <Loader2 size={14} className="animate-spin" /> : <FilePlus2 size={14} />}
                          {t("shared.addToChart")}
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={() => handleCreateChart(it)}
                      disabled={isBusy}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-brand-500 border border-slate-200 hover:border-brand-200 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                    >
                      {isBusy ? <Loader2 size={14} className="animate-spin" /> : <FolderPlus size={14} />}
                      {t("shared.createFirstChart")}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
