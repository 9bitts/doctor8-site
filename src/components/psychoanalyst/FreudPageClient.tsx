"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { FREUD_SUGGESTED_QUESTIONS } from "@/lib/freud-library";
import { getFreudEducationalContent } from "@/lib/freud-educational-content";
import FreudLibraryContent from "@/components/psychoanalyst/FreudLibraryContent";
import { readApiJson } from "@/lib/api-client";
import {
  Brain, Search, Loader2, AlertCircle, Sparkles,
} from "lucide-react";

export default function FreudPageClient() {
  const { t, lang } = useI18n();
  const content = getFreudEducationalContent(lang);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function ask(questionText: string) {
    const q = questionText.trim();
    if (q.length < 3) return;
    setLoading(true);
    setError("");
    setAnswer("");
    setQuestion(q);
    try {
      const res = await fetch("/api/psychoanalyst/freud-ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, lang }),
      });
      const parsed = await readApiJson<{ answer?: string; error?: string }>(res);
      if (parsed.data?.answer) {
        setAnswer(parsed.data.answer);
      } else if (parsed.data?.error === "AI_NOT_CONFIGURED") {
        setError(t("pa.freud.err.notConfigured"));
      } else if (parsed.data?.error === "RATE_LIMITED" || res.status === 429) {
        setError(t("pa.freud.err.rateLimited"));
      } else {
        setError(t("pa.freud.err.failed"));
      }
    } catch {
      setError(t("pa.freud.err.failed"));
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void ask(question);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 pb-8">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
          <Brain size={26} className="text-amber-700" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">{t("pa.freud.title")}</h1>
          <p className="text-slate-500 mt-1 text-sm sm:text-base leading-relaxed">{content.introDesc}</p>
        </div>
      </div>

      {/* AI search bar */}
      <section className="bg-gradient-to-br from-amber-50 to-violet-50 border border-amber-200/60 rounded-2xl p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={18} className="text-amber-600 shrink-0" />
          <h2 className="font-semibold text-slate-800">{t("pa.freud.askTitle")}</h2>
        </div>
        <p className="text-sm text-slate-600 mb-4">{t("pa.freud.askDesc")}</p>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 min-w-0">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={t("pa.freud.askPlaceholder")}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-300"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading || question.trim().length < 3}
            className="inline-flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold text-sm px-5 py-3 rounded-xl transition shrink-0"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Brain size={16} />}
            {t("pa.freud.askBtn")}
          </button>
        </form>

        <div className="flex flex-wrap gap-2 mt-3">
          {FREUD_SUGGESTED_QUESTIONS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => void ask(t(key))}
              disabled={loading}
              className="text-xs bg-white/80 hover:bg-white border border-amber-200 text-amber-900 px-3 py-1.5 rounded-full transition disabled:opacity-50"
            >
              {t(key)}
            </button>
          ))}
        </div>

        {error && (
          <div className="flex items-start gap-2 mt-4 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {answer && (
          <div className="mt-4 bg-white border border-amber-100 rounded-xl p-4 sm:p-5">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">{t("pa.freud.answerLabel")}</p>
            <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{answer}</div>
            <p className="text-xs text-slate-400 mt-4">{t("pa.freud.disclaimer")}</p>
          </div>
        )}
      </section>

      <FreudLibraryContent content={content} />
    </div>
  );
}
