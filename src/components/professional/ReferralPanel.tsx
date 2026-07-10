"use client";

import { useState, useEffect } from "react";
import { Loader2, UserPlus, Copy, CheckCircle2, Brain } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

type Props = {
  chartId: string;
  presetSpecialty?: "psychology";
};

export default function ReferralPanel({ chartId, presetSpecialty }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    { id: string; name: string; specialty: string }[]
  >([]);
  const [searching, setSearching] = useState(false);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [bookingUrl, setBookingUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const isPsychology = presetSpecialty === "psychology";
  const openLabel = isPsychology ? t("referral.openPsychology") : t("referral.open");
  const titleLabel = isPsychology ? t("referral.titlePsychology") : t("referral.title");
  const hintLabel = isPsychology ? t("referral.hintPsychology") : t("referral.hint");

  async function searchColleagues(q: string, specialty?: string) {
    setQuery(q);
    if (q.trim().length < 2 && !specialty) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const params = new URLSearchParams();
      if (q.trim().length >= 2) params.set("q", q.trim());
      if (specialty) params.set("specialty", specialty);
      const res = await fetch(`/api/professional/search-pros?${params}`, {
        credentials: "same-origin",
      });
      const data = await res.json();
      setResults(data.professionals || []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  useEffect(() => {
    if (open && isPsychology) {
      searchColleagues("", "psychology");
    }
  }, [open, isPsychology]);

  async function createReferral(targetProfessionalId: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/professional/patients/${chartId}/referral`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ targetProfessionalId, note: note.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("referral.error"));
        return;
      }
      setBookingUrl(data.bookingUrl);
    } catch {
      setError(t("referral.error"));
    } finally {
      setLoading(false);
    }
  }

  async function copyUrl() {
    if (!bookingUrl) return;
    await navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleOpen() {
    setOpen(true);
    if (isPsychology) setQuery("");
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className={`inline-flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-xl transition ${
          isPsychology
            ? "text-violet-700 bg-violet-50 hover:bg-violet-100"
            : "text-brand-600 bg-brand-50 hover:bg-brand-100"
        }`}
      >
        {isPsychology ? <Brain size={16} /> : <UserPlus size={16} />}
        {openLabel}
      </button>
    );
  }

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${
      isPsychology ? "border-violet-100 bg-violet-50/50" : "border-brand-100 bg-brand-50/50"
    }`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800">{titleLabel}</p>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setBookingUrl("");
            setNote("");
            setQuery("");
            setResults([]);
          }}
          className="text-xs text-slate-500 hover:text-slate-700"
        >
          {t("referral.close")}
        </button>
      </div>
      <p className="text-xs text-slate-600">{hintLabel}</p>

      {bookingUrl ? (
        <div className="space-y-2">
          <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            {t("referral.saved")}
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={bookingUrl}
              className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white"
            />
            <button
              type="button"
              onClick={copyUrl}
              className="shrink-0 inline-flex items-center gap-1 bg-brand-500 text-white text-xs font-semibold px-3 py-2 rounded-lg"
            >
              {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
              {copied ? t("referral.copied") : t("referral.copy")}
            </button>
          </div>
        </div>
      ) : (
        <>
          {!isPsychology && (
            <input
              type="text"
              value={query}
              onChange={(e) => searchColleagues(e.target.value)}
              placeholder={t("referral.searchPlaceholder")}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
            />
          )}
          {isPsychology && (
            <input
              type="text"
              value={query}
              onChange={(e) => searchColleagues(e.target.value, "psychology")}
              placeholder={t("referral.searchPsychologyPlaceholder")}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
            />
          )}
          {searching && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Loader2 size={14} className="animate-spin" />
            </div>
          )}
          {results.length > 0 && (
            <div className="max-h-36 overflow-y-auto space-y-1">
              {results.map((pro) => (
                <button
                  key={pro.id}
                  type="button"
                  disabled={loading}
                  onClick={() => createReferral(pro.id)}
                  className="w-full text-left px-3 py-2 rounded-lg bg-white border border-slate-100 hover:border-brand-200 text-sm"
                >
                  <span className="font-medium text-slate-800">{pro.name}</span>
                  <span className="text-xs text-slate-500 block">{pro.specialty}</span>
                </button>
              ))}
            </div>
          )}
          {isPsychology && !searching && results.length === 0 && (
            <p className="text-xs text-slate-500">{t("referral.noPsychologists")}</p>
          )}
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder={t("referral.notePlaceholder")}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none bg-white"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 size={14} className="animate-spin" /> {t("referral.creating")}
            </div>
          )}
        </>
      )}
    </div>
  );
}
