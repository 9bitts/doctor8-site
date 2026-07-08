"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";
import {
  DollarSign,
  Video,
  Building2,
  Loader2,
  CheckCircle2,
  Plus,
  Trash2,
  Stethoscope,
} from "lucide-react";
import type { ProviderServiceDto } from "@/lib/practice";

const CURRENCIES = ["USD", "EUR", "GBP", "BRL"];
const inputClass =
  "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40";

type ServiceRow = Omit<ProviderServiceDto, "id">;

const SERVICE_PRESETS = [
  { key: "consultServices.preset.clinical", defaultName: "Consulta clínica" },
  { key: "consultServices.preset.followUp", defaultName: "Retorno" },
  { key: "consultServices.preset.specialty", defaultName: "Especialidade" },
  { key: "consultServices.preset.surgery", defaultName: "Cirurgia / procedimento" },
  { key: "consultServices.preset.volunteer", defaultName: "Consulta voluntária", volunteer: true },
] as const;

function emptyService(currency: string): ServiceRow {
  return {
    name: "",
    description: null,
    priceCents: null,
    currency,
    isActive: true,
    sortOrder: 0,
  };
}

function fmtPrice(cents: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

export type ConsultPricingSettingsProps = {
  consultServicesApiPath?: string;
  showSessionDuration?: boolean;
  accent?: "brand" | "teal";
  embedded?: boolean;
  autoSave?: boolean;
  hideSaveButton?: boolean;
  onSaved?: () => void;
};

export default function ConsultPricingSettings({
  consultServicesApiPath = "/api/professional/consult-services",
  showSessionDuration = false,
  accent = "brand",
  embedded = false,
  autoSave = false,
  hideSaveButton = false,
  onSaved,
}: ConsultPricingSettingsProps) {
  const { t, lang } = useI18n();
  const locale = localeOf(lang);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [currency, setCurrency] = useState("BRL");
  const [acceptsTeleconsult, setAcceptsTeleconsult] = useState(true);
  const [acceptsInPerson, setAcceptsInPerson] = useState(false);
  const [sessionDurationMins, setSessionDurationMins] = useState("50");
  const readyRef = useRef(false);
  const skipAutoSaveRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const accentText = accent === "teal" ? "text-teal-500" : "text-brand-500";
  const accentBg =
    accent === "teal"
      ? "bg-teal-50 border-teal-200 text-teal-600"
      : "bg-brand-50 border-brand-200 text-brand-600";
  const accentBtn = accent === "teal" ? "bg-teal-600 hover:bg-teal-700" : "bg-brand-500 hover:bg-brand-400";
  const accentRing = accent === "teal" ? "focus:ring-teal-500/40" : "focus:ring-brand-500/40";
  const accentCheck = accent === "teal" ? "accent-teal-600" : "accent-brand-500";
  const accentPreset =
    accent === "teal"
      ? "bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100"
      : "bg-brand-50 border-brand-200 text-brand-700 hover:bg-brand-100";

  useEffect(() => {
    fetch(consultServicesApiPath)
      .then((r) => r.json())
      .then((d) => {
        setServices(
          d.services?.length
            ? d.services.map((s: ProviderServiceDto) => ({
                name: s.name,
                description: s.description,
                priceCents: s.priceCents,
                currency: s.currency || d.currency || "BRL",
                isActive: s.isActive,
                sortOrder: s.sortOrder,
              }))
            : [emptyService(d.currency || "BRL")],
        );
        setCurrency(d.currency || "BRL");
        setAcceptsTeleconsult(d.acceptsTeleconsult ?? true);
        setAcceptsInPerson(d.acceptsInPerson ?? false);
        if (showSessionDuration && d.sessionDurationMins) {
          setSessionDurationMins(String(d.sessionDurationMins));
        }
      })
      .catch(() => setError(t("it.settings.pricingLoadErr")))
      .finally(() => {
        setLoading(false);
        readyRef.current = true;
      });
  }, [consultServicesApiPath, showSessionDuration, t]);

  const validServices = services.filter((s) => s.name.trim());

  const persist = useCallback(async () => {
    setError("");
    if (validServices.length === 0) {
      setError(t("consultServices.errRequired"));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(consultServicesApiPath, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          services: validServices.map((s, i) => ({
            ...s,
            currency,
            sortOrder: i,
          })),
          currency,
          acceptsTeleconsult,
          acceptsInPerson,
          ...(showSessionDuration
            ? { sessionDurationMins: Number(sessionDurationMins) || 50 }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("set.errGeneric"));
      if (data.services) {
        skipAutoSaveRef.current = true;
        setServices(
          data.services.map((s: ProviderServiceDto) => ({
            name: s.name,
            description: s.description,
            priceCents: s.priceCents,
            currency: s.currency,
            isActive: s.isActive,
            sortOrder: s.sortOrder,
          })),
        );
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
    validServices,
    currency,
    acceptsTeleconsult,
    acceptsInPerson,
    sessionDurationMins,
    showSessionDuration,
    consultServicesApiPath,
    t,
    onSaved,
  ]);

  useEffect(() => {
    if (!autoSave || !readyRef.current) return;
    if (skipAutoSaveRef.current) {
      skipAutoSaveRef.current = false;
      return;
    }
    if (validServices.length === 0) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void persist();
    }, 1400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [services, currency, acceptsTeleconsult, acceptsInPerson, sessionDurationMins, autoSave, persist, validServices.length]);

  function addPreset(preset: (typeof SERVICE_PRESETS)[number]) {
    const name = t(preset.key) !== preset.key ? t(preset.key) : preset.defaultName;
    if (services.some((s) => s.name.trim().toLowerCase() === name.toLowerCase())) return;
    setServices([
      ...services,
      {
        ...emptyService(currency),
        name,
        priceCents: "volunteer" in preset && preset.volunteer ? 0 : null,
      },
    ]);
  }

  function updateService(index: number, patch: Partial<ServiceRow>) {
    setServices((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch, currency } : s)));
  }

  function removeService(index: number) {
    setServices((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  async function handleSave() {
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
    <div className="space-y-5">
      {!embedded && (
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <DollarSign size={18} className={accentText} /> {t("set.consultation")}
            </h2>
            <p className="text-sm text-slate-500 mt-1">{t("consultServices.subtitle")}</p>
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

      {embedded && <p className="text-sm text-slate-500">{t("consultServices.subtitle")}</p>}

      {error && (
        <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      <div>
        <p className="text-xs font-semibold text-slate-600 mb-2">{t("consultServices.quickAdd")}</p>
        <div className="flex flex-wrap gap-2">
          {SERVICE_PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              onClick={() => addPreset(preset)}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${accentPreset}`}
            >
              + {t(preset.key) !== preset.key ? t(preset.key) : preset.defaultName}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <Stethoscope size={16} className={accentText} />
          {t("consultServices.typesTitle")}
        </p>

        {services.map((svc, i) => {
          const isVolunteer = svc.priceCents === 0;
          return (
            <div
              key={i}
              className="border border-slate-100 rounded-xl p-4 space-y-3 bg-slate-50/40"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500">
                  {t("pubPhase3.serviceN").replace("{n}", String(i + 1))}
                </span>
                {services.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeService(i)}
                    className="text-rose-500 p-1 hover:bg-rose-50 rounded-lg"
                    aria-label={t("licenseDocs.delete")}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              <input
                className={`${inputClass} ${accentRing}`}
                placeholder={t("consultServices.namePlaceholder")}
                value={svc.name}
                onChange={(e) => updateService(i, { name: e.target.value })}
              />

              <input
                className={`${inputClass} ${accentRing}`}
                placeholder={t("consultServices.descPlaceholder")}
                value={svc.description || ""}
                onChange={(e) => updateService(i, { description: e.target.value || null })}
              />

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    {t("consultServices.priceLabel")}
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    disabled={isVolunteer}
                    className={`${inputClass} ${accentRing} disabled:bg-slate-100 disabled:text-slate-400`}
                    placeholder={isVolunteer ? t("consultServices.volunteerPrice") : "0,00"}
                    value={
                      isVolunteer
                        ? ""
                        : svc.priceCents != null
                          ? String(svc.priceCents / 100)
                          : ""
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      updateService(i, {
                        priceCents: v === "" ? null : Math.round(parseFloat(v) * 100),
                      });
                    }}
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer pb-2.5">
                    <input
                      type="checkbox"
                      checked={isVolunteer}
                      onChange={(e) =>
                        updateService(i, { priceCents: e.target.checked ? 0 : null })
                      }
                      className={accentCheck}
                    />
                    {t("consultServices.volunteerToggle")}
                  </label>
                </div>
              </div>

              {svc.priceCents != null && svc.name.trim() && (
                <p className="text-xs text-slate-500">
                  {isVolunteer
                    ? t("consultServices.volunteerHint")
                    : fmtPrice(svc.priceCents, currency, locale)}
                </p>
              )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => setServices([...services, emptyService(currency)])}
          className={`text-sm font-medium flex items-center gap-1 ${accentText}`}
        >
          <Plus size={14} /> {t("consultServices.addType")}
        </button>
      </div>

      <div className="border-t border-slate-100 pt-4 space-y-4">
        <p className="text-sm font-semibold text-slate-800">{t("consultServices.generalTitle")}</p>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">
              {t("set.currency")}
            </label>
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
        </div>

        <div className="flex flex-col gap-3">
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
      </div>

      {showSaveButton && (
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={`${accentBtn} disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2`}
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saving ? t("set.saving") : t("consultServices.save")}
        </button>
      )}

      {autoSave && (
        <div className="min-h-[20px] pt-1">
          {(saving || saved) && (
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
        </div>
      )}
    </div>
  );

  if (embedded) return form;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">{form}</div>
  );
}
