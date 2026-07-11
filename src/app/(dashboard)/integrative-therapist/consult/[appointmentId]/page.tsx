"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Loader2, ClipboardList, ExternalLink, FileText, Leaf,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useToast } from "@/components/ui/toast";
import IntegrativeConsultPanel from "@/components/integrative-therapist/IntegrativeConsultPanel";
import ConsultNotesAssistant from "@/components/professional/ConsultNotesAssistant";
import type { IntegrativeConsultContext } from "@/lib/integrative-consult-context";
import { buildVideoChartLinks } from "@/lib/video-chart-nav";

interface SessionNote {
  id: string;
  title: string;
  body: string;
  practiceSlug: string | null;
  createdAt: string;
}

export default function IntegrativeConsultPage() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const params = useParams();
  const router = useRouter();
  const appointmentId = params.appointmentId as string;

  const [context, setContext] = useState<IntegrativeConsultContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<SessionNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [practiceSlug, setPracticeSlug] = useState("");
  const [hasUnsavedNote, setHasUnsavedNote] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const loadContext = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/integrative-therapist/consult-context?appointmentId=${appointmentId}`,
      );
      const d = await res.json();
      if (!res.ok) {
        setError(d.error || t("it.consult.loadError"));
        return;
      }
      setContext(d.context);
    } catch {
      setError(t("it.consult.loadError"));
    } finally {
      setLoading(false);
    }
  }, [appointmentId, t]);

  const loadNotes = useCallback(async (clientId: string) => {
    setNotesLoading(true);
    try {
      const res = await fetch(`/api/integrative-therapist/session-notes?clientId=${clientId}`);
      const d = await res.json();
      setNotes(d.notes || []);
    } finally {
      setNotesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  useEffect(() => {
    if (context?.clientId) loadNotes(context.clientId);
  }, [context?.clientId, loadNotes]);

  useEffect(() => {
    if (!hasUnsavedNote) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedNote]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="animate-spin text-slate-400" size={28} />
      </div>
    );
  }

  if (error || !context) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-4">
        <p className="text-slate-600">{error || t("it.consult.loadError")}</p>
        <Link
          href="/integrative-therapist/appointments"
          className="inline-flex items-center gap-2 text-sm text-teal-600 hover:text-teal-800"
        >
          <ArrowLeft size={16} /> {t("it.consult.backAppointments")}
        </Link>
      </div>
    );
  }

  const returnUrl = `/integrative-therapist/consult/${appointmentId}`;
  const chartLinks = buildVideoChartLinks(context.clientId, returnUrl, "integrative_therapist");
  const locale = lang.startsWith("pt") ? "pt-BR" : lang.startsWith("es") ? "es-ES" : "en-US";

  async function handleFinish() {
    setFinishing(true);
    try {
      if (context?.appointment?.status === "CONFIRMED") {
        const res = await fetch(
          `/api/integrative-therapist/appointments/${appointmentId}/status`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "complete" }),
          },
        );
        const data = await res.json();
        if (!res.ok) {
          toast.error(typeof data.error === "string" ? data.error : t("it.appt.statusError"));
          return;
        }
        toast.success(t("it.appt.completeSuccess"));
      }
      router.push("/integrative-therapist/appointments");
    } catch {
      toast.error(t("it.appt.statusError"));
    } finally {
      setFinishing(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link
            href="/integrative-therapist/appointments"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-3"
          >
            <ArrowLeft size={16} /> {t("it.consult.backAppointments")}
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Leaf size={22} className="text-teal-600" />
            {t("it.consult.title")}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {context.clientFirstName} {context.clientLastName}
            {context.appointment && (
              <>
                {" · "}
                {new Date(context.appointment.scheduledAt).toLocaleString(locale)}
              </>
            )}
          </p>
        </div>
        <a
          href={chartLinks.fullChart}
          className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-4 py-2.5 rounded-xl hover:bg-teal-100 shrink-0"
        >
          <FileText size={16} /> {t("it.consult.openChart")}
        </a>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <IntegrativeConsultPanel
            lang={lang.startsWith("pt") ? "pt" : lang.startsWith("es") ? "es" : "en"}
            clientId={context.clientId}
            appointmentId={appointmentId}
            initialContext={context}
            onPracticeChange={setPracticeSlug}
            onNoteSaved={() => loadNotes(context.clientId)}
            onDirtyChange={setHasUnsavedNote}
          />

          <ConsultNotesAssistant
            lang={lang.startsWith("pt") ? "pt" : lang.startsWith("es") ? "es" : "en"}
            patientRecordId={null}
            integrativeClientRecordId={context.clientId}
            practiceSlug={practiceSlug}
            appointmentId={appointmentId}
            patientName={`${context.clientFirstName} ${context.clientLastName}`}
            onSaved={() => loadNotes(context.clientId)}
          />
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <ClipboardList size={18} className="text-teal-500" />
            <h2 className="font-semibold text-slate-800">{t("it.consult.recentNotes")}</h2>
          </div>
          {notesLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-slate-400" />
            </div>
          ) : notes.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-12">{t("it.sessions.empty")}</p>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
              {notes.map((n) => (
                <div key={n.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="font-semibold text-slate-800 text-sm">{n.title}</p>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {new Date(n.createdAt).toLocaleString(locale)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap line-clamp-4">{n.body}</p>
                </div>
              ))}
            </div>
          )}
          <div className="p-4 border-t border-slate-100">
            <a
              href={chartLinks.fullChart}
              className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-teal-700"
            >
              <ExternalLink size={13} /> {t("it.consult.viewAllNotes")}
            </a>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={finishing}
          onClick={() => void handleFinish()}
          className="text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 px-5 py-2.5 rounded-xl disabled:opacity-50 inline-flex items-center gap-2"
        >
          {finishing && <Loader2 size={14} className="animate-spin" />}
          {t("it.consult.finish")}
        </button>
      </div>
    </div>
  );
}
