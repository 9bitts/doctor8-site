"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import PracticeSettings from "@/components/PracticeSettings";
import PublicListingSettings from "@/components/PublicListingSettings";
import HealthPlansSettings from "@/components/HealthPlansSettings";
import LicenseDocumentsUpload from "@/components/LicenseDocumentsUpload";
import { Loader2, CheckCircle2, Video, Building2, DollarSign } from "lucide-react";

const CURRENCIES = ["USD", "EUR", "GBP", "BRL"];
const inputClass =
  "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40";

export default function PsychoanalystSettingsPage() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [trainingInstitution, setTrainingInstitution] = useState("");
  const [yearsOfPractice, setYearsOfPractice] = useState("0");
  const [personalAnalysisDone, setPersonalAnalysisDone] = useState(false);
  const [theoreticalStudyDone, setTheoreticalStudyDone] = useState(false);
  const [clinicalSupervision, setClinicalSupervision] = useState(false);
  const [theoreticalLineage, setTheoreticalLineage] = useState("");
  const [associations, setAssociations] = useState("");
  const [publications, setPublications] = useState("");
  const [otherRegulatedProfession, setOtherRegulatedProfession] = useState("");
  const [bio, setBio] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [acceptsTeleconsult, setAcceptsTeleconsult] = useState(true);
  const [acceptsInPerson, setAcceptsInPerson] = useState(false);
  const [sessionDurationMins, setSessionDurationMins] = useState("50");
  const [clinicCity, setClinicCity] = useState("");
  const [clinicCountry, setClinicCountry] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/psychoanalyst/profile");
        if (res.ok) {
          const d = await res.json();
          const p = d.profile;
          if (p) {
            setFirstName(p.firstName || "");
            setLastName(p.lastName || "");
            setTrainingInstitution(p.trainingInstitution || "");
            setYearsOfPractice(String(p.yearsOfPractice ?? 0));
            setPersonalAnalysisDone(!!p.personalAnalysisDone);
            setTheoreticalStudyDone(!!p.theoreticalStudyDone);
            setClinicalSupervision(!!p.clinicalSupervision);
            setTheoreticalLineage(p.theoreticalLineage || "");
            setAssociations((p.associations || []).join(", "));
            setPublications(p.publications || "");
            setOtherRegulatedProfession(p.otherRegulatedProfession || "");
            setBio(p.bio || "");
            setPrice(p.consultPrice ? String(p.consultPrice / 100) : "");
            setCurrency(p.currency || "USD");
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

  async function handleSave() {
    setError("");
    if (!firstName || !lastName || !trainingInstitution || !price) {
      setError(t("pa.settings.errRequired"));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/psychoanalyst/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          trainingInstitution,
          yearsOfPractice: Number(yearsOfPractice),
          personalAnalysisDone,
          theoreticalStudyDone,
          clinicalSupervision,
          theoreticalLineage,
          associations,
          publications,
          otherRegulatedProfession,
          bio,
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
        setError(t("pa.settings.errSave"));
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 size={28} className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("pa.settings.title")}</h1>
        <p className="text-slate-500 text-sm mt-1">{t("pa.settings.subtitle")}</p>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">{error}</p>}

      <PublicListingSettings apiPath="/api/psychoanalyst/public-profile" />
      <HealthPlansSettings apiPath="/api/psychoanalyst/health-plans" />
      <PracticeSettings apiPath="/api/psychoanalyst/practice" />
      <LicenseDocumentsUpload />

      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-sm">
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
          <label className="text-xs font-medium text-slate-600">{t("pa.settings.institution")}</label>
          <input className={inputClass} value={trainingInstitution} onChange={(e) => setTrainingInstitution(e.target.value)} />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-600">{t("pa.settings.years")}</label>
            <input type="number" min={0} className={inputClass} value={yearsOfPractice} onChange={(e) => setYearsOfPractice(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">{t("pa.settings.lineage")}</label>
            <input className={inputClass} value={theoreticalLineage} onChange={(e) => setTheoreticalLineage(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-700">{t("pa.settings.triad")}</p>
          {[
            [personalAnalysisDone, setPersonalAnalysisDone, "pa.settings.personalAnalysis"],
            [theoreticalStudyDone, setTheoreticalStudyDone, "pa.settings.theoreticalStudy"],
            [clinicalSupervision, setClinicalSupervision, "pa.settings.supervision"],
          ].map(([checked, setter, labelKey]) => (
            <label key={labelKey as string} className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={checked as boolean} onChange={(e) => (setter as (v: boolean) => void)(e.target.checked)} />
              {t(labelKey as string)}
            </label>
          ))}
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600">{t("pa.settings.associations")}</label>
          <input className={inputClass} value={associations} onChange={(e) => setAssociations(e.target.value)} placeholder="SBPSP, IPA..." />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600">{t("pa.settings.otherProfession")}</label>
          <input className={inputClass} value={otherRegulatedProfession} onChange={(e) => setOtherRegulatedProfession(e.target.value)} />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600">{t("pa.settings.bio")}</label>
          <textarea className={`${inputClass} min-h-[80px]`} value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-600 flex items-center gap-1"><DollarSign size={12} /> {t("pa.settings.price")}</label>
            <input className={inputClass} value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">{t("set.currency")}</label>
            <select className={inputClass} value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">{t("pa.settings.sessionMins")}</label>
            <input type="number" min={30} max={120} className={inputClass} value={sessionDurationMins} onChange={(e) => setSessionDurationMins(e.target.value)} />
          </div>
        </div>

        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm"><Video size={14} /><input type="checkbox" checked={acceptsTeleconsult} onChange={(e) => setAcceptsTeleconsult(e.target.checked)} />{t("appt.online")}</label>
          <label className="flex items-center gap-2 text-sm"><Building2 size={14} /><input type="checkbox" checked={acceptsInPerson} onChange={(e) => setAcceptsInPerson(e.target.checked)} />{t("appt.inPerson")}</label>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-600">{t("set.clinicCity")}</label>
            <input className={inputClass} value={clinicCity} onChange={(e) => setClinicCity(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">{t("set.clinicCountry")}</label>
            <input className={inputClass} value={clinicCountry} onChange={(e) => setClinicCountry(e.target.value)} />
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 rounded-xl disabled:opacity-50"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : saved ? <CheckCircle2 size={18} /> : null}
          {saving ? t("avail.saving") : saved ? t("avail.saved") : t("common.save")}
        </button>
      </div>
    </div>
  );
}
