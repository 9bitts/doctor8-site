"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { DollarSign, Video, Building2, Loader2, CheckCircle2 } from "lucide-react";

const CURRENCIES = ["USD", "EUR", "GBP", "BRL"];
const inputClass =
  "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40";

export type ConsultPricingSettingsProps = {
  profileApiPath?: string;
  pricingPatchPath?: string;
  showSessionDuration?: boolean;
  accent?: "brand" | "teal";
  embedded?: boolean;
  autoSave?: boolean;
  hideSaveButton?: boolean;
  onSaved?: () => void;
};

export default function ConsultPricingSettings({
  profileApiPath = "/api/professional/profile",
  pricingPatchPath,
  showSessionDuration = false,
  accent = "brand",
  embedded = false,
  autoSave = false,
  hideSaveButton = false,
  onSaved,
}: ConsultPricingSettingsProps) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [acceptsTeleconsult, setAcceptsTeleconsult] = useState(true);
  const [acceptsInPerson, setAcceptsInPerson] = useState(false);
  const [sessionDurationMins, setSessionDurationMins] = useState("50");
  const readyRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const accentText = accent === "teal" ? "text-teal-500" : "text-brand-500";
  const accentBg =
    accent === "teal"
      ? "bg-teal-50 border-teal-200 text-teal-600"
      : "bg-brand-50 border-brand-200 text-brand-600";
  const accentBtn = accent === "teal" ? "bg-teal-600 hover:bg-teal-700" : "bg-brand-500 hover:bg-brand-400";
  const accentRing = accent === "teal" ? "focus:ring-teal-500/40" : "focus:ring-brand-500/40";
  const accentCheck = accent === "teal" ? "accent-teal-600" : "accent-brand-500";

  useEffect(() => {
    fetch(profileApiPath)
      .then((r) => r.json())
      .then((d) => {
        const p = d.profile;
        if (p) {
          setPrice(p.consultPrice ? String(p.consultPrice / 100) : "");
          setCurrency(p.currency || "USD");
          setAcceptsTeleconsult(p.acceptsTeleconsult ?? true);
          setAcceptsInPerson(p.acceptsInPerson ?? false);
          if (showSessionDuration) {
            setSessionDurationMins(String(p.sessionDurationMins || 50));
          }
        }
      })
      .catch(() => setError(t("it.settings.pricingLoadErr")))
      .finally(() => {
        setLoading(false);
        readyRef.current = true;
      });
  }, [profileApiPath, showSessionDuration, t]);

  const persist = useCallback(async () => {
    setError("");
    if (!price || Number(price) <= 0) return;
    setSaving(true);
    try {
      if (pricingPatchPath) {
        const res = await fetch(pricingPatchPath, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            consultPrice: Math.round(Number(price) * 100),
            currency,
            acceptsTeleconsult,
            acceptsInPerson,
            sessionDurationMins: Number(sessionDurationMins) || 50,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || t("set.errGeneric"));
      } else {
        const res = await fetch(profileApiPath, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            consultPrice: Math.round(Number(price) * 100),
            currency,
            acceptsTeleconsult,
            acceptsInPerson,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || t("set.errGeneric"));
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("set.errGeneric"));
    } finally {
      setSaving(false);
    }
  }, [
    price,
    currency,
    acceptsTeleconsult,
    acceptsInPerson,
    sessionDurationMins,
    pricingPatchPath,
    profileApiPath,
    t,
    onSaved,
  ]);

  useEffect(() => {
    if (!autoSave || !readyRef.current) return;
    if (!price || Number(price) <= 0) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void persist();
    }, 1200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [price, currency, acceptsTeleconsult, acceptsInPerson, sessionDurationMins, autoSave, persist]);

  async function handleSave() {
    if (!price || Number(price) <= 0) {
      setError(t("it.settings.pricingRequired"));
      return;
    }
    await persist();
  }

  if (loading) {
    return (
      <div
        className={`flex justify-center ${embedded ? "py-6" : "bg-white rounded-2xl border border-slate-100 shadow-sm p-6"}`}
      >
        <Loader2 className={`animate-spin ${accentText}`} size={22} />
      </div>
    );
  }

  const showSaveButton = !hideSaveButton && !autoSave;

  const form = (
    <div className="space-y-4">
      {!embedded && (
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <DollarSign size={18} className={accentText} /> {t("set.consultation")}
            </h2>
            <p className="text-sm text-slate-500 mt-1">{t("it.settings.pricingDesc")}</p>
          </div>
          {saved && !autoSave && (
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium border px-3 py-1.5 rounded-full ${accentBg}`}
            >
              <CheckCircle2 size={14} /> {t("avail.saved")}
            </span>
          )}
        </div>
      )}

      {embedded && <p className="text-sm text-slate-500">{t("it.settings.pricingDesc")}</p>}

      {autoSave && (saving || saved) && (
        <p className="text-xs text-slate-500 flex items-center gap-1.5">
          {saving ? (
            <>
              <Loader2 size={12} className="animate-spin" /> {t("set.autoSaving")}
            </>
          ) : (
            <>
              <CheckCircle2 size={12} className="text-emerald-500" /> {t("set.autoSaved")}
            </>
          )}
        </p>
      )}

      {error && (
        <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1.5">
            {showSessionDuration ? t("it.settings.price") : t("set.pricePerConsult")}
          </label>
          <input
            type="number"
            className={`${inputClass} ${accentRing}`}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder={t("set.pricePlaceholder")}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("set.currency")}</label>
          <select
            className={`${inputClass} bg-white ${accentRing}`}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {showSessionDuration && (
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1.5">
            {t("it.settings.duration")}
          </label>
          <input
            type="number"
            min={15}
            className={`${inputClass} ${accentRing}`}
            value={sessionDurationMins}
            onChange={(e) => setSessionDurationMins(e.target.value)}
          />
        </div>
      )}

      <div className="flex flex-col gap-3 pt-1">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={acceptsTeleconsult}
            onChange={(e) => setAcceptsTeleconsult(e.target.checked)}
            className={`w-4 h-4 ${accentCheck}`}
          />
          <span className="text-sm text-slate-700 flex items-center gap-2">
            <Video size={15} /> {t("set.acceptTele")}
          </span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={acceptsInPerson}
            onChange={(e) => setAcceptsInPerson(e.target.checked)}
            className={`w-4 h-4 ${accentCheck}`}
          />
          <span className="text-sm text-slate-700 flex items-center gap-2">
            <Building2 size={15} /> {t("set.acceptInPerson")}
          </span>
        </label>
      </div>

      {showSaveButton && (
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={`${accentBtn} disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2`}
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saving ? t("set.saving") : t("it.settings.pricingSave")}
        </button>
      )}
    </div>
  );

  if (embedded) return form;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">{form}</div>
  );
}
