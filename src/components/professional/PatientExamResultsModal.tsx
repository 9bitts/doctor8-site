"use client";

import Link from "next/link";
import { FileCheck, Paperclip, Plus, X } from "lucide-react";
import { openAuthenticatedBlob } from "@/lib/open-url-safely";
import { localeOf, type Lang } from "@/lib/i18n/translations";
import { useUserTimeZone } from "@/hooks/useUserTimeZone";
import { formatShortDateWithYear } from "@/lib/timezone";

export type PatientExamResultItem = {
  id: string;
  title: string;
  content: string | null;
  hasFile: boolean;
  attachmentCount?: number;
  createdAt: string;
};

export default function PatientExamResultsModal({
  results,
  requestExamHref,
  lang,
  t,
  onClose,
  onRegisterManually,
  onOpenResult,
}: {
  results: PatientExamResultItem[];
  requestExamHref: string;
  lang: Lang;
  t: (k: string) => string;
  onClose: () => void;
  onRegisterManually: () => void;
  onOpenResult: (id: string) => void;
}) {
  const userTz = useUserTimeZone();
  const locale = localeOf(lang);
  const empty = results.length === 0;

  async function openFirstFile(docId: string) {
    try {
      const res = await fetch(`/api/professional/documents/${docId}/files`);
      const data = await res.json();
      if (!res.ok) return;
      const first = (data.files || [])[0] as { url?: string } | undefined;
      if (!first?.url) return;
      if (first.url.startsWith("/api/")) {
        await openAuthenticatedBlob(first.url);
      } else {
        window.open(first.url, "_blank", "noopener,noreferrer");
      }
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="exam-results-modal-title"
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <h2 id="exam-results-modal-title" className="font-bold text-slate-800 flex items-center gap-2">
            <FileCheck size={18} className="text-cyan-600" />
            {t("examResults.modalTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {empty ? (
            <div className="space-y-5">
              <p className="text-sm text-slate-600 leading-relaxed">
                {t("examResults.empty")}
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Link
                  href={requestExamHref}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition"
                >
                  {t("examResults.requestAgain")}
                </Link>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50"
                >
                  {t("examResults.dismiss")}
                </button>
              </div>
            </div>
          ) : (
            <ul className="space-y-3">
              {results.map((r) => {
                const attachCount = r.attachmentCount ?? (r.hasFile ? 1 : 0);
                return (
                  <li
                    key={r.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 text-sm truncate">{r.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {formatShortDateWithYear(new Date(r.createdAt), userTz, locale)}
                          <span className="ml-1.5 text-cyan-700">{t("examResults.patientSent")}</span>
                        </p>
                        {r.content && (
                          <p className="text-xs text-slate-600 mt-1.5 whitespace-pre-wrap line-clamp-3">
                            {r.content}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onOpenResult(r.id)}
                          className="text-xs font-semibold text-brand-600 hover:text-brand-700 px-2 py-1 rounded-lg hover:bg-brand-50"
                        >
                          {t("examResults.openInChart")}
                        </button>
                        {attachCount > 0 && (
                          <button
                            type="button"
                            onClick={() => void openFirstFile(r.id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 hover:text-cyan-800 px-2 py-1 rounded-lg hover:bg-cyan-50"
                          >
                            <Paperclip size={12} /> {t("examResults.viewFile")}
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={onRegisterManually}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border border-cyan-200 text-cyan-800 bg-cyan-50 hover:bg-cyan-100 font-semibold text-sm transition"
          >
            <Plus size={16} /> {t("examResults.registerManually")}
          </button>
        </div>
      </div>
    </div>
  );
}
