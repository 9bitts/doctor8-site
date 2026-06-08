"use client";

// src/app/(dashboard)/professional/settings/page.tsx
// Complete professional profile — for ALL health professions, not only doctors.
// Saving this makes the professional VERIFIED and visible in patient search.

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, CheckCircle2, Video, Building2,
  DollarSign, User, Award
} from "lucide-react";

// Health professions grouped by category.
// Medical specialties: the 55 officially recognized by CFM (Brazil),
// which also map closely to international specialties.
// Plus the other regulated health professions.
const PROFESSION_GROUPS: { group: string; options: string[] }[] = [
  {
    group: "Medical Specialties",
    options: [
      "Acupuncture",
      "Allergy and Immunology",
      "Anesthesiology",
      "Angiology",
      "Cardiology",
      "Cardiovascular Surgery",
      "Hand Surgery",
      "Head and Neck Surgery",
      "Digestive System Surgery",
      "General Surgery",
      "Pediatric Surgery",
      "Plastic Surgery",
      "Thoracic Surgery",
      "Vascular Surgery",
      "Internal Medicine",
      "Coloproctology",
      "Dermatology",
      "Endocrinology and Metabolism",
      "Endoscopy",
      "Gastroenterology",
      "Medical Genetics",
      "Geriatrics",
      "Gynecology and Obstetrics",
      "Hematology and Hemotherapy",
      "Homeopathy",
      "Infectious Diseases",
      "Mastology",
      "Family and Community Medicine",
      "Physical Medicine and Rehabilitation",
      "Occupational Medicine",
      "Sports Medicine",
      "Emergency Medicine",
      "Legal Medicine and Forensics",
      "Nuclear Medicine",
      "Intensive Care Medicine",
      "Preventive and Social Medicine",
      "Nephrology",
      "Neurosurgery",
      "Neurology",
      "Nutrology",
      "Ophthalmology",
      "Oncology",
      "Orthopedics and Traumatology",
      "Otorhinolaryngology (ENT)",
      "Pathology",
      "Clinical Pathology / Laboratory Medicine",
      "Pediatrics",
      "Pneumology",
      "Psychiatry",
      "Radiology and Diagnostic Imaging",
      "Radiotherapy",
      "Rheumatology",
      "Urology",
      "Cannabis Medicine",
      "General Practice",
    ],
  },
  {
    group: "Psychology & Mental Health",
    options: [
      "Psychologist",
      "Psychoanalyst",
      "Neuropsychologist",
      "Psychotherapist",
      "Behavioral Therapist",
    ],
  },
  {
    group: "Nutrition",
    options: ["Nutritionist", "Dietitian", "Sports Nutritionist"],
  },
  {
    group: "Rehabilitation & Therapy",
    options: [
      "Physiotherapist",
      "Occupational Therapist",
      "Speech Therapist (Speech-Language Pathologist)",
      "Osteopath",
      "Chiropractor",
    ],
  },
  {
    group: "Nursing",
    options: ["Nurse", "Nurse Practitioner", "Midwife", "Obstetric Nurse"],
  },
  {
    group: "Dentistry",
    options: [
      "Dentist (General)",
      "Orthodontist",
      "Endodontist",
      "Periodontist",
      "Oral and Maxillofacial Surgeon",
      "Pediatric Dentist",
    ],
  },
  {
    group: "Other Health Professions",
    options: [
      "Pharmacist",
      "Biomedical Scientist",
      "Physical Educator / Personal Trainer",
      "Social Worker (Health)",
      "Optometrist",
      "Podiatrist",
      "Acupuncturist (non-medical)",
      "Naturopath",
      "Veterinarian",
      "Other",
    ],
  },
];

const CURRENCIES = ["USD", "EUR", "GBP", "BRL"];

export default function ProfessionalSettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [profession, setProfession] = useState("General Practice");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseState, setLicenseState] = useState("");
  const [bio, setBio] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [acceptsTeleconsult, setAcceptsTeleconsult] = useState(true);
  const [acceptsInPerson, setAcceptsInPerson] = useState(false);
  const [clinicName, setClinicName] = useState("");
  const [clinicCity, setClinicCity] = useState("");
  const [clinicCountry, setClinicCountry] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/professional/profile");
        if (res.ok) {
          const d = await res.json();
          const p = d.profile;
          if (p) {
            setFirstName(p.firstName || "");
            setLastName(p.lastName || "");
            setProfession(p.specialty || "General Practice");
            setLicenseNumber(p.licenseNumber || "");
            setLicenseState(p.licenseState || "");
            setBio(p.bio || "");
            setPrice(p.consultPrice ? String(p.consultPrice / 100) : "");
            setCurrency(p.currency || "USD");
            setAcceptsTeleconsult(p.acceptsTeleconsult ?? true);
            setAcceptsInPerson(p.acceptsInPerson ?? false);
            setClinicName(p.clinicName || "");
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
    if (!firstName || !lastName || !licenseNumber || !price) {
      setError("Please fill in your name, professional registration number and consultation price.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/professional/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName, lastName, specialty: profession, licenseNumber, licenseState,
          bio, consultPrice: Math.round(Number(price) * 100), currency,
          acceptsTeleconsult, acceptsInPerson, clinicName, clinicCity, clinicCountry,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to save");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-emerald-500" size={28} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Professional Profile</h1>
        <p className="text-slate-500 mt-1">
          Complete your profile to appear in patient search and start receiving bookings.
        </p>
      </div>

      {saved && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <CheckCircle2 className="text-emerald-500" size={20} />
          <p className="text-emerald-700 text-sm font-medium">
            Profile saved! You are now visible to patients.
          </p>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
          <p className="text-rose-700 text-sm">{error}</p>
        </div>
      )}

      {/* Identity */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <User size={18} className="text-emerald-500" /> Identity
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">First name *</label>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Last name *</label>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
          </div>
        </div>
      </div>

      {/* Profession & credentials */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <Award size={18} className="text-emerald-500" /> Profession & Credentials
        </h2>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1.5">Profession / Specialty *</label>
          <select value={profession} onChange={(e) => setProfession(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 bg-white">
            {PROFESSION_GROUPS.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.options.map((o) => <option key={o} value={o}>{o}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">
              Registration number * <span className="text-slate-400 font-normal">(CRM, CRP, CRN, license...)</span>
            </label>
            <input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)}
              placeholder="e.g. CRM 123456"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">State / Region</label>
            <input value={licenseState} onChange={(e) => setLicenseState(e.target.value)}
              placeholder="e.g. SP, CA, London"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1.5">Bio / About you</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3}
            placeholder="Tell patients about your experience and approach..."
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none" />
        </div>
      </div>

      {/* Consultation */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <DollarSign size={18} className="text-emerald-500" /> Consultation
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Price per consultation *</label>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 80"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Currency</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 bg-white">
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-3 pt-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={acceptsTeleconsult} onChange={(e) => setAcceptsTeleconsult(e.target.checked)}
              className="w-4 h-4 accent-emerald-500" />
            <span className="text-sm text-slate-700 flex items-center gap-2"><Video size={15} /> Accept teleconsultations (online)</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={acceptsInPerson} onChange={(e) => setAcceptsInPerson(e.target.checked)}
              className="w-4 h-4 accent-emerald-500" />
            <span className="text-sm text-slate-700 flex items-center gap-2"><Building2 size={15} /> Accept in-person visits</span>
          </label>
        </div>
      </div>

      {/* Clinic (optional) */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <Building2 size={18} className="text-emerald-500" /> Clinic <span className="text-slate-400 text-sm font-normal">(optional)</span>
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Clinic name</label>
            <input value={clinicName} onChange={(e) => setClinicName(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">City</label>
            <input value={clinicCity} onChange={(e) => setClinicCity(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Country</label>
            <input value={clinicCountry} onChange={(e) => setClinicCountry(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center justify-between gap-4 pb-8">
        <p className="text-xs text-slate-400">
          Don&apos;t forget to set your weekly hours in <a href="/professional/settings/availability" className="text-emerald-600 underline">Availability</a>.
        </p>
        <button onClick={handleSave} disabled={saving}
          className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl transition flex items-center gap-2 shrink-0">
          {saving && <Loader2 className="animate-spin" size={16} />}
          {saving ? "Saving..." : "Save profile"}
        </button>
      </div>
    </div>
  );
}
