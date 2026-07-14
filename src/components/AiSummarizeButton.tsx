"use client";

// Reusable "Analyze with AI" button + summary modal for professional document cards.

import { useState } from "react";
import { Sparkles, Loader2, X, AlertCircle } from "lucide-react";
import { useI18n, useT } from "@/lib/i18n/I18nProvider";

interface AiSummarizeButtonProps {
  documentId?: string;
  resourceId?: string;
  apiBase?: string;
  className?: string;
  variant?: "default" | "compact";
  labelKey?: string;
}

export default function AiSummarizeButton({
  documentId,
  resourceId,
  apiBase = "/api/professional",
  className = "",
  variant = "default",
  labelKey = "rec.analyzeAI",
}: AiSummarizeButtonProps) {
  const t = useT();
  const { lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");

  async function handleAnalyze() {
    setOpen(true);
    setLoading(true);
    setError("");
    setSummary("");

    try {
      const endpoint = resourceId
        ? `${apiBase}/library/ai-summarize`
        : "/api/professional/ai-summarize";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ documentId, resourceId, lang }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "AI_NOT_CONFIGURED") {
          setError(t("rec.aiNotConfigured"));
        } else if (data.error === "NO_CONTENT") {
          setError(t("rec.aiNoContent"));
        } else {
          setError(t("rec.aiError"));
        }
        return;
      }
      setSummary(data.summary || "");
    } catch {
      setError(t("rec.aiError"));
    } finally {
      setLoading(false);
    }
  }

  const btnClass = variant === "compact"
    ? "inline-flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700 border border-violet-200 hover:border-violet-300 px-2.5 py-1 rounded-lg transition disabled:opacity-50"
    : "inline-flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-700 border border-violet-200 hover:border-violet-300 px-3 py-1.5 rounded-lg transition disabled:opacity-50";

  return (
    <>
      <button
        type="button"
        onClick={handleAnalyze}
        disabled={loading}
        className={`${btnClass} ${className}`}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        {loading ? t("rec.analyzing") : t(labelKey)}
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-[1100] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <Sparkles size={18} className="text-violet-500" />
                {t("rec.aiTitle")}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {loading && (
                <div className="flex items-center justify-center gap-2 text-slate-500 py-12">
                  <Loader2 size={22} className="animate-spin text-violet-500" />
                  <span className="text-sm">{t("rec.analyzing")}</span>
                </div>
              )}

              {!loading && error && (
                <div className="flex items-start gap-2 text-rose-600 bg-rose-50 rounded-xl p-4 text-sm">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              {!loading && summary && (
                <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">
                  {summary.split("\n").map((line, i) => {
                    if (line.startsWith("## ")) {
                      return (
                        <h3 key={i} className="text-sm font-bold text-slate-900 mt-4 mb-1 first:mt-0">
                          {line.replace(/^##\s*/, "")}
                        </h3>
                      );
                    }
                    if (line.startsWith("# ")) {
                      return (
                        <h2 key={i} className="text-base font-bold text-slate-900 mt-4 mb-1 first:mt-0">
                          {line.replace(/^#\s*/, "")}
                        </h2>
                      );
                    }
                    if (!line.trim()) return <br key={i} />;
                    return <p key={i} className="text-sm leading-relaxed mb-2">{line}</p>;
                  })}
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-slate-100 shrink-0">
              <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-3 py-2 leading-relaxed">
                {t("rec.aiDisclaimer")}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
