"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { DollarSign, Video, Building2, Loader2, CheckCircle2 } from "lucide-react";

const CURRENCIES = ["USD", "EUR", "GBP", "BRL"];
const inputClass =
  "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40";

export default function ConsultPricingSettings() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [acceptsTeleconsult, setAcceptsTeleconsult] = useState(true);
  const [acceptsInPerson, setAcceptsInPerson] = useState(false);

  useEffect(() => {
    fetch("/api/professional/profile")
      .then((r) => r.json())
      .then((d) => {
        const p = d.profile;
        if (p) {
          setPrice(p.consultPrice ? String(p.consultPrice / 100) : "");
          setCurrency(p.currency || "USD");
          setAcceptsTeleconsult(p.acceptsTeleconsult ?? true);
          setAcceptsInPerson(p.acceptsInPerson ?? false);
        }
      })
      .catch(() => setError("Nao foi possivel carregar o preco da consulta."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setError("");
    if (!price || Number(price) <= 0) {
      setError("Informe o valor da consulta.");
      return;
    }
    setSaving(true);
    try {
      const profileRes = await fetch("/api/professional/profile");
      const profileData = await profileRes.json();
      const p = profileData.profile;
      if (!p) throw new Error("Perfil nao encontrado.");

      const res = await fetch("/api/professional/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: p.firstName,
          lastName: p.lastName,
          specialty: p.specialty,
          subspecialties: p.subspecialties || [],
          licenseNumber: p.licenseNumber,
          licenseState: p.licenseState || "",
          bio: p.bio || "",
          avatarUrl: p.avatarUrl || "",
          clinicName: p.clinicName || "",
          clinicAddress: p.clinicAddress || "",
          clinicCity: p.clinicCity || "",
          clinicState: p.clinicState || "",
          clinicCountry: p.clinicCountry || "",
          clinicZip: p.clinicZip || "",
          consultPrice: Math.round(Number(price) * 100),
          currency,
          acceptsTeleconsult,
          acceptsInPerson,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("set.errGeneric"));
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("set.errGeneric"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex justify-center">
        <Loader2 className="animate-spin text-brand-500" size={22} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <DollarSign size={18} className="text-brand-500" /> {t("set.consultation")}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Valor cobrado dos pacientes e tipos de atendimento que voce oferece.
          </p>
        </div>
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 bg-brand-50 border border-brand-200 px-3 py-1.5 rounded-full">
            <CheckCircle2 size={14} /> Salvo
          </span>
        )}
      </div>

      {error && (
        <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1.5">
            {t("set.pricePerConsult")}
          </label>
          <input
            type="number"
            className={inputClass}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder={t("set.pricePlaceholder")}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1.5">
            {t("set.currency")}
          </label>
          <select
            className={inputClass + " bg-white"}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-1">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={acceptsTeleconsult}
            onChange={(e) => setAcceptsTeleconsult(e.target.checked)}
            className="w-4 h-4 accent-brand-500"
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
            className="w-4 h-4 accent-brand-500"
          />
          <span className="text-sm text-slate-700 flex items-center gap-2">
            <Building2 size={15} /> {t("set.acceptInPerson")}
          </span>
        </label>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2"
      >
        {saving && <Loader2 size={14} className="animate-spin" />}
        {saving ? t("set.saving") : "Salvar preco da consulta"}
      </button>
    </div>
  );
}
