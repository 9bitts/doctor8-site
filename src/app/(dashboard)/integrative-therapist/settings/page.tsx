"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  PICS_PRACTICES,
  PIC_CATEGORIES,
  picCategoryLabel,
  type PicCategory,
} from "@/lib/pics/practices";
import LicenseDocumentsUpload from "@/components/LicenseDocumentsUpload";
import { Loader2, CheckCircle2, Video, Building2, DollarSign, Leaf } from "lucide-react";

const inputClass =
  "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40";

const CURRENCIES = ["USD", "EUR", "GBP", "BRL"];

export default function IntegrativeTherapistSettingsPage() {
  const { t, lang } = useI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [trainingInstitution, setTrainingInstitution] = useState("");
  const [certifications, setCertifications] = useState("");
  const [yearsOfPractice, setYearsOfPractice] = useState("0");
  const [bio, setBio] = useState("");
  const [selectedPractices, setSelectedPractices] = useState<string[]>([]);
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("BRL");
  const [acceptsTeleconsult, setAcceptsTeleconsult] = useState(true);
  const [acceptsInPerson, setAcceptsInPerson] = useState(false);
  const [sessionDurationMins, setSessionDurationMins] = useState("50");
  const [clinicCity, setClinicCity] = useState("");
  const [clinicCountry, setClinicCountry] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/integrative-therapist/profile");
        if (res.ok) {
          const d = await res.json();
          const p = d.profile;
          if (p) {
            setFirstName(p.firstName || "");
            setLastName(p.lastName || "");
            setTrainingInstitution(p.trainingInstitution || "");
            setCertifications(p.certifications || "");
            setYearsOfPractice(String(p.yearsOfPractice ?? 0));
            setBio(p.bio || "");
            setSelectedPractices(p.picsPractices || []);
            setPrice(p.consultPrice ? String(p.consultPrice / 100) : "");
            setCurrency(p.currency || "BRL");
            setAcceptsTeleconsult(p.acceptsTeleconsult ?? true);
            setAcceptsInPerson(p.acceptsInPerson ?? false);
            setSessionDurationMins(String(p.sessionDurationMins || 50));
            setClinicCity(p.clinicCity || "");
            setClinicCountry(p.clinicCountry || "");
          }
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function togglePractice(slug: string) {
    setSelectedPractices((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  }

  async function handleSave() {
    setError("");
    if (!firstName || !lastName || !trainingInstitution || !price) {
      setError(t("it.settings.errRequired"));
      return;
    }
    if (selectedPractices.length === 0) {
      setError(t("it.settings.errPractices"));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/integrative-therapist/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          trainingInstitution,
          certifications,
          yearsOfPractice: Number(yearsOfPractice),
          bio,
          picsPractices: selectedPractices,
          consultPrice: Math.round(Number(price) * 100),
          currency,
          acceptsTeleconsult,
          acceptsInPerson,
          sessionDurationMins: Number(sessionDurationMins),
          clinicCity,
          clinicCountry,
        }),
      });
      if (!res.ok) {
        setError(t("it.settings.errSave"));
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  const grouped = PICS_PRACTICES.reduce<Record<PicCategory, typeof PICS_PRACTICES>>(
    (acc, p) => {
      acc[p.category].push(p);
      return acc;
    },
    {
      corporal: [],
      energetica: [],
      mental_emocional: [],
      naturalista: [],
      tradicional: [],
    },
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Leaf className="text-teal-500" size={24} />
          {t("nav.myProfile")}
        </h1>
        <p className="text-slate-500 text-sm mt-1">{t("it.settings.subtitle")}</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
      )}
      {saved && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-700">
          <CheckCircle2 size={16} /> {t("avail.saved")}
        </div>
      )}

      <section className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-slate-800">{t("it.settings.identity")}</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-600">{t("reg.firstName")}</label>
            <input className={inputClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">{t("reg.lastName")}</label>
            <input className={inputClass} value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">{t("it.settings.institution")}</label>
          <input
            className={inputClass}
            value={trainingInstitution}
            onChange={(e) => setTrainingInstitution(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">{t("it.settings.certifications")}</label>
          <input
            className={inputClass}
            value={certifications}
            onChange={(e) => setCertifications(e.target.value)}
            placeholder={t("it.settings.certificationsHint")}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">{t("it.settings.years")}</label>
          <input
            type="number"
            min={0}
            className={inputClass}
            value={yearsOfPractice}
            onChange={(e) => setYearsOfPractice(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">{t("it.settings.bio")}</label>
          <textarea
            className={`${inputClass} min-h-[80px]`}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-slate-800">{t("it.settings.picsTitle")}</h2>
        <p className="text-xs text-slate-500">{t("it.settings.picsHint")}</p>
        {(Object.keys(grouped) as PicCategory[]).map((cat) =>
          grouped[cat].length === 0 ? null : (
            <div key={cat}>
              <p className="text-xs font-bold text-teal-700 uppercase tracking-wide mb-2">
                {picCategoryLabel(cat, lang)}
              </p>
              <div className="flex flex-wrap gap-2">
                {grouped[cat].map((p) => {
                  const active = selectedPractices.includes(p.slug);
                  const label = lang.startsWith("pt")
                    ? p.labelPt
                    : lang.startsWith("en")
                      ? p.labelEn
                      : p.labelEs;
                  return (
                    <button
                      key={p.slug}
                      type="button"
                      onClick={() => togglePractice(p.slug)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition ${
                        active
                          ? "bg-teal-100 border-teal-400 text-teal-800 font-semibold"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:border-teal-300"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          ),
        )}
        <p className="text-xs text-slate-500">
          {t("it.settings.picsSelected")}: {selectedPractices.length}
        </p>
      </section>

      <section className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <DollarSign size={18} className="text-teal-500" />
          {t("it.settings.practice")}
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-600">{t("it.settings.price")}</label>
            <input
              type="number"
              min={0}
              step="0.01"
              className={inputClass}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">{t("it.settings.currency")}</label>
            <select
              className={inputClass}
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
        <div>
          <label className="text-xs font-medium text-slate-600">{t("it.settings.duration")}</label>
          <input
            type="number"
            min={15}
            className={inputClass}
            value={sessionDurationMins}
            onChange={(e) => setSessionDurationMins(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={acceptsTeleconsult}
              onChange={(e) => setAcceptsTeleconsult(e.target.checked)}
              className="rounded border-slate-300 text-teal-600"
            />
            <Video size={14} className="text-teal-500" />
            {t("it.settings.teleconsult")}
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={acceptsInPerson}
              onChange={(e) => setAcceptsInPerson(e.target.checked)}
              className="rounded border-slate-300 text-teal-600"
            />
            <Building2 size={14} className="text-teal-500" />
            {t("it.settings.inPerson")}
          </label>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-600">{t("it.settings.city")}</label>
            <input className={inputClass} value={clinicCity} onChange={(e) => setClinicCity(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">{t("it.settings.country")}</label>
            <input
              className={inputClass}
              value={clinicCountry}
              onChange={(e) => setClinicCountry(e.target.value)}
            />
          </div>
        </div>
      </section>

      <LicenseDocumentsUpload />

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white font-semibold px-6 py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : null}
        {t("common.save")}
      </button>
    </div>
  );
}
