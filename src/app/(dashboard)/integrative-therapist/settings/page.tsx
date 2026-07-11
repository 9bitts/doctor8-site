"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  PICS_PRACTICES,
  PIC_CATEGORIES,
  picCategoryLabel,
  type PicCategory,
} from "@/lib/pics/practices";
import PracticeSettings from "@/components/PracticeSettings";
import ConsultPricingSettings from "@/components/professional/ConsultPricingSettings";
import PublicListingSettings from "@/components/PublicListingSettings";
import HealthPlansSettings from "@/components/HealthPlansSettings";
import LicenseDocumentsUpload from "@/components/LicenseDocumentsUpload";
import OrganizationJoinSettings from "@/components/organization/OrganizationJoinSettings";
import ProfileSettingsSection from "@/components/professional/ProfileSettingsSection";
import DoctorImageSettings from "@/components/DoctorImageSettings";
import RegistrationRegionSelect from "@/components/auth/RegistrationRegionSelect";
import IncompleteSectionHighlight from "@/components/IncompleteSectionHighlight";
import { useRegistrationChecklist } from "@/hooks/useRegistrationChecklist";
import { registrationChecklistHash } from "@/lib/provider-registration-complete";
import {
  parseRegistrationRegion,
  type RegistrationRegionCode,
} from "@/lib/registration-regions";
import {
  Loader2,
  CheckCircle2,
  User,
  Leaf,
  Camera,
  X,
  Globe,
  Calendar,
  Sparkles,
} from "lucide-react";
import { initials as nameInitials } from "@/lib/format-name";

const IT_VARIANT = "integrative_therapist" as const;

const inputClass =
  "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40";

export default function IntegrativeTherapistSettingsPage() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [avatarUrl, setAvatarUrl] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [trainingInstitution, setTrainingInstitution] = useState("");
  const [certifications, setCertifications] = useState("");
  const [yearsOfPractice, setYearsOfPractice] = useState("0");
  const [bio, setBio] = useState("");
  const [selectedPractices, setSelectedPractices] = useState<string[]>([]);
  const [clinicName, setClinicName] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");
  const [clinicCity, setClinicCity] = useState("");
  const [clinicState, setClinicState] = useState("");
  const [clinicCountry, setClinicCountry] = useState("");
  const [clinicZip, setClinicZip] = useState("");
  const [accountRegion, setAccountRegion] = useState<RegistrationRegionCode>("US");
  const [regionSaving, setRegionSaving] = useState(false);
  const [regionSaved, setRegionSaved] = useState(false);
  const [regionError, setRegionError] = useState("");
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
        const [profileRes, regionRes] = await Promise.all([
          fetch("/api/integrative-therapist/profile"),
          fetch("/api/user/region"),
        ]);
        if (regionRes.ok) {
          const regionData = await regionRes.json();
          const r = regionData?.region;
          if (r) setAccountRegion(parseRegistrationRegion(r, accountRegion));
        }
        if (profileRes.ok) {
          const d = await profileRes.json();
          const p = d.profile;
          if (p) {
            setAvatarUrl(p.avatarUrl || "");
            setFirstName(p.firstName || "");
            setLastName(p.lastName || "");
            setPhone(p.phone || "");
            setTrainingInstitution(p.trainingInstitution || "");
            setCertifications(p.certifications || "");
            setYearsOfPractice(String(p.yearsOfPractice ?? 0));
            setBio(p.bio || "");
            setSelectedPractices(p.picsPractices || []);
            setClinicName(p.clinicName || "");
            setClinicAddress(p.clinicAddress || "");
            setClinicCity(p.clinicCity || "");
            setClinicState(p.clinicState || "");
            setClinicCountry(p.clinicCountry || "");
            setClinicZip(p.clinicZip || "");
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

  async function saveAccountRegion() {
    setRegionSaving(true);
    setRegionError("");
    setRegionSaved(false);
    try {
      const res = await fetch("/api/user/region", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ region: accountRegion }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("acct.regionErr"));
      setRegionSaved(true);
      setTimeout(() => setRegionSaved(false), 4000);
      router.refresh();
    } catch (e) {
      setRegionError(e instanceof Error ? e.message : t("acct.regionErr"));
    } finally {
      setRegionSaving(false);
    }
  }

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

  async function handleSave() {
    setError("");
    if (!firstName || !lastName || !trainingInstitution) {
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
          phone,
          trainingInstitution,
          certifications,
          yearsOfPractice: Number(yearsOfPractice),
          bio,
          picsPractices: selectedPractices,
          avatarUrl,
          clinicName,
          clinicAddress,
          clinicCity,
          clinicState,
          clinicCountry,
          clinicZip,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || t("it.settings.errSave"));
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      router.refresh();
      await refreshRegistration();
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

  const avatarInitials = nameInitials(firstName, lastName);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
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

      {/* 1 — Região da conta */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <Globe size={18} className="text-teal-500" /> {t("it.settings.accountRegion")}
        </h2>
        <p className="text-sm text-slate-500">{t("it.settings.accountRegionDesc")}</p>
        {regionError && (
          <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
            {regionError}
          </p>
        )}
        {regionSaved && (
          <p className="text-sm text-teal-700 bg-teal-50 border border-teal-200 rounded-xl px-3 py-2">
            {t("it.settings.accountRegionSaved")}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">{t("it.settings.countryRegion")}</label>
            <RegistrationRegionSelect
              value={accountRegion}
              onChange={setAccountRegion}
              lang={lang}
              className={inputClass}
            />
          </div>
          <button
            type="button"
            onClick={saveAccountRegion}
            disabled={regionSaving}
            className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 shrink-0"
          >
            {regionSaving && <Loader2 size={14} className="animate-spin" />}
            {t("it.settings.saveRegion")}
          </button>
        </div>
      </div>

      {/* 2 — Identidade, foto e PICS */}
      <IncompleteSectionHighlight
        id={registrationChecklistHash("professionalData")}
        incomplete={missingProfessionalData}
      >
        <section className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <User size={18} className="text-teal-500" />
            {t("it.settings.photoIdentity")}
          </h2>
          <div className="flex items-center gap-5">
            <div className="relative">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-24 h-24 rounded-2xl object-cover border border-slate-200" />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-teal-100 flex items-center justify-center text-teal-600 text-2xl font-bold">
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
                className="bg-white border border-slate-200 hover:border-teal-200 text-slate-700 font-medium px-4 py-2 rounded-xl text-sm flex items-center gap-2"
              >
                <Camera size={15} /> {avatarUrl ? t("set.changePhoto") : t("set.uploadPhoto")}
              </button>
              <p className="text-xs text-slate-400 mt-2">{t("set.photoHint")}</p>
            </div>
          </div>
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
            <label className="text-xs font-medium text-slate-600">{t("it.settings.phone")}</label>
            <input
              className={inputClass}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("it.settings.phoneHint")}
            />
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-slate-800">{t("it.settings.identity")}</h2>
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
            <label className="text-xs font-medium text-slate-600">{t("it.settings.yearsLabel")}</label>
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
              className={`${inputClass} min-h-[80px] resize-y`}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t("it.settings.bioPlaceholder")}
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

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-xl disabled:opacity-50"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : saved ? <CheckCircle2 size={18} /> : null}
            {saving ? t("avail.saving") : saved ? t("avail.saved") : t("set.saveProfile")}
          </button>
        </section>
      </IncompleteSectionHighlight>

      {/* 3 — Honorários e locais de atendimento */}
      <IncompleteSectionHighlight
        id={registrationChecklistHash("careSettings")}
        incomplete={missingCareSettings}
      >
        <div className="space-y-6">
          <ConsultPricingSettings
            variant={IT_VARIANT}
            consultServicesApiPath="/api/integrative-therapist/consult-services"
            showSessionDuration
            accent="teal"
            onSaved={refreshRegistration}
          />
          <PracticeSettings variant={IT_VARIANT} apiPath="/api/integrative-therapist/practice" />
        </div>
      </IncompleteSectionHighlight>

      {/* 4 — Perfil público */}
      <PublicListingSettings variant={IT_VARIANT} apiPath="/api/integrative-therapist/public-profile" />

      <ProfileSettingsSection
        id="section-doctor-image"
        title={t("it.settings.publicProfileTitle")}
        description={t("it.settings.publicProfileDesc")}
        icon={<Sparkles size={18} />}
        open={doctorImageOpen}
        onToggle={() => setDoctorImageOpen((v) => !v)}
        optional
      >
        <DoctorImageSettings variant={IT_VARIANT} apiPath="/api/integrative-therapist/public-profile" />
      </ProfileSettingsSection>

      {/* 5 — Certificações */}
      <LicenseDocumentsUpload variant={IT_VARIANT} incomplete={missingDocuments} />

      {/* 6 — Convênios (opcional) */}
      <HealthPlansSettings variant={IT_VARIANT} apiPath="/api/integrative-therapist/health-plans" />

      {/* 7 — Organização (opcional) */}
      <OrganizationJoinSettings
        variant={IT_VARIANT}
        listEndpoint="/api/integrative-therapist/organization"
        joinEndpoint="/api/integrative-therapist/organization"
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sticky bottom-4 bg-white/80 backdrop-blur rounded-2xl border border-slate-100 shadow-lg p-3">
        <p className="text-xs text-slate-400 sm:pl-2 flex items-center gap-1.5">
          <Calendar size={14} />
          {t("it.settings.saveNote")}{" "}
          <Link href="/integrative-therapist/settings/availability" className="text-teal-600 underline">
            {t("set.availabilityLink")}
          </Link>
          .
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white font-semibold px-6 py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 shrink-0 min-h-[44px]"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : null}
          {t("set.saveProfile")}
        </button>
      </div>
    </div>
  );
}
