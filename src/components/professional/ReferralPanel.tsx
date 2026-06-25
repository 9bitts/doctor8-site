"use client";

import { useState } from "react";
import { Loader2, UserPlus, Copy, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

export default function ReferralPanel({ chartId }: { chartId: string }) {
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

  async function searchColleagues(q: string) {
    setQuery(q);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `/api/professional/search-pros?q=${encodeURIComponent(q.trim())}`
      );
      const data = await res.json();
      setResults(data.professionals || []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function createReferral(targetProfessionalId: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/professional/patients/${chartId}/referral`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 px-3 py-2 rounded-xl transition"
      >
        <UserPlus size={16} />
        {t("referral.open")}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800">{t("referral.title")}</p>
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
      <p className="text-xs text-slate-600">{t("referral.hint")}</p>

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
          <input
            type="text"
            value={query}
            onChange={(e) => searchColleagues(e.target.value)}
            placeholder={t("referral.searchPlaceholder")}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
          />
          {searching && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Loader2 size={14} className="animate-spin" /> ?
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
