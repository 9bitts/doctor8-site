"use client";

// src/app/(dashboard)/patient/exam-requests/page.tsx
// Patient exam requests from their doctors — read-only with PDF download + lab price search.

import { useState, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";
import { useUserTimeZone } from "@/hooks/useUserTimeZone";
import { formatShortDateWithYear } from "@/lib/timezone";
import { getProfessionLabel } from "@/lib/professions";
import { openAuthenticatedPdf } from "@/lib/open-url-safely";
import PatientLaboratorySearchPanel from "@/components/patient/PatientLaboratorySearchPanel";
import {
  FlaskConical, Download, Loader2, Calendar, AlertCircle, RefreshCw,
  ShieldCheck, Clock, MessageCircle, Search, FileCheck,
} from "lucide-react";

interface ExamItem {
  id: string;
  title: string;
  createdAt: string;
  signedAt: string | null;
  signatureStatus: string | null;
  hasSignedPdf: boolean;
  whatsappNotifyStatus: string | null;
  examItems: string[];
  examNotes: string;
  cid: string;
  doctor: { name: string; specialty: string };
}

export default function PatientExamRequestsPage() {
  const { t, lang } = useI18n();
  const locale = localeOf(lang);
  const userTz = useUserTimeZone();

  const [exams, setExams] = useState<ExamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [activeSearchExamNames, setActiveSearchExamNames] = useState<string[]>([]);
  const [showGlobalSearch, setShowGlobalSearch] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch("/api/patient/exam-requests", { credentials: "same-origin" });
      if (!res.ok) { setLoadError(true); return; }
      const d = await res.json();
      setExams(d.examRequests || []);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  function fmt(date: string) {
    return formatShortDateWithYear(new Date(date), userTz, locale);
  }

  function statusBadges(p: ExamItem) {
    const badges: { key: string; cls: string; icon: ReactNode }[] = [];

    if (p.signatureStatus === "SIGNED" || p.hasSignedPdf) {
      badges.push({ key: "signed", cls: "bg-emerald-50 text-emerald-700", icon: <ShieldCheck size={11} /> });
    } else if (p.signatureStatus === "PENDING") {
      badges.push({ key: "pending", cls: "bg-slate-100 text-slate-600", icon: <Clock size={11} /> });
    } else if (p.signatureStatus === "ERROR") {
      badges.push({ key: "signErr", cls: "bg-rose-50 text-rose-600", icon: <AlertCircle size={11} /> });
    }

    if (p.whatsappNotifyStatus === "SENT") {
      badges.push({ key: "waSent", cls: "bg-green-50 text-green-700", icon: <MessageCircle size={11} /> });
    }

    const labels: Record<string, string> = {
      signed: "myexam.signed",
      pending: "myexam.pendingSign",
      signErr: "myexam.signError",
      waSent: "myrx.whatsappSent",
    };

    return badges.map((b) => (
      <span key={b.key} className={`text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${b.cls}`}>
        {b.icon} {t(labels[b.key])}
      </span>
    ));
  }

  async function downloadPdf(examId: string) {
    setDownloadingId(examId);
    try {
      await openAuthenticatedPdf(`/api/patient/documents/${examId}/pdf`);
    } catch {
      /* user sees empty tab closed */
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("myexam.title")}</h1>
          <p className="text-slate-500 text-sm mt-1">{t("myexam.subtitle")}</p>
        </div>
        <Link
          href="/patient/documents?new=1&type=EXAM_RESULT"
          className="inline-flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-4 py-2.5 rounded-xl transition text-sm shrink-0"
        >
          <FileCheck size={16} /> {t("myexam.uploadResult")}
        </Link>
      </div>

      {showGlobalSearch && (
        <div id="lab-search-panel">
          <PatientLaboratorySearchPanel
            highlightExamNames={activeSearchExamNames}
          />
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
      ) : exams.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <FlaskConical size={40} className="text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">{t("myexam.empty")}</p>
          <p className="text-slate-400 text-xs mt-1">{t("myexam.emptyHint")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {exams.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800">{p.title || t("myexam.defaultTitle")}</p>
                  {p.doctor.name && (
                    <p className="text-sm text-slate-600 mt-0.5">
                      Dr. {p.doctor.name}
                      {p.doctor.specialty && (
                        <span className="text-slate-400"> · {getProfessionLabel(lang, p.doctor.specialty)}</span>
                      )}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                    <Calendar size={12} />
                    {t("myexam.issued")} {fmt(p.createdAt)}
                    {p.signedAt && (
                      <span> · {t("myrx.signedAt").replace("{{date}}", fmt(p.signedAt))}</span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">{statusBadges(p)}</div>
                  {p.cid && (
                    <p className="text-xs text-slate-500 mt-2">{t("myexam.cid")}: {p.cid}</p>
                  )}
                  {p.examItems.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {p.examItems.map((item, i) => (
                        <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                          <FlaskConical size={14} className="text-brand-500 shrink-0 mt-0.5" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                  {p.examNotes && (
                    <p className="text-xs text-slate-500 mt-2 italic">{p.examNotes}</p>
                  )}
                  {p.examItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSearchExamNames(p.examItems);
                        setShowGlobalSearch(true);
                        document.getElementById("lab-search-panel")?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-violet-600 hover:text-violet-800"
                    >
                      <Search size={14} />
                      {t("myexam.searchLabs")}
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => downloadPdf(p.id)}
                  disabled={downloadingId === p.id}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm font-semibold transition shrink-0"
                >
                  {downloadingId === p.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Download size={14} />
                  )}
                  {t("myexam.downloadPDF")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
