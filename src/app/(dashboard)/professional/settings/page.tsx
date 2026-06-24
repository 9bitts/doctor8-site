"use client";

// src/app/(dashboard)/professional/settings/page.tsx
// Complete, editable professional profile. i18n via useT().

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { PROFESSION_GROUPS, getProfessionLabel } from "@/lib/professions";
import PublicListingSettings from "@/components/PublicListingSettings";
import HealthPlansSettings from "@/components/HealthPlansSettings";
import {
  Loader2, CheckCircle2, Video, Building2, DollarSign, User, Award, Camera, X, Plus,
} from "lucide-react";

const CURRENCIES = ["USD", "EUR", "GBP", "BRL"];
const inputClass = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40";

export default function ProfessionalSettings() {
  const { lang, t } = useI18n();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [avatarUrl, setAvatarUrl] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [profession, setProfession] = useState("General Practice");
  const [subInput, setSubInput] = useState("");
  const [subspecialties, setSubspecialties] = useState<string[]>([]);
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseState, setLicenseState] = useState("");
  const [bio, setBio] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [acceptsTeleconsult, setAcceptsTeleconsult] = useState(true);
  const [acceptsInPerson, setAcceptsInPerson] = useState(false);
  const [clinicName, setClinicName] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");
  const [clinicCity, setClinicCity] = useState("");
  const [clinicState, setClinicState] = useState("");
  const [clinicCountry, setClinicCountry] = useState("");
  const [clinicZip, setClinicZip] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/professional/profile");
        if (res.ok) {
          const d = await res.json();
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
            setPrice(p.consultPrice ? String(p.consultPrice / 100) : "");
            setCurrency(p.currency || "USD");
            setAcceptsTeleconsult(p.acceptsTeleconsult ?? true);
            setAcceptsInPerson(p.acceptsInPerson ?? false);
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
        canvas.width = width; canvas.height = height;
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

  async function handleSave() {
    setError("");
    if (!firstName || !lastName || !licenseNumber || !price) {
      setError(t("set.errRequired"));
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/professional/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          avatarUrl, firstName, lastName, specialty: profession, subspecialties,
          licenseNumber, licenseState, bio, consultPrice: Math.round(Number(price) * 100), currency,
          acceptsTeleconsult, acceptsInPerson,
          clinicName, clinicAddress, clinicCity, clinicState, clinicCountry, clinicZip,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || t("set.errGeneric")); }
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
      window.scrollTo({ top: 0, behavior: "smooth" });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("set.errGeneric"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-brand-500" size={28} /></div>;
  }

  const initials = (firstName[0] || "") + (lastName[0] || "");

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("set.title")}</h1>
        <p className="text-slate-500 mt-1">{t("set.subtitle")}</p>
      </div>

      {saved && (
        <div className="flex items-center gap-3 bg-brand-50 border border-brand-200 rounded-xl p-4">
          <CheckCircle2 className="text-brand-500" size={20} />
          <p className="text-brand-600 text-sm font-medium">{t("set.savedMsg")}</p>
        </div>
      )}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4"><p className="text-rose-700 text-sm">{error}</p></div>
      )}

      <PublicListingSettings apiPath="/api/professional/public-profile" />
      <HealthPlansSettings apiPath="/api/professional/health-plans" />

      {/* Photo + Identity */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2"><User size={18} className="text-brand-500" /> {t("set.photoIdentity")}</h2>
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
              <button type="button" onClick={() => setAvatarUrl("")}
                className="absolute -top-2 -right-2 bg-white border border-slate-200 rounded-full p-1 shadow hover:bg-rose-50">
                <X size={14} className="text-rose-500" />
              </button>
            )}
          </div>
          <div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
            <button type="button" onClick={() => fileRef.current?.click()}
              className="bg-white border border-slate-200 hover:border-brand-200 text-slate-700 font-medium px-4 py-2 rounded-xl text-sm flex items-center gap-2">
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
      </div>

      {/* Profession & credentials */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2"><Award size={18} className="text-brand-500" /> {t("set.profCreds")}</h2>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("set.profSpecialty")}</label>
          <select className={inputClass + " bg-white"} value={profession} onChange={(e) => setProfession(e.target.value)}>
            {PROFESSION_GROUPS.map((g) => (
              <optgroup key={g.groupKey} label={t(g.groupKey)}>
                {g.options.map((o) => <option key={o} value={o}>{getProfessionLabel(lang, o)}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("set.expertise")}</label>
          <div className="flex gap-2">
            <input className={inputClass} value={subInput} onChange={(e) => setSubInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSub(); } }}
              placeholder={t("set.expertisePlaceholder")} />
            <button type="button" onClick={addSub} className="bg-brand-500 text-white rounded-xl px-3 shrink-0"><Plus size={16} /></button>
          </div>
          {subspecialties.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {subspecialties.map((s) => (
                <span key={s} className="bg-brand-50 text-brand-600 text-xs px-3 py-1.5 rounded-full flex items-center gap-1">
                  {s}
                  <button type="button" onClick={() => setSubspecialties(subspecialties.filter((x) => x !== s))}><X size={12} /></button>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("set.regNumber")} <span className="text-slate-400 font-normal">{t("set.regNumberHint")}</span></label>
            <input className={inputClass} value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder={t("set.regNumberPlaceholder")} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("set.stateRegion")}</label>
            <input className={inputClass} value={licenseState} onChange={(e) => setLicenseState(e.target.value)} placeholder={t("set.stateRegionPlaceholder")} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("set.aboutMe")}</label>
          <textarea rows={4} className={inputClass + " resize-none"} value={bio} onChange={(e) => setBio(e.target.value)}
            placeholder={t("set.aboutMePlaceholder")} />
        </div>
      </div>

      {/* Consultation */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2"><DollarSign size={18} className="text-brand-500" /> {t("set.consultation")}</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("set.pricePerConsult")}</label>
            <input type="number" className={inputClass} value={price} onChange={(e) => setPrice(e.target.value)} placeholder={t("set.pricePlaceholder")} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("set.currency")}</label>
            <select className={inputClass + " bg-white"} value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-3 pt-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={acceptsTeleconsult} onChange={(e) => setAcceptsTeleconsult(e.target.checked)} className="w-4 h-4 accent-brand-500" />
            <span className="text-sm text-slate-700 flex items-center gap-2"><Video size={15} /> {t("set.acceptTele")}</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={acceptsInPerson} onChange={(e) => setAcceptsInPerson(e.target.checked)} className="w-4 h-4 accent-brand-500" />
            <span className="text-sm text-slate-700 flex items-center gap-2"><Building2 size={15} /> {t("set.acceptInPerson")}</span>
          </label>
        </div>
      </div>

      {/* Clinic / Address */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2"><Building2 size={18} className="text-brand-500" /> {t("set.clinicAddress")} <span className="text-slate-400 text-sm font-normal">{t("set.optional")}</span></h2>
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

      {/* Save bar */}
      <div className="flex items-center justify-between gap-4 sticky bottom-4 bg-white/80 backdrop-blur rounded-2xl border border-slate-100 shadow-lg p-3">
        <p className="text-xs text-slate-400 pl-2">
          {t("set.availabilityNote")} <a href="/professional/settings/availability" className="text-brand-500 underline">{t("set.availabilityLink")}</a>.
        </p>
        <button onClick={handleSave} disabled={saving}
          className="bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl transition flex items-center gap-2 shrink-0">
          {saving && <Loader2 className="animate-spin" size={16} />}
          {saving ? t("set.saving") : t("set.saveProfile")}
        </button>
      </div>
    </div>
  );
}
