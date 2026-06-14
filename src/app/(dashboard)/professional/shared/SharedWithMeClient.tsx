"use client";

// src/app/(dashboard)/professional/shared/SharedWithMeClient.tsx
// Documents patients shared with this professional + chart actions. i18n via useT().

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useT } from "@/lib/i18n/I18nProvider";
import {
  FileText, Download, Loader2, Tag, User, FolderPlus, FolderOpen, FilePlus2, CheckCircle2,
} from "lucide-react";

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
  const t = useT();
  const router = useRouter();
  const [items, setItems] = useState<Item[]>(initialItems);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const legacyLabel = (type: string) => t(LEGACY_KEYS[type] || "doctype.OTHER");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/professional/shared");
        const data = await res.json();
        if (active && Array.isArray(data.items)) setItems(data.items);
      } catch { /* keep initial */ }
    })();
    return () => { active = false; };
  }, []);

  async function handleDownload(documentId: string) {
    setDownloadingId(documentId);
    try {
      const res = await fetch(`/api/professional/shared?documentId=${documentId}`);
      const data = await res.json();
      if (res.ok && data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      }
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
        router.push(`/professional/patients/${data.id}`);
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

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm text-center py-16">
          <FileText className="mx-auto text-slate-300 mb-3" size={40} />
          <p className="text-slate-400 text-sm">{t("shared.empty")}</p>
          <p className="text-slate-400 text-xs mt-1">{t("shared.emptyHint")}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-100">
          {items.map((it) => {
            const label = it.categoryName || legacyLabel(it.type);
            const isBusy = busyId === it.shareId;
            return (
              <div key={it.shareId} className="px-5 py-4 hover:bg-slate-50 transition">
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
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
                      className="shrink-0 text-slate-400 hover:text-emerald-500 transition p-2 rounded-lg hover:bg-emerald-50 disabled:opacity-50"
                      aria-label={t("shared.download")}
                    >
                      {downloadingId === it.documentId ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                    </button>
                  )}
                </div>

                {/* Chart actions */}
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  {it.existingChartId ? (
                    <>
                      <Link
                        href={`/professional/patients/${it.existingChartId}`}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 border border-emerald-200 hover:border-emerald-300 px-3 py-1.5 rounded-lg transition"
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
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-emerald-600 border border-slate-200 hover:border-emerald-300 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
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
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-emerald-600 border border-slate-200 hover:border-emerald-300 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
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
