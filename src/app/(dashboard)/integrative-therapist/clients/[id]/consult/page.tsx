"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, ClipboardList, Leaf } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import IntegrativeConsultPanel from "@/components/integrative-therapist/IntegrativeConsultPanel";
import ConsultNotesAssistant from "@/components/professional/ConsultNotesAssistant";
import type { IntegrativeConsultContext } from "@/lib/integrative-consult-context";

interface SessionNote {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

export default function IntegrativeClientConsultPage() {
  const { t, lang } = useI18n();
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [context, setContext] = useState<IntegrativeConsultContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<SessionNote[]>([]);
  const [practiceSlug, setPracticeSlug] = useState("");
  const [hasUnsavedNote, setHasUnsavedNote] = useState(false);

  const loadContext = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/integrative-therapist/consult-context?clientId=${clientId}`);
      const d = await res.json();
      if (res.ok) setContext(d.context);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  const loadNotes = useCallback(async () => {
    const res = await fetch(`/api/integrative-therapist/session-notes?clientId=${clientId}`);
    const d = await res.json();
    setNotes(d.notes || []);
  }, [clientId]);

  useEffect(() => {
    loadContext();
    loadNotes();
  }, [loadContext, loadNotes]);

  useEffect(() => {
    if (!hasUnsavedNote) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedNote]);

  if (loading || !context) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="animate-spin text-slate-400" size={28} />
      </div>
    );
  }

  const locale = lang.startsWith("pt") ? "pt-BR" : lang.startsWith("es") ? "es-ES" : "en-US";
  const langCode = lang.startsWith("pt") ? "pt" : lang.startsWith("es") ? "es" : "en";

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      <Link
        href={`/integrative-therapist/clients/${clientId}`}
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft size={16} /> {t("it.clients.back")}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Leaf size={22} className="text-teal-600" />
          {t("it.consult.title")}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {context.clientFirstName} {context.clientLastName}
        </p>
      </div>

      <IntegrativeConsultPanel
        lang={langCode}
        clientId={clientId}
        initialContext={context}
        onPracticeChange={setPracticeSlug}
        onNoteSaved={loadNotes}
        onDirtyChange={setHasUnsavedNote}
      />

      <ConsultNotesAssistant
        lang={langCode}
        patientRecordId={null}
        integrativeClientRecordId={clientId}
        practiceSlug={practiceSlug}
        patientName={`${context.clientFirstName} ${context.clientLastName}`}
        onSaved={loadNotes}
      />

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <ClipboardList size={18} className="text-teal-500" />
          <h2 className="font-semibold text-slate-800">{t("it.consult.recentNotes")}</h2>
        </div>
        {notes.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-10">{t("it.sessions.empty")}</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {notes.slice(0, 5).map((n) => (
              <div key={n.id} className="px-5 py-4">
                <p className="font-semibold text-slate-800 text-sm">{n.title}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {new Date(n.createdAt).toLocaleString(locale)}
                </p>
                <p className="text-sm text-slate-600 mt-1 line-clamp-3">{n.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => router.push(`/integrative-therapist/clients/${clientId}`)}
        className="text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 px-5 py-2.5 rounded-xl"
      >
        {t("it.consult.finish")}
      </button>
    </div>
  );
}
