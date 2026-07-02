"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Leaf,
  Loader2,
  Printer,
  RefreshCw,
} from "lucide-react";

type Session = {
  id: string;
  title: string;
  createdAt: string;
  sharedAt: string;
  therapistName: string;
  practiceSlug: string | null;
  practiceLabel: string | null;
  visitType: "first" | "return" | null;
  handout: string | null;
  hasHandout: boolean;
};

export default function PatientIntegrativeCareClient() {
  const { t, lang } = useI18n();
  const locale = localeOf(lang);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch("/api/patient/integrative-sessions");
      if (!res.ok) { setLoadError(true); return; }
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function copyHandout(session: Session) {
    if (!session.handout) return;
    try {
      await navigator.clipboard.writeText(session.handout);
      setCopiedId(session.id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      /* ignore */
    }
  }

  function printHandout(session: Session) {
    if (!session.handout) return;
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) return;
    const escaped = session.handout
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    w.document.write(`<!DOCTYPE html><html><head><title>${t("it.handout.title")}</title>
      <style>body{font-family:system-ui,sans-serif;padding:24px;max-width:640px;margin:0 auto;line-height:1.5;white-space:pre-wrap;font-size:14px;}</style>
      </head><body>${escaped}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
          <Leaf className="text-teal-600" size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("pat.integrative.title")}</h1>
          <p className="text-slate-500 text-sm mt-0.5">{t("pat.integrative.subtitle")}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-teal-500" size={28} />
        </div>
      ) : loadError ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <AlertCircle className="mx-auto text-amber-500 mb-3" size={24} />
          <p className="text-sm text-slate-600 mb-3">{t("common.loadError")}</p>
          <button type="button" onClick={() => void load()} className="text-sm font-semibold text-teal-600 inline-flex items-center gap-1">
            <RefreshCw size={14} /> {t("common.retry")}
          </button>
        </div>
      ) : sessions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Leaf className="mx-auto text-slate-300 mb-3" size={40} />
          <p className="text-slate-500 text-sm">{t("pat.integrative.empty")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const expanded = expandedId === session.id;
            const visitLabel =
              session.visitType === "first"
                ? t("it.consult.firstVisit")
                : session.visitType === "return"
                  ? t("it.consult.returnVisit")
                  : null;

            return (
              <div
                key={session.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : session.id)}
                  className="w-full text-left px-5 py-4 flex items-start gap-3 hover:bg-slate-50 transition"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm">{session.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {session.therapistName}
                      {" · "}
                      {new Date(session.createdAt).toLocaleDateString(locale, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {session.practiceLabel && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">
                          {session.practiceLabel}
                        </span>
                      )}
                      {visitLabel && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {visitLabel}
                        </span>
                      )}
                      {session.hasHandout && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                          {t("pat.integrative.hasHandout")}
                        </span>
                      )}
                    </div>
                  </div>
                  {expanded ? (
                    <ChevronUp size={18} className="text-slate-400 shrink-0 mt-1" />
                  ) : (
                    <ChevronDown size={18} className="text-slate-400 shrink-0 mt-1" />
                  )}
                </button>

                {expanded && (
                  <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-3">
                    <p className="text-[11px] text-slate-400">
                      {t("pat.integrative.sharedOn")}{" "}
                      {new Date(session.sharedAt).toLocaleDateString(locale)}
                    </p>

                    {session.hasHandout && session.handout ? (
                      <>
                        <p className="text-xs font-semibold text-teal-800">{t("it.handout.title")}</p>
                        <div className="bg-teal-50/60 border border-teal-100 rounded-xl p-4 text-sm text-slate-700 whitespace-pre-wrap max-h-72 overflow-y-auto">
                          {session.handout}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void copyHandout(session)}
                            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-teal-200 text-teal-800 hover:bg-teal-50"
                          >
                            {copiedId === session.id ? (
                              <>
                                <CheckCircle2 size={14} /> {t("it.handout.copied")}
                              </>
                            ) : (
                              <>
                                <Copy size={14} /> {t("it.handout.copy")}
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => printHandout(session)}
                            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-teal-200 text-teal-800 hover:bg-teal-50"
                          >
                            <Printer size={14} /> {t("it.handout.print")}
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-slate-500">{t("pat.integrative.noHandout")}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
