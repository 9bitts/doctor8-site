"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { PICS_PRACTICES } from "@/lib/pics/practices";
import {
  hasStructuredTemplate,
  emptyStructuredValues,
  structuredValuesHaveContent,
  type StructuredValues,
} from "@/lib/pics/consult-templates";
import IntegrativeStructuredForm from "@/components/integrative-therapist/IntegrativeStructuredForm";
import { Loader2, ArrowLeft } from "lucide-react";

interface Note {
  id: string;
  title: string;
  body: string;
  practiceSlug: string | null;
  format?: "FREE" | "STRUCTURED";
  createdAt: string;
}

export default function IntegrativeClientDetailPage() {
  const { t, lang } = useI18n();
  const params = useParams();
  const clientId = params.id as string;
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [practiceSlug, setPracticeSlug] = useState("");
  const [structuredValues, setStructuredValues] = useState<StructuredValues>({});
  const [saving, setSaving] = useState(false);

  const langCode = lang.startsWith("pt") ? "pt" : lang.startsWith("es") ? "es" : "en";
  const usesStructured = hasStructuredTemplate(practiceSlug);

  useEffect(() => {
    if (usesStructured) {
      setStructuredValues(emptyStructuredValues(practiceSlug));
    }
  }, [practiceSlug, usesStructured]);

  async function loadNotes() {
    setLoading(true);
    try {
      const res = await fetch(`/api/integrative-therapist/session-notes?clientId=${clientId}`);
      const d = await res.json();
      setNotes(d.notes || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotes();
  }, [clientId]);

  async function saveNote(e: React.FormEvent) {
    e.preventDefault();
    const canSave = usesStructured
      ? structuredValuesHaveContent(structuredValues)
      : content.trim().length > 0;
    if (!canSave) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        integrativeClientRecordId: clientId,
        practiceSlug: practiceSlug || undefined,
        lang: langCode,
      };
      if (usesStructured) {
        payload.structured = structuredValues;
      } else {
        payload.content = content;
      }
      const res = await fetch("/api/integrative-therapist/session-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setContent("");
        if (usesStructured) setStructuredValues(emptyStructuredValues(practiceSlug));
        loadNotes();
      }
    } finally {
      setSaving(false);
    }
  }

  function practiceLabel(slug: string | null) {
    if (!slug) return null;
    const p = PICS_PRACTICES.find((x) => x.slug === slug);
    if (!p) return slug;
    if (lang.startsWith("pt")) return p.labelPt;
    if (lang.startsWith("en")) return p.labelEn;
    return p.labelEs;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href="/integrative-therapist/clients"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft size={16} /> {t("it.clients.back")}
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("it.sessions.title")}</h1>
          <p className="text-slate-500 text-sm mt-1">{t("it.sessions.subtitle")}</p>
        </div>
        <Link
          href={`/integrative-therapist/clients/${clientId}/consult`}
          className="inline-flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shrink-0"
        >
          {t("it.consult.start")}
        </Link>
      </div>

      <form onSubmit={saveNote} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm">
        <div>
          <label className="text-xs font-medium text-slate-600">{t("it.sessions.practiceUsed")}</label>
          <select
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
            value={practiceSlug}
            onChange={(e) => setPracticeSlug(e.target.value)}
          >
            <option value="">{t("it.clients.selectPractice")}</option>
            {PICS_PRACTICES.map((p) => (
              <option key={p.slug} value={p.slug}>
                {lang.startsWith("pt") ? p.labelPt : lang.startsWith("en") ? p.labelEn : p.labelEs}
              </option>
            ))}
          </select>
        </div>
        {usesStructured ? (
          <IntegrativeStructuredForm
            lang={langCode}
            practiceSlug={practiceSlug}
            values={structuredValues}
            onChange={setStructuredValues}
          />
        ) : (
        <div>
          <label className="text-xs font-medium text-slate-600">{t("it.sessions.note")}</label>
          <textarea
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-teal-500/40"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t("it.sessions.placeholder")}
          />
        </div>
        )}
        <button
          type="submit"
          disabled={
            saving
            || (usesStructured ? !structuredValuesHaveContent(structuredValues) : !content.trim())
          }
          className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin inline" /> : t("it.sessions.save")}
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-slate-400" />
          </div>
        ) : notes.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-12">{t("it.sessions.empty")}</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {notes.map((n) => (
              <div key={n.id} className="px-5 py-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="font-semibold text-slate-800 text-sm">{n.title}</p>
                  <span className="text-[10px] text-slate-400">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </div>
                {n.practiceSlug && (
                  <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 mb-2 mr-1">
                    {practiceLabel(n.practiceSlug)}
                  </span>
                )}
                {n.format === "STRUCTURED" && (
                  <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 mb-2">
                    {t("it.tpl.structuredTitle")}
                  </span>
                )}
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{n.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
