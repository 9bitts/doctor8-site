"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { FREUD_LIBRARY_SECTIONS, FREUD_SUGGESTED_QUESTIONS } from "@/lib/freud-library";
import { readApiJson } from "@/lib/api-client";
import {
  Brain, Search, Loader2, AlertCircle, BookOpen, Sparkles, ChevronDown, ChevronUp,
} from "lucide-react";

export default function FreudPageClient() {
  const { t, lang } = useI18n();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    biography: true,
  });

  function toggleSection(id: string) {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  }

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
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
          <Brain size={28} className="text-amber-700" />
        </div>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">{t("pa.freud.title")}</h1>
          <p className="text-slate-500 mt-1 max-w-2xl">{t("pa.freud.subtitle")}</p>
        </div>
      </div>

      {/* AI search bar */}
      <section className="bg-gradient-to-br from-amber-50 to-violet-50 border border-amber-200/60 rounded-2xl p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={18} className="text-amber-600" />
          <h2 className="font-semibold text-slate-800">{t("pa.freud.askTitle")}</h2>
        </div>
        <p className="text-sm text-slate-600 mb-4">{t("pa.freud.askDesc")}</p>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
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
          <div className="mt-4 bg-white border border-amber-100 rounded-xl p-5">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">{t("pa.freud.answerLabel")}</p>
            <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{answer}</div>
            <p className="text-xs text-slate-400 mt-4">{t("pa.freud.disclaimer")}</p>
          </div>
        )}
      </section>

      {/* Library sections */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <BookOpen size={20} className="text-violet-500" />
          <h2 className="text-lg font-bold text-slate-900">{t("pa.freud.libraryTitle")}</h2>
        </div>
        <p className="text-sm text-slate-500 mb-6">{t("pa.freud.libraryDesc")}</p>

        <div className="space-y-3">
          {FREUD_LIBRARY_SECTIONS.map((section) => {
            const open = !!openSections[section.id];
            return (
              <div key={section.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition"
                >
                  <span className="font-semibold text-slate-900">{t(section.titleKey)}</span>
                  {open ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                </button>
                {open && (
                  <div className="px-5 pb-5 border-t border-slate-100">
                    <p className="text-sm text-slate-600 mt-4 mb-4 leading-relaxed">{t(section.introKey)}</p>
                    <div className="space-y-4">
                      {section.items.map((item) => (
                        <div key={item.titleKey} className="bg-slate-50 rounded-xl p-4">
                          <h3 className="font-semibold text-slate-800 text-sm">{t(item.titleKey)}</h3>
                          <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{t(item.bodyKey)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
