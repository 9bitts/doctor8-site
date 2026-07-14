"use client";

import { useCallback, useRef, useState } from "react";
import { Microscope, Loader2, AlertTriangle, ExternalLink, Search } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import DictationMicButton from "@/components/ui/DictationMicButton";

type ArticleResult = {
  pmid: string;
  title: string;
  authors: string[];
  journal: string;
  year: string;
  abstract: string | null;
  pubmedUrl: string;
};

type SearchResponse = {
  query: string;
  keywords: string[];
  summary: string;
  articles: ArticleResult[];
};

const MIN_CHARS = 20;

function SummaryMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="prose prose-sm prose-slate max-w-none">
      {lines.map((line, i) => {
        if (line.startsWith("## ")) {
          return (
            <h2 key={i} className="text-base font-semibold text-slate-800 mt-4 mb-2 first:mt-0">
              {line.slice(3)}
            </h2>
          );
        }
        if (line.startsWith("### ")) {
          return (
            <h3 key={i} className="text-sm font-semibold text-slate-700 mt-3 mb-1">
              {line.slice(4)}
            </h3>
          );
        }
        if (line.startsWith("**") && line.endsWith("**")) {
          return (
            <p key={i} className="text-xs text-slate-500 mb-1">
              {line.replace(/\*\*/g, "")}
            </p>
          );
        }
        if (!line.trim()) return <br key={i} />;
        return (
          <p key={i} className="text-sm text-slate-600 leading-relaxed mb-2">
            {line}
          </p>
        );
      })}
    </div>
  );
}

export default function LiteratureSearchClient() {
  const { t, lang } = useI18n();
  const [caseText, setCaseText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dictationError, setDictationError] = useState("");
  const [result, setResult] = useState<SearchResponse | null>(null);
  const caseTextRef = useRef(caseText);

  caseTextRef.current = caseText;

  const getCurrentText = useCallback(() => caseTextRef.current, []);

  const canSearch = caseText.trim().length >= MIN_CHARS && !loading;

  async function handleSearch() {
    if (!canSearch) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/professional/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ caseText: caseText.trim(), lang }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "AI_NOT_CONFIGURED") setError(t("research.aiNotConfigured"));
        else if (data.error === "PUBMED_FAILED") setError(t("research.pubmedFailed"));
        else if (data.error === "RATE_LIMITED") setError(t("research.rateLimited"));
        else setError(t("research.error"));
        return;
      }
      setResult(data as SearchResponse);
    } catch {
      setError(t("research.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      <div
        role="note"
        className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      >
        <div className="flex gap-2">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <p>{t("research.disclaimerTop")}</p>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Microscope className="text-brand-500" size={26} />
          {t("research.title")}
        </h1>
        <p className="text-slate-500 mt-1">{t("research.subtitle")}</p>
      </div>

      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <div>
          <label htmlFor="research-case" className="block text-sm font-medium text-slate-700 mb-1">
            {t("research.caseLabel")}
          </label>
          <p className="text-xs text-rose-600 mb-2">{t("research.privacyWarning")}</p>
          <div className="relative">
            <textarea
              id="research-case"
              value={caseText}
              onChange={(e) => {
                setCaseText(e.target.value);
                setDictationError("");
              }}
              placeholder={t("research.casePlaceholder")}
              rows={6}
              maxLength={4000}
              className="w-full px-3 py-2.5 pr-14 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm resize-y min-h-[140px]"
            />
            <div className="absolute right-2 bottom-2">
              <DictationMicButton
                lang={lang}
                onText={setCaseText}
                getCurrentText={getCurrentText}
                maxLength={4000}
                disabled={loading}
                onError={setDictationError}
                labels={{
                  start: t("research.dictateStart"),
                  stop: t("research.dictateStop"),
                  listening: t("research.dictating"),
                  transcribing: t("research.transcribing"),
                  micError: t("research.dictateMicError"),
                  notSupported: t("research.dictateNotSupported"),
                  transcribeNotConfigured: t("research.dictateNotConfigured"),
                  genericError: t("research.dictateError"),
                }}
              />
            </div>
          </div>
          {dictationError && (
            <p className="text-xs text-rose-600 mt-1" role="alert">
              {dictationError}
            </p>
          )}
          <p className="text-xs text-slate-400 mt-1">
            {caseText.trim().length < MIN_CHARS
              ? t("research.minCharsHint")
              : `${caseText.trim().length} / 4000`}
          </p>
        </div>

        <button
          type="button"
          onClick={handleSearch}
          disabled={!canSearch}
          className="inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold px-5 py-2.5 rounded-xl transition text-sm disabled:opacity-50 min-h-[44px]"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              {t("research.searching")}
            </>
          ) : (
            <>
              <Search size={18} />
              {t("research.searchButton")}
            </>
          )}
        </button>
      </section>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {!loading && !error && !result && (
        <p className="text-sm text-slate-400 text-center py-6">{t("research.empty")}</p>
      )}

      {result && (
        <div className="space-y-6">
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
              {t("research.queryUsed")}
            </p>
            <p className="text-sm text-slate-700 font-mono bg-slate-50 rounded-lg px-3 py-2">
              {result.query}
            </p>
            {result.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {result.keywords.map((kw) => (
                  <span
                    key={kw}
                    className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <SummaryMarkdown text={result.summary} />
          </section>

          {result.articles.length > 0 && (
            <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
              <h2 className="font-semibold text-slate-800">{t("research.articlesHeading")}</h2>
              <ul className="space-y-3">
                {result.articles.map((article) => (
                  <li
                    key={article.pmid}
                    className="border border-slate-100 rounded-xl p-4 hover:border-slate-200 transition"
                  >
                    <p className="font-medium text-slate-800 text-sm leading-snug">
                      {article.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {article.authors.slice(0, 4).join(", ")}
                      {article.authors.length > 4 ? " et al." : ""}
                      {article.journal ? ` · ${article.journal}` : ""}
                      {article.year ? ` · ${article.year}` : ""}
                      {" · PMID: "}
                      {article.pmid}
                    </p>
                    {article.abstract && (
                      <p className="text-xs text-slate-600 mt-2 line-clamp-3">{article.abstract}</p>
                    )}
                    <a
                      href={article.pubmedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 mt-2"
                    >
                      <ExternalLink size={12} />
                      {t("research.viewOnPubMed")}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <footer
        role="note"
        className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600"
      >
        {t("research.disclaimerFooter")}
      </footer>
    </div>
  );
}
