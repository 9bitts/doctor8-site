"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";
import {
  formatShortDateWithYear,
  formatAppointmentTimeWithLabel,
} from "@/lib/timezone";
import { Loader2, ArrowLeft, Share2, Mail, Phone, BookMarked } from "lucide-react";
import VideoConsultReturnBanner from "@/components/professional/VideoConsultReturnBanner";
import SendEducationModal from "@/components/professional/library/SendEducationModal";

interface Note {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

interface AnalysandDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  sessionFrequency: string | null;
  processStartDate: string | null;
  hasAccount: boolean;
  notes: string | null;
}

type ShareStatus = "loading" | "shared" | "invite" | "inviting" | "invited" | "error";

const SESSION_FREQ_LABELS: Record<string, string> = {
  semanal: "pa.analysands.freq.semanal",
  "2x/semana": "pa.analysands.freq.2xSemana",
  "3x/semana": "pa.analysands.freq.3xSemana",
  quinzenal: "pa.analysands.freq.quinzenal",
  livre: "pa.analysands.freq.livre",
};

export default function AnalysandDetailClient({
  analysandId,
  timeZone,
}: {
  analysandId: string;
  timeZone: string;
}) {
  const { t, lang } = useI18n();
  const locale = localeOf(lang);
  const searchParams = useSearchParams();
  const [consultReturnUrl, setConsultReturnUrl] = useState(searchParams.get("returnUrl"));
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const [analysand, setAnalysand] = useState<AnalysandDetail | null>(null);
  const [analysandError, setAnalysandError] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [shareStatus, setShareStatus] = useState<Record<string, ShareStatus>>({});
  const [confirmShareNoteId, setConfirmShareNoteId] = useState<string | null>(null);
  const [showEducationModal, setShowEducationModal] = useState(false);

  async function loadAnalysand() {
    const res = await fetch(`/api/psychoanalyst/analysands/${analysandId}`);
    if (!res.ok) {
      setAnalysandError(true);
      return null;
    }
    const data = await res.json();
    setAnalysand(data);
    return data;
  }

  async function loadNotes() {
    setLoading(true);
    try {
      const loaded = await loadAnalysand();
      if (!loaded) {
        setNotes([]);
        return;
      }
      const res = await fetch(`/api/psychoanalyst/session-notes?analysandId=${analysandId}`);
      if (!res.ok) {
        setNotes([]);
        return;
      }
      const d = await res.json();
      setNotes(d.notes || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadNotes(); }, [analysandId]);

  useEffect(() => {
    if (searchParams.get("newRecord") === "1") {
      noteRef.current?.focus();
      noteRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [searchParams]);

  async function saveNote(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSaveError("");
    setSaving(true);
    try {
      const res = await fetch("/api/psychoanalyst/session-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysandRecordId: analysandId, content }),
      });
      if (!res.ok) {
        setSaveError(t("pa.sessions.errSave"));
        return;
      }
      setContent("");
      loadNotes();
    } finally {
      setSaving(false);
    }
  }

  async function shareNote(noteId: string) {
    setConfirmShareNoteId(null);
    setShareStatus((s) => ({ ...s, [noteId]: "loading" }));
    try {
      const res = await fetch(`/api/psychoanalyst/session-notes/${noteId}/share`, { method: "POST" });
      const data = await res.json();
      if (data.shared) setShareStatus((s) => ({ ...s, [noteId]: "shared" }));
      else if (data.needsInvite) setShareStatus((s) => ({ ...s, [noteId]: "invite" }));
      else setShareStatus((s) => ({ ...s, [noteId]: "error" }));
    } catch {
      setShareStatus((s) => ({ ...s, [noteId]: "error" }));
    }
  }

  async function invitePatient(noteId: string) {
    setShareStatus((s) => ({ ...s, [noteId]: "inviting" }));
    try {
      const res = await fetch(`/api/psychoanalyst/session-notes/${noteId}/share`, { method: "PUT" });
      if (!res.ok) {
        setShareStatus((s) => ({ ...s, [noteId]: "error" }));
        return;
      }
      setShareStatus((s) => ({ ...s, [noteId]: "invited" }));
    } catch {
      setShareStatus((s) => ({ ...s, [noteId]: "error" }));
    }
  }

  function freqLabel(freq: string | null): string | null {
    if (!freq) return null;
    const key = SESSION_FREQ_LABELS[freq];
    return key ? t(key) : freq;
  }

  if (analysandError) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 py-12 text-center">
        <p className="text-slate-600">{t("pa.analysands.notFound")}</p>
        <Link href="/psychoanalyst/analysands" className="inline-flex items-center gap-2 text-sm text-violet-600 hover:text-violet-800 font-semibold">
          <ArrowLeft size={16} /> {t("pa.analysands.back")}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <VideoConsultReturnBanner
        returnUrl={consultReturnUrl}
        lang={lang as "pt" | "en" | "es"}
        onInactive={() => setConsultReturnUrl(null)}
      />
      <Link href="/psychoanalyst/analysands" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft size={16} /> {t("pa.analysands.back")}
      </Link>

      {analysand && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-3">
          <h1 className="text-2xl font-bold text-slate-900">
            {analysand.firstName} {analysand.lastName}
          </h1>
          <div className="flex flex-wrap gap-2 text-sm text-slate-600">
            {analysand.email && (
              <span className="inline-flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-lg">
                <Mail size={13} className="text-slate-400" /> {analysand.email}
              </span>
            )}
            {analysand.phone && (
              <span className="inline-flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-lg">
                <Phone size={13} className="text-slate-400" /> {analysand.phone}
              </span>
            )}
            {analysand.sessionFrequency && (
              <span className="inline-flex items-center gap-1 bg-violet-50 text-violet-700 px-2.5 py-1 rounded-lg text-xs font-medium">
                {t("pa.analysands.sessionFrequency")}: {freqLabel(analysand.sessionFrequency)}
              </span>
            )}
            {analysand.processStartDate && (
              <span className="inline-flex items-center gap-1 bg-violet-50 text-violet-700 px-2.5 py-1 rounded-lg text-xs font-medium">
                {t("pa.analysands.inAnalysisSince")}{" "}
                {formatShortDateWithYear(new Date(analysand.processStartDate), timeZone, locale)}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowEducationModal(true)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 px-3 py-2 rounded-xl"
          >
            <BookMarked size={16} /> {t("libHub.sendEducation")}
          </button>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-slate-800">{t("pa.sessions.title")}</h2>
        <p className="text-slate-500 text-sm mt-1">{t("pa.sessions.subtitle")}</p>
      </div>

      {analysand && (
      <form onSubmit={saveNote} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-sm">
        <label className="text-sm font-medium text-slate-700">{t("pa.sessions.newNote")}</label>
        <textarea
          ref={noteRef}
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-violet-500/40"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t("pa.sessions.placeholder")}
        />
        {saveError && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{saveError}</p>
        )}
        <button
          type="submit"
          disabled={saving}
          className="bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin inline" /> : t("common.save")}
        </button>
      </form>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" /></div>
        ) : !analysand ? (
          <p className="text-center text-slate-400 text-sm py-12">{t("pa.analysands.notFound")}</p>
        ) : notes.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-12">{t("pa.sessions.empty")}</p>
        ) : (
          <div className="p-3 sm:p-4 space-y-3 bg-slate-50/60">
          {notes.map((n) => (
            <div key={n.id} className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{n.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatShortDateWithYear(new Date(n.createdAt), timeZone, locale)}{" "}
                    {formatAppointmentTimeWithLabel(new Date(n.createdAt), timeZone, locale)}
                  </p>
                </div>
                {confirmShareNoteId === n.id ? (
                  <div className="shrink-0 max-w-xs bg-violet-50 border border-violet-200 rounded-xl p-3 space-y-2">
                    <p className="text-xs text-slate-700">{t("pa.sessions.shareConfirm")}</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmShareNoteId(null)}
                        className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-slate-200 text-slate-600"
                      >
                        {t("common.cancel")}
                      </button>
                      <button
                        type="button"
                        onClick={() => shareNote(n.id)}
                        disabled={shareStatus[n.id] === "loading"}
                        className="flex-1 text-xs px-2 py-1.5 rounded-lg bg-violet-600 text-white font-semibold disabled:opacity-50"
                      >
                        {shareStatus[n.id] === "loading" ? (
                          <Loader2 size={12} className="animate-spin inline" />
                        ) : (
                          t("pa.sessions.shareConfirmBtn")
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmShareNoteId(n.id)}
                    disabled={shareStatus[n.id] === "loading"}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-800 shrink-0"
                  >
                    {shareStatus[n.id] === "loading" ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Share2 size={14} />
                    )}
                    {t("pa.sessions.share")}
                  </button>
                )}
              </div>
              <p className="text-sm text-slate-600 mt-3 whitespace-pre-wrap">{n.body}</p>
              {shareStatus[n.id] === "shared" && (
                <p className="text-xs text-emerald-600 mt-2">{t("pa.sessions.sharedOk")}</p>
              )}
              {shareStatus[n.id] === "invite" && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <p className="text-xs text-amber-600">{t("pa.sessions.needsInvite")}</p>
                  {analysand?.email && (
                    <button
                      type="button"
                      onClick={() => invitePatient(n.id)}
                      className="text-xs font-semibold text-violet-700 hover:text-violet-900 underline"
                    >
                      {t("pa.sessions.sendInvite")}
                    </button>
                  )}
                </div>
              )}
              {shareStatus[n.id] === "inviting" && (
                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                  <Loader2 size={12} className="animate-spin" /> {t("pa.sessions.sendingInvite")}
                </p>
              )}
              {shareStatus[n.id] === "invited" && (
                <p className="text-xs text-emerald-600 mt-2">{t("pa.sessions.inviteSent")}</p>
              )}
              {shareStatus[n.id] === "error" && (
                <p className="text-xs text-red-600 mt-2">{t("pa.sessions.shareError")}</p>
              )}
            </div>
          ))}
          </div>
        )}
      </div>

      {showEducationModal && analysand && (
        <SendEducationModal
          apiBase="/api/psychoanalyst"
          chartId={analysandId}
          patientName={`${analysand.firstName} ${analysand.lastName}`.trim()}
          recipientMode="analysand"
          onClose={() => setShowEducationModal(false)}
        />
      )}
    </div>
  );
}
