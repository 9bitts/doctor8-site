"use client";

// src/app/(dashboard)/professional/shared/SharedWithMeClient.tsx
// List of documents patients shared with this professional + download +
// "Create chart" (attach the document) or "Open chart" if it already exists.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText, Download, Loader2, Tag, User, FolderPlus, FolderOpen, CheckCircle2,
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
  sharedAt: string;
}

const LEGACY_LABELS: Record<string, string> = {
  PRESCRIPTION: "Prescription",
  EXAM_REQUEST: "Exam request",
  EXAM_RESULT: "Exam result",
  CERTIFICATE: "Certificate",
  REFERRAL: "Referral",
  CLINICAL_NOTE: "Clinical note",
  OTHER: "Other",
};

export default function SharedWithMeClient({ initialItems }: { initialItems: Item[] }) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>(initialItems);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [creatingId, setCreatingId] = useState<string | null>(null);

  async function handleDownload(documentId: string) {
    setDownloadingId(documentId);
    try {
      const res = await fetch(`/api/professional/shared?documentId=${documentId}`);
      const data = await res.json();
      if (res.ok && data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      }
    } catch {
      /* ignore */
    }
    setDownloadingId(null);
  }

  async function handleCreateChart(it: Item) {
    setCreatingId(it.shareId);
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
        // Mark this item (and any from the same patient) as having a chart now.
        setItems((prev) =>
          prev.map((p) =>
            p.patientEmail === it.patientEmail && it.patientEmail
              ? { ...p, existingChartId: data.id }
              : p.shareId === it.shareId
              ? { ...p, existingChartId: data.id }
              : p
          )
        );
        // Go straight to the new chart.
        router.push(`/professional/patients/${data.id}`);
      }
    } catch {
      /* ignore */
    }
    setCreatingId(null);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Shared with me</h1>
        <p className="text-slate-500 mt-1">Documents your patients shared with you</p>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm text-center py-16">
          <FileText className="mx-auto text-slate-300 mb-3" size={40} />
          <p className="text-slate-400 text-sm">No documents shared yet</p>
          <p className="text-slate-400 text-xs mt-1">
            When a patient shares an exam or document, it appears here
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-100">
          {items.map((it) => {
            const label = it.categoryName || LEGACY_LABELS[it.type] || "Other";
            const isCreating = creatingId === it.shareId;
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
                      aria-label="Download"
                    >
                      {downloadingId === it.documentId ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                    </button>
                  )}
                </div>

                {/* Chart row */}
                <div className="mt-3">
                  {it.existingChartId ? (
                    <Link
                      href={`/professional/patients/${it.existingChartId}`}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 border border-emerald-200 hover:border-emerald-300 px-3 py-1.5 rounded-lg transition"
                    >
                      <FolderOpen size={14} /> Open chart
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleCreateChart(it)}
                      disabled={isCreating}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-emerald-600 border border-slate-200 hover:border-emerald-300 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                    >
                      {isCreating ? <Loader2 size={14} className="animate-spin" /> : <FolderPlus size={14} />}
                      Create first chart for this patient
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
