"use client";

// src/app/(dashboard)/professional/settings/page.tsx
// Unified professional profile with collapsible sections and auto-save.

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { PROFESSION_GROUPS, getProfessionLabel } from "@/lib/professions";
import PracticeSettings from "@/components/PracticeSettings";
import PublicListingSettings from "@/components/PublicListingSettings";
import HealthPlansSettings from "@/components/HealthPlansSettings";
import LicenseDocumentsUpload from "@/components/LicenseDocumentsUpload";
import CvUpload from "@/components/CvUpload";
import RegistrationRegionSelect from "@/components/auth/RegistrationRegionSelect";
import ProfileSettingsSection from "@/components/professional/ProfileSettingsSection";
import ConsultPricingSettings from "@/components/professional/ConsultPricingSettings";
import AvailabilitySettings from "@/components/professional/AvailabilitySettings";
import DigitalSignSettings from "@/components/professional/DigitalSignSettings";
import DoctorConnectionSettings from "@/components/professional/DoctorConnectionSettings";
import PublicProfileActivation from "@/components/professional/PublicProfileActivation";
import {
  parseRegistrationRegion,
  toBillingRegion,
  type RegistrationRegionCode,
} from "@/lib/registration-regions";
import { isPsychologistSpecialty } from "@/lib/psychologist-portal";
import {
  Loader2, CheckCircle2, User, Award, Camera, X, Plus,
  LayoutTemplate, Globe, Building2, Calendar, DollarSign,
  PenLine, CreditCard, MapPin,
} from "lucide-react";

const inputClass =
  "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40";

type SectionStatus = {
  identity: boolean;
  credentials: boolean;
  consultation: boolean;
  availability: boolean;
  digitalSign: boolean;
  doctorConnection: boolean;
};

const DEFAULT_SECTIONS: SectionStatus = {
  identity: false,
  credentials: false,
  consultation: false,
  availability: false,
  digitalSign: false,
  doctorConnection: false,
};

export default function ProfessionalSettings() {
  const { lang, t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const isPsychologistPortal = pathname.startsWith("/psychologist");
  const fileRef = useRef<HTMLInputElement>(null);
  const readyRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [loading, setLoading] = useState(true);
  const [autoSaving, setAutoSaving] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const [error, setError] = useState("");
  const [sectionStatus, setSectionStatus] = useState<SectionStatus>(DEFAULT_SECTIONS);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    identity: true,
    credentials: false,
    consultation: false,
    availability: false,
    digitalSign: false,
    doctorConnection: false,
    clinic: false,
    region: false,
    publicDetails: false,
    healthPlans: false,
    practice: false,
  });

  const [avatarUrl, setAvatarUrl] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [profession, setProfession] = useState("General Practice");
  const [subInput, setSubInput] = useState("");
  const [subspecialties, setSubspecialties] = useState<string[]>([]);
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseState, setLicenseState] = useState("");
  const [bio, setBio] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");
  const [clinicCity, setClinicCity] = useState("");
  const [clinicState, setClinicState] = useState("");
  const [clinicCountry, setClinicCountry] = useState("");
  const [clinicZip, setClinicZip] = useState("");
  const [accountRegion, setAccountRegion] = useState<RegistrationRegionCode>("US");
  const regionReadyRef = useRef(false);

  const refreshSectionStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/professional/profile-sections-status");
      if (res.ok) {
        const data = await res.json();
        setSectionStatus({
          identity: !!data.identity,
          credentials: !!data.credentials,
          consultation: !!data.consultation,
          availability: !!data.availability,
          digitalSign: !!data.digitalSign,
          doctorConnection: !!data.doctorConnection,
        });
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    const map: Record<string, string> = {
      "section-identity": "identity",
      "section-credentials": "credentials",
      "section-consultation": "consultation",
      "section-availability": "availability",
      "section-digital-sign": "digitalSign",
      "section-doctor-connection": "doctorConnection",
      "section-clinic": "clinic",
      "section-region": "region",
      "section-public-details": "publicDetails",
      "section-health-plans": "healthPlans",
      "section-practice": "practice",
    };
    const sectionKey = map[hash];
    if (sectionKey) {
      setOpenSections((prev) => ({ ...prev, [sectionKey]: true }));
      requestAnimationFrame(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, sessionRes] = await Promise.all([
          fetch("/api/professional/profile"),
          fetch("/api/auth/session"),
        ]);
        if (sessionRes.ok) {
          const session = await sessionRes.json();
          const r = session?.user?.region;
          if (r) setAccountRegion(parseRegistrationRegion(r, "US"));
        }
        const regionRes = await fetch("/api/user/region");
        if (regionRes.ok) {
          const regionData = await regionRes.json();
          const r = regionData?.region;
          if (r) setAccountRegion(parseRegistrationRegion(r, "US"));
        }
        if (profileRes.ok) {
          const d = await profileRes.json();
          const p = d.profile;
          if (p) {
            setAvatarUrl(p.avatarUrl || "");
            setFirstName(p.firstName || "");
            setLastName(p.lastName || "");
            setProfession(p.specialty || "General Practice");
            setSubspecialties(Array.isArray(p.subspecialties) ? p.subspecialties : []);
            setLicenseNumber(p.licenseNumber || "");
            setLicenseState(p.licenseState || "");
            setBio(p.bio || "");
            setClinicName(p.clinicName || "");
            setClinicAddress(p.clinicAddress || "");
            setClinicCity(p.clinicCity || "");
            setClinicState(p.clinicState || "");
            setClinicCountry(p.clinicCountry || "");
            setClinicZip(p.clinicZip || "");
          }
        }
        await refreshSectionStatus();
      } finally {
        setLoading(false);
        readyRef.current = true;
        setTimeout(() => { regionReadyRef.current = true; }, 100);
      }
    }
    load();
  }, [refreshSectionStatus]);

  const persistProfile = useCallback(async () => {
    if (!firstName || !lastName || !licenseNumber || !profession) return;
    setAutoSaving(true);
    setError("");
    try {
      const res = await fetch("/api/professional/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          avatarUrl,
          firstName,
          lastName,
          specialty: profession,
          subspecialties,
          licenseNumber,
          licenseState,
          bio,
          clinicName,
          clinicAddress,
          clinicCity,
          clinicState,
          clinicCountry,
          clinicZip,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || t("set.errGeneric"));
      }
      setAutoSaved(true);
      setTimeout(() => setAutoSaved(false), 3000);
      await refreshSectionStatus();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("set.errGeneric"));
    } finally {
      setAutoSaving(false);
    }
  }, [
    avatarUrl, firstName, lastName, profession, subspecialties,
    licenseNumber, licenseState, bio,
    clinicName, clinicAddress, clinicCity, clinicState, clinicCountry, clinicZip,
    t, refreshSectionStatus, router,
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
    avatarUrl, firstName, lastName, profession, subspecialties,
    licenseNumber, licenseState, bio,
    clinicName, clinicAddress, clinicCity, clinicState, clinicCountry, clinicZip,
    persistProfile,
  ]);

  async function saveAccountRegion() {
    try {
      const res = await fetch("/api/user/region", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ region: accountRegion }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("acct.regionErr"));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("acct.regionErr"));
    }
  }

  useEffect(() => {
    if (!regionReadyRef.current) return;
    const timer = setTimeout(() => {
      void saveAccountRegion();
    }, 1500);
    return () => clearTimeout(timer);
  }, [accountRegion]);

  function toggleSection(id: string) {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
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
        if (width > height && width > max) { height = (height * max) / width; width = max; }
        else if (height > max) { width = (width * max) / height; height = max; }
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

  function addSub() {
    const v = subInput.trim();
    if (v && !subspecialties.includes(v)) setSubspecialties([...subspecialties, v]);
    setSubInput("");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-brand-500" size={28} />
      </div>
    );
  }

  const showCvUpload = isPsychologistPortal || isPsychologistSpecialty(profession);
  const showDigitalSign = !isPsychologistPortal;
  const initials = (firstName[0] || "") + (lastName[0] || "");

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("set.title")}</h1>
        <p className="text-slate-500 mt-1">{t("set.subtitle")}</p>
        {(autoSaving || autoSaved) && (
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
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

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
          <p className="text-rose-700 text-sm">{error}</p>
        </div>
      )}

      <PublicProfileActivation onStatusChange={refreshSectionStatus} />

      {/* Identity */}
      <ProfileSettingsSection
        id="section-identity"
        title={t("set.photoIdentity")}
        description={t("set.sectionIdentityDesc")}
        icon={<User size={18} />}
        complete={sectionStatus.identity}
        open={openSections.identity}
        onToggle={() => toggleSection("identity")}
      >
        <div className="space-y-5">
          <div className="flex items-center gap-5">
            <div className="relative">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="w-24 h-24 rounded-2xl object-cover border border-slate-200" />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-brand-100 flex items-center justify-center text-brand-500 text-2xl font-bold">
                  {initials || <Camera size={28} />}
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
                className="bg-white border border-slate-200 hover:border-brand-200 text-slate-700 font-medium px-4 py-2 rounded-xl text-sm flex items-center gap-2"
              >
                <Camera size={15} /> {avatarUrl ? t("set.changePhoto") : t("set.uploadPhoto")}
              </button>
              <p className="text-xs text-slate-400 mt-2">{t("set.photoHint")}</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("set.firstName")}</label>
              <input className={inputClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("set.lastName")}</label>
              <input className={inputClass} value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("set.aboutMe")}</label>
            <textarea
              rows={4}
              className={inputClass + " resize-none"}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t("set.aboutMePlaceholder")}
            />
          </div>
        </div>
      </ProfileSettingsSection>

      {/* Credentials */}
      <ProfileSettingsSection
        id="section-credentials"
        title={t("set.profCreds")}
        description={t("set.sectionCredentialsDesc")}
        icon={<Award size={18} />}
        complete={sectionStatus.credentials}
        open={openSections.credentials}
        onToggle={() => toggleSection("credentials")}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("set.profSpecialty")}</label>
            <select
              className={inputClass + " bg-white"}
              value={profession}
              onChange={(e) => setProfession(e.target.value)}
            >
              {PROFESSION_GROUPS.map((g) => (
                <optgroup key={g.groupKey} label={t(g.groupKey)}>
                  {g.options.map((o) => (
                    <option key={o} value={o}>{getProfessionLabel(lang, o)}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("set.expertise")}</label>
            <div className="flex gap-2">
              <input
                className={inputClass}
                value={subInput}
                onChange={(e) => setSubInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSub(); } }}
                placeholder={t("set.expertisePlaceholder")}
              />
              <button type="button" onClick={addSub} className="bg-brand-500 text-white rounded-xl px-3 shrink-0">
                <Plus size={16} />
              </button>
            </div>
            {subspecialties.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {subspecialties.map((s) => (
                  <span key={s} className="bg-brand-50 text-brand-600 text-xs px-3 py-1.5 rounded-full flex items-center gap-1">
                    {s}
                    <button type="button" onClick={() => setSubspecialties(subspecialties.filter((x) => x !== s))}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">
                {t("set.regNumber")}{" "}
                <span className="text-slate-400 font-normal">{t("set.regNumberHint")}</span>
              </label>
              <input
                className={inputClass}
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder={t("set.regNumberPlaceholder")}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("set.stateRegion")}</label>
              <input
                className={inputClass}
                value={licenseState}
                onChange={(e) => setLicenseState(e.target.value)}
                placeholder={t("set.stateRegionPlaceholder")}
              />
            </div>
          </div>
          <LicenseDocumentsUpload />
          {showCvUpload && <CvUpload />}
        </div>
      </ProfileSettingsSection>

      {/* Consultation pricing */}
      <ProfileSettingsSection
        id="section-consultation"
        title={t("set.consultation")}
        description={t("it.settings.pricingDesc")}
        icon={<DollarSign size={18} />}
        complete={sectionStatus.consultation}
        open={openSections.consultation}
        onToggle={() => toggleSection("consultation")}
      >
        <ConsultPricingSettings embedded autoSave hideSaveButton onSaved={refreshSectionStatus} />
      </ProfileSettingsSection>

      {/* Availability */}
      <ProfileSettingsSection
        id="section-availability"
        title={t("avail.title")}
        description={t("avail.subtitle")}
        icon={<Calendar size={18} />}
        complete={sectionStatus.availability}
        open={openSections.availability}
        onToggle={() => toggleSection("availability")}
      >
        <AvailabilitySettings embedded autoSave hideSaveButton onSaved={refreshSectionStatus} />
      </ProfileSettingsSection>

      {/* Digital signature */}
      {showDigitalSign && (
        <ProfileSettingsSection
          id="section-digital-sign"
          title={t("digSign.title")}
          description={t("digSign.subtitle")}
          icon={<PenLine size={18} />}
          complete={sectionStatus.digitalSign}
          open={openSections.digitalSign}
          onToggle={() => toggleSection("digitalSign")}
          optional
        >
          <DigitalSignSettings embedded onConfiguredChange={() => refreshSectionStatus()} />
        </ProfileSettingsSection>
      )}

      {/* Doctor Connection */}
      <ProfileSettingsSection
        id="section-doctor-connection"
        title={t("proConn.account.title")}
        description={t("proConn.account.desc")}
        icon={<CreditCard size={18} />}
        complete={sectionStatus.doctorConnection}
        open={openSections.doctorConnection}
        onToggle={() => toggleSection("doctorConnection")}
        optional
      >
        <DoctorConnectionSettings
          embedded
          profileRegion={toBillingRegion(accountRegion)}
          onSubscribed={refreshSectionStatus}
        />
      </ProfileSettingsSection>

      {/* Clinic address */}
      <ProfileSettingsSection
        id="section-clinic"
        title={t("set.clinicAddress")}
        description={t("set.sectionClinicDesc")}
        icon={<MapPin size={18} />}
        complete={!!(clinicCity && clinicAddress)}
        open={openSections.clinic}
        onToggle={() => toggleSection("clinic")}
        optional
      >
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("set.clinicName")}</label>
              <input className={inputClass} value={clinicName} onChange={(e) => setClinicName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("set.address")}</label>
              <input className={inputClass} value={clinicAddress} onChange={(e) => setClinicAddress(e.target.value)} />
            </div>
          </div>
          <div className="grid sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("set.city")}</label>
              <input className={inputClass} value={clinicCity} onChange={(e) => setClinicCity(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("set.state")}</label>
              <input className={inputClass} value={clinicState} onChange={(e) => setClinicState(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("set.country")}</label>
              <input className={inputClass} value={clinicCountry} onChange={(e) => setClinicCountry(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("set.zip")}</label>
              <input className={inputClass} value={clinicZip} onChange={(e) => setClinicZip(e.target.value)} />
            </div>
          </div>
        </div>
      </ProfileSettingsSection>

      {/* Account region */}
      <ProfileSettingsSection
        id="section-region"
        title={t("set.sectionRegion")}
        description={t("set.sectionRegionDesc")}
        icon={<Globe size={18} />}
        complete
        open={openSections.region}
        onToggle={() => toggleSection("region")}
      >
        <div className="space-y-3">
          <RegistrationRegionSelect
            value={accountRegion}
            onChange={setAccountRegion}
            lang={lang}
            className={inputClass}
          />
          <p className="text-xs text-slate-400">{t("set.sectionRegionHint")}</p>
        </div>
      </ProfileSettingsSection>

      {/* Public profile details (analytics, embed, google) */}
      <ProfileSettingsSection
        id="section-public-details"
        title={t("pub.title")}
        description={t("pub.subtitle")}
        icon={<Globe size={18} />}
        open={openSections.publicDetails}
        onToggle={() => toggleSection("publicDetails")}
        optional
      >
        <PublicListingSettings apiPath="/api/professional/public-profile" hideToggle embedded />
      </ProfileSettingsSection>

      {/* Health plans */}
      <ProfileSettingsSection
        id="section-health-plans"
        title={t("healthPlanRules.title")}
        open={openSections.healthPlans}
        onToggle={() => toggleSection("healthPlans")}
        icon={<Building2 size={18} />}
        optional
      >
        <HealthPlansSettings apiPath="/api/professional/health-plans" />
      </ProfileSettingsSection>

      {/* Practice locations */}
      <ProfileSettingsSection
        id="section-practice"
        title={t("set.sectionPractice")}
        description={t("set.sectionPracticeDesc")}
        icon={<Building2 size={18} />}
        open={openSections.practice}
        onToggle={() => toggleSection("practice")}
        optional
      >
        <PracticeSettings apiPath="/api/professional/practice" />
      </ProfileSettingsSection>

      {/* Quick links */}
      <div className="grid sm:grid-cols-2 gap-3">
        <a
          href="/professional/settings/clinic"
          className="block bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:border-brand-200 transition group"
        >
          <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <Building2 size={16} className="text-brand-500" /> {t("clinic.settingsCardTitle")}
          </h3>
          <p className="text-xs text-slate-500 mt-1">{t("clinic.settingsCardDesc")}</p>
        </a>
        <a
          href="/professional/settings/templates"
          className="block bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:border-brand-200 transition group"
        >
          <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <LayoutTemplate size={16} className="text-brand-500" /> {t("tmpl.settingsCardTitle")}
          </h3>
          <p className="text-xs text-slate-500 mt-1">{t("tmpl.settingsCardDesc")}</p>
        </a>
      </div>
    </div>
  );
}
