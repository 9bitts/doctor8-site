"use client";

import { useState, useEffect } from "react";
import { Loader2, UserPlus, Copy, CheckCircle2, ChevronLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

type Props = {
  chartId: string;
};

const PROFESSION_GROUP_LABELS: Record<string, { pt: string; en: string; es: string }> = {
  doctor: { pt: "Medicina", en: "Medicine", es: "Medicina" },
  psychologist: { pt: "Psicologia", en: "Psychology", es: "Psicología" },
  nutritionist: { pt: "Nutrição", en: "Nutrition", es: "Nutrición" },
  nurse: { pt: "Enfermagem", en: "Nursing", es: "Enfermería" },
  pharmacist: { pt: "Farmácia", en: "Pharmacy", es: "Farmacia" },
  dentist: { pt: "Odontologia", en: "Dentistry", es: "Odontología" },
  physiotherapist: { pt: "Fisioterapia", en: "Physiotherapy", es: "Fisioterapia" },
  professional: { pt: "Outros", en: "Other", es: "Otros" },
};

export default function ReferralPanel({ chartId }: Props) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"specialty" | "professional">("specialty");
  const [grouped, setGrouped] = useState<Record<string, string[]>>({});
  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    { id: string; name: string; specialty: string }[]
  >([]);
  const [searching, setSearching] = useState(false);
  const [loadingSpecialties, setLoadingSpecialties] = useState(false);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [bookingUrl, setBookingUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const langKey = lang === "pt" || lang === "es" ? lang : "en";

  useEffect(() => {
    if (!open) return;
    setLoadingSpecialties(true);
    fetch("/api/professional/specialties", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((data) => setGrouped(data.grouped || {}))
      .catch(() => setGrouped({}))
      .finally(() => setLoadingSpecialties(false));
  }, [open]);

  async function searchColleagues(q: string, specialty: string) {
    setQuery(q);
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
    if (step === "professional" && selectedSpecialty) {
      searchColleagues(query, selectedSpecialty);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, selectedSpecialty]);

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

  function resetPanel() {
    setOpen(false);
    setStep("specialty");
    setSelectedSpecialty("");
    setQuery("");
    setResults([]);
    setBookingUrl("");
    setNote("");
    setError("");
  }

  function pickSpecialty(specialty: string) {
    setSelectedSpecialty(specialty);
    setQuery("");
    setResults([]);
    setStep("professional");
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-xl transition text-brand-600 bg-brand-50 hover:bg-brand-100"
      >
        <UserPlus size={16} />
        {t("referral.openPatient")}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-4 space-y-3 w-full">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800">{t("referral.titlePatient")}</p>
        <button
          type="button"
          onClick={resetPanel}
          className="text-xs text-slate-500 hover:text-slate-700"
        >
          {t("referral.close")}
        </button>
      </div>
      <p className="text-xs text-slate-600">{t("referral.hintPatient")}</p>

      {bookingUrl ? (
        <div className="space-y-2">
          <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            {t("referral.savedWithChart")}
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
      ) : step === "specialty" ? (
        <div className="space-y-3">
          <p className="text-xs font-medium text-slate-600">{t("referral.pickSpecialty")}</p>
          {loadingSpecialties ? (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Loader2 size={14} className="animate-spin" />
            </div>
          ) : (
            <div className="max-h-52 overflow-y-auto space-y-3">
              {Object.entries(grouped).map(([groupKey, specs]) => (
                <div key={groupKey}>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">
                    {PROFESSION_GROUP_LABELS[groupKey]?.[langKey] || groupKey}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {specs.map((spec) => (
                      <button
                        key={spec}
                        type="button"
                        onClick={() => pickSpecialty(spec)}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-brand-300 text-slate-700"
                      >
                        {spec}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {Object.keys(grouped).length === 0 && (
                <p className="text-xs text-slate-500">{t("referral.noSpecialties")}</p>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => { setStep("specialty"); setSelectedSpecialty(""); setResults([]); }}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
          >
            <ChevronLeft size={14} /> {selectedSpecialty}
          </button>
          <input
            type="text"
            value={query}
            onChange={(e) => searchColleagues(e.target.value, selectedSpecialty)}
            placeholder={t("referral.searchPlaceholder")}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
          />
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
          {!searching && results.length === 0 && (
            <p className="text-xs text-slate-500">{t("referral.noProfessionals")}</p>
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
