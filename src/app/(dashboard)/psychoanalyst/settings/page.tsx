"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import ConsultPricingSettings from "@/components/professional/ConsultPricingSettings";
import PracticeSettings from "@/components/PracticeSettings";
import PublicListingSettings from "@/components/PublicListingSettings";
import HealthPlansSettings from "@/components/HealthPlansSettings";
import LicenseDocumentsUpload from "@/components/LicenseDocumentsUpload";
import OrganizationJoinSettings from "@/components/organization/OrganizationJoinSettings";
import IncompleteSectionHighlight from "@/components/IncompleteSectionHighlight";
import ProfileSettingsSection from "@/components/professional/ProfileSettingsSection";
import DoctorImageSettings from "@/components/DoctorImageSettings";
import { useRegistrationChecklist } from "@/hooks/useRegistrationChecklist";
import { registrationChecklistHash } from "@/lib/provider-registration-complete";
import { Loader2, CheckCircle2, Sparkles } from "lucide-react";

const PA_VARIANT = "psychoanalyst" as const;

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
  const [clinicCity, setClinicCity] = useState("");
  const [clinicCountry, setClinicCountry] = useState("");
  const [doctorImageOpen, setDoctorImageOpen] = useState(false);

  const { providerChecklist, refresh: refreshRegistration } = useRegistrationChecklist();
  const missingProfessionalData = providerChecklist?.professionalData === false;
  const missingDocuments = providerChecklist?.verificationDocuments === false;
  const missingCareSettings = providerChecklist?.careSettings === false;

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    if (hash === "section-doctor-image") setDoctorImageOpen(true);
    requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [loading]);

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
    if (!firstName || !lastName || !trainingInstitution) {
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
      await refreshRegistration();
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

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">{error}</p>
      )}

      {/* 1 — Formação e identidade analítica */}
      <IncompleteSectionHighlight
        id={registrationChecklistHash("professionalData")}
        incomplete={missingProfessionalData}
      >
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
              <label className="text-xs font-medium text-slate-600">{t("pa.settings.yearsClinical")}</label>
              <input type="number" min={0} className={inputClass} value={yearsOfPractice} onChange={(e) => setYearsOfPractice(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">{t("pa.settings.lineage")}</label>
              <input className={inputClass} value={theoreticalLineage} onChange={(e) => setTheoreticalLineage(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-700">{t("pa.settings.triad")}</p>
            <p className="text-xs text-slate-500">{t("pa.settings.triadHint")}</p>
            {[
              [personalAnalysisDone, setPersonalAnalysisDone, "pa.settings.personalAnalysis"],
              [theoreticalStudyDone, setTheoreticalStudyDone, "pa.settings.theoreticalStudy"],
              [clinicalSupervision, setClinicalSupervision, "pa.settings.supervision"],
            ].map(([checked, setter, labelKey]) => (
              <label key={labelKey as string} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={checked as boolean}
                  onChange={(e) => (setter as (v: boolean) => void)(e.target.checked)}
                  className="accent-violet-600"
                />
                {t(labelKey as string)}
              </label>
            ))}
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">{t("pa.settings.associations")}</label>
            <input className={inputClass} value={associations} onChange={(e) => setAssociations(e.target.value)} placeholder="SBPSP, IPA..." />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">{t("pa.settings.publications")}</label>
            <textarea
              className={`${inputClass} min-h-[60px] resize-y`}
              value={publications}
              onChange={(e) => setPublications(e.target.value)}
              placeholder={t("pa.settings.publicationsPlaceholder")}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">{t("pa.settings.otherProfession")}</label>
            <input className={inputClass} value={otherRegulatedProfession} onChange={(e) => setOtherRegulatedProfession(e.target.value)} />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">{t("pa.settings.bio")}</label>
            <textarea
              className={`${inputClass} min-h-[80px] resize-y`}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t("pa.settings.bioPlaceholder")}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600">{t("pa.settings.clinicCity")}</label>
              <input className={inputClass} value={clinicCity} onChange={(e) => setClinicCity(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">{t("pa.settings.clinicCountry")}</label>
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
      </IncompleteSectionHighlight>

      {/* 2 — Honorários e setting de atendimento */}
      <IncompleteSectionHighlight
        id={registrationChecklistHash("careSettings")}
        incomplete={missingCareSettings}
      >
        <div className="space-y-6">
          <ConsultPricingSettings
            variant={PA_VARIANT}
            consultServicesApiPath="/api/psychoanalyst/consult-services"
            showSessionDuration
            accent="violet"
            onSaved={refreshRegistration}
          />
          <PracticeSettings variant={PA_VARIANT} apiPath="/api/psychoanalyst/practice" />
        </div>
      </IncompleteSectionHighlight>

      {/* 3 — Perfil público */}
      <PublicListingSettings variant={PA_VARIANT} apiPath="/api/psychoanalyst/public-profile" />

      <ProfileSettingsSection
        id="section-doctor-image"
        title={t("pa.settings.publicProfileTitle")}
        description={t("pa.settings.publicProfileDesc")}
        icon={<Sparkles size={18} />}
        open={doctorImageOpen}
        onToggle={() => setDoctorImageOpen((v) => !v)}
        optional
      >
        <DoctorImageSettings variant={PA_VARIANT} apiPath="/api/psychoanalyst/public-profile" />
      </ProfileSettingsSection>

      {/* 4 — Documentos de formação */}
      <LicenseDocumentsUpload variant={PA_VARIANT} incomplete={missingDocuments} />

      {/* 5 — Planos / reembolso (opcional) */}
      <HealthPlansSettings variant={PA_VARIANT} apiPath="/api/psychoanalyst/health-plans" />

      {/* 6 — Instituto / organização (opcional) */}
      <OrganizationJoinSettings
        variant={PA_VARIANT}
        listEndpoint="/api/psychoanalyst/organization"
        joinEndpoint="/api/psychoanalyst/organization"
      />
    </div>
  );
}
