"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import ConsultPricingSettings from "@/components/professional/ConsultPricingSettings";
import PracticeSettings from "@/components/PracticeSettings";
import PublicListingSettings from "@/components/PublicListingSettings";
import HealthPlansSettings from "@/components/HealthPlansSettings";
import LicenseDocumentsUpload from "@/components/LicenseDocumentsUpload";
import OrganizationJoinSettings from "@/components/organization/OrganizationJoinSettings";
import IncompleteSectionHighlight from "@/components/IncompleteSectionHighlight";
import { useRegistrationChecklist } from "@/hooks/useRegistrationChecklist";
import { registrationChecklistHash } from "@/lib/provider-registration-complete";
import { Loader2, CheckCircle2, User, Camera, X } from "lucide-react";
import { initials as nameInitials } from "@/lib/format-name";

const PA_VARIANT = "psychoanalyst" as const;

const inputClass =
  "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40";

export default function PsychoanalystSettingsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const readyRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveGenRef = useRef(0);
  const [loading, setLoading] = useState(true);
  const [autoSaving, setAutoSaving] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const [error, setError] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
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
  const { providerChecklist, refresh: refreshRegistration } = useRegistrationChecklist();
  const missingProfessionalData = providerChecklist?.professionalData === false;
  const missingDocuments = providerChecklist?.verificationDocuments === false;
  const missingCareSettings = providerChecklist?.careSettings === false;

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    if (hash === "section-doctor-image") {
      router.replace("/psychoanalyst/settings/doctor-image");
      return;
    }
    requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [loading, router]);

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
            setAvatarUrl(p.avatarUrl || "");
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
        readyRef.current = true;
      }
    }
    load();
  }, []);

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(t("set.errPhoto"));
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const max = 400;
        let width = img.width;
        let height = img.height;
        if (width > height && width > max) {
          height = (height * max) / width;
          width = max;
        } else if (height > max) {
          width = (width * max) / height;
          height = max;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          setAvatarUrl(canvas.toDataURL("image/jpeg", 0.85));
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  const persistProfile = useCallback(async () => {
    if (!firstName || !lastName || !trainingInstitution) return;
    const gen = ++saveGenRef.current;
    setAutoSaving(true);
    setError("");
    try {
      const res = await fetch("/api/psychoanalyst/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          avatarUrl,
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
      if (gen !== saveGenRef.current) return;
      if (!res.ok) {
        setError(t("pa.settings.errSave"));
        return;
      }
      setAutoSaved(true);
      setTimeout(() => setAutoSaved(false), 3000);
      await refreshRegistration();
    } finally {
      if (gen === saveGenRef.current) setAutoSaving(false);
    }
  }, [
    firstName, lastName, avatarUrl, trainingInstitution, yearsOfPractice,
    personalAnalysisDone, theoreticalStudyDone, clinicalSupervision,
    theoreticalLineage, associations, publications, otherRegulatedProfession,
    bio, clinicCity, clinicCountry, t, refreshRegistration,
  ]);

  useEffect(() => {
    if (!readyRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void persistProfile();
    }, 1500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [
    firstName, lastName, avatarUrl, trainingInstitution, yearsOfPractice,
    personalAnalysisDone, theoreticalStudyDone, clinicalSupervision,
    theoreticalLineage, associations, publications, otherRegulatedProfession,
    bio, clinicCity, clinicCountry, persistProfile,
  ]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 size={28} className="animate-spin text-slate-400" />
      </div>
    );
  }

  const avatarInitials = nameInitials(firstName, lastName);

  return (
    <div className="relative max-w-2xl mx-auto space-y-6">
      <div className="sticky top-3 z-20 h-0 overflow-visible pointer-events-none flex justify-end">
        {(autoSaving || autoSaved) && (
          <p className="pointer-events-auto text-xs text-slate-600 flex items-center gap-1.5 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-full px-3 py-1.5 shadow-sm">
            {autoSaving ? (
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
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <User size={18} className="text-violet-500" />
            {t("pa.settings.photoIdentity")}
          </h2>
          <div className="flex items-center gap-5">
            <div className="relative">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-24 h-24 rounded-2xl object-cover border border-slate-200" />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-violet-100 flex items-center justify-center text-violet-600 text-2xl font-bold">
                  {avatarInitials !== "?" ? avatarInitials : <Camera size={28} />}
                </div>
              )}
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl("")}
                  className="absolute -top-2 -right-2 bg-white border border-slate-200 rounded-full p-1 shadow hover:bg-rose-50"
                >
                  <X size={14} className="text-rose-500" />
                </button>
              )}
            </div>
            <div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="bg-white border border-slate-200 hover:border-violet-200 text-slate-700 font-medium px-4 py-2 rounded-xl text-sm flex items-center gap-2"
              >
                <Camera size={15} /> {avatarUrl ? t("set.changePhoto") : t("set.uploadPhoto")}
              </button>
              <p className="text-xs text-slate-400 mt-2">{t("set.photoHint")}</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">            <div>
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
            autoSave
            hideSaveButton
            onSaved={refreshRegistration}
          />
          <PracticeSettings variant={PA_VARIANT} apiPath="/api/psychoanalyst/practice" />
        </div>
      </IncompleteSectionHighlight>

      {/* 3 — Perfil público */}
      <PublicListingSettings variant={PA_VARIANT} apiPath="/api/psychoanalyst/public-profile" />

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
