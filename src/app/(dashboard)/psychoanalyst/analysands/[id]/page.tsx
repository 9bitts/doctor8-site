"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Loader2, ArrowLeft, Share2 } from "lucide-react";
import VideoConsultReturnBanner from "@/components/professional/VideoConsultReturnBanner";

interface Note {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

export default function AnalysandDetailPage() {
  const { t, lang } = useI18n();
  const params = useParams();
  const searchParams = useSearchParams();
  const analysandId = params.id as string;
  const consultReturnUrl = searchParams.get("returnUrl");
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [shareStatus, setShareStatus] = useState<Record<string, string>>({});

  async function loadNotes() {
    setLoading(true);
    try {
      const res = await fetch(`/api/psychoanalyst/session-notes?analysandId=${analysandId}`);
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
    setSaving(true);
    try {
      const res = await fetch("/api/psychoanalyst/session-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysandRecordId: analysandId, content }),
      });
      if (res.ok) {
        setContent("");
        loadNotes();
      }
    } finally {
      setSaving(false);
    }
  }

  async function shareNote(noteId: string) {
    setShareStatus((s) => ({ ...s, [noteId]: "..." }));
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <VideoConsultReturnBanner
        returnUrl={consultReturnUrl}
        lang={lang as "pt" | "en" | "es"}
      />
      <Link href="/psychoanalyst/analysands" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft size={16} /> {t("pa.analysands.back")}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("pa.sessions.title")}</h1>
        <p className="text-slate-500 text-sm mt-1">{t("pa.sessions.subtitle")}</p>
      </div>

      <form onSubmit={saveNote} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-sm">
        <label className="text-sm font-medium text-slate-700">{t("pa.sessions.newNote")}</label>
        <textarea
          ref={noteRef}
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-violet-500/40"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t("pa.sessions.placeholder")}
        />
        <button
          type="submit"
          disabled={saving}
          className="bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin inline" /> : t("common.save")}
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-100">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" /></div>
        ) : notes.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-12">{t("pa.sessions.empty")}</p>
        ) : (
          notes.map((n) => (
            <div key={n.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{n.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                <button
                  type="button"
                  onClick={() => shareNote(n.id)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-800"
                >
                  <Share2 size={14} /> {t("pa.sessions.share")}
                </button>
              </div>
              <p className="text-sm text-slate-600 mt-3 whitespace-pre-wrap">{n.body}</p>
              {shareStatus[n.id] === "shared" && (
                <p className="text-xs text-emerald-600 mt-2">{t("pa.sessions.sharedOk")}</p>
              )}
              {shareStatus[n.id] === "invite" && (
                <p className="text-xs text-amber-600 mt-2">{t("pa.sessions.needsInvite")}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
