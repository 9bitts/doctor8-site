"use client";

// src/app/(dashboard)/patient/history/page.tsx
// Complete medical history (anamnesis) — structured questionnaire.
// Patients fill this before/at each consultation; it is saved to the record
// and can be shared with the doctor (PDF or secure link).

import { useState, useEffect } from "react";
import { Save, Share2, Download, Loader2, CheckCircle2, Copy } from "lucide-react";

// Multi-select chip group
function ChipGroup({
  label, options, selected, onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = selected.includes(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => onToggle(o)}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${
                active
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : "bg-white border-slate-200 text-slate-600 hover:border-emerald-300"
              }`}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"];
const SEX = ["Female", "Male", "Intersex", "Prefer not to say"];
const MARITAL = ["Single", "Married", "Stable union", "Divorced", "Widowed", "Other"];
const DISABILITIES = ["Physical", "Visual", "Hearing", "Intellectual", "None"];
const CHRONIC = ["Hypertension", "Diabetes", "Asthma", "Obesity", "Thyroid disease", "Chronic hepatitis", "Coronary disease", "Chronic kidney disease", "Cancer", "Immunodeficiency", "Other"];
const REVIEW_SYSTEMS: { group: string; items: string[] }[] = [
  { group: "Skin, hair & nails", items: ["Itching", "Skin spots", "Weak/spotted nails", "Hair loss"] },
  { group: "Digestive", items: ["Difficulty swallowing", "Heartburn", "Nausea", "Vomiting", "Excess gas", "Belching", "Constipation", "Diarrhea", "Blood in stool", "Abdominal pain", "Rectal bleeding"] },
  { group: "Hematology", items: ["Easy bruising/bleeding", "Anemia", "Low platelets", "Past transfusion", "Swollen lymph nodes", "Thrombosis history"] },
  { group: "Endocrine", items: ["Heat/cold intolerance", "Excessive thirst", "Excessive sweating", "Fatigue", "Weight loss without diet", "Loss of appetite", "Increased appetite", "Weight gain"] },
  { group: "Neurology", items: ["Headache", "Dizziness/vertigo", "Numbness/tingling", "Seizures", "Herniated disc"] },
  { group: "Eyes", items: ["Blurred vision", "Eye discharge", "Red/inflamed eyes", "Glaucoma", "Vision deficit", "Corrective lenses"] },
  { group: "ENT / Respiratory", items: ["Hearing loss", "Tinnitus", "Nosebleeds", "Sore throat", "Voice change", "Chronic cough", "Past pneumonia"] },
  { group: "Cardiology", items: ["Chest pain", "Palpitations", "Shortness of breath", "Heart murmur", "Ankle swelling"] },
  { group: "Musculoskeletal", items: ["Joint pain/swelling", "Joint stiffness", "Frequent cramps", "Bone fractures"] },
  { group: "Psychiatric", items: ["Depression", "Anxiety", "Memory loss", "Sleep disturbance", "Mood swings", "Irritability"] },
  { group: "Genitourinary", items: ["Difficulty urinating", "Painful urination", "Blood in urine", "Recurrent UTIs", "Kidney stones"] },
];
const VACCINES = ["Hepatitis B", "Measles", "Rubella", "Mumps", "MMR", "COVID-19", "Tetanus", "Diphtheria", "Yellow fever", "HPV", "Pneumonia", "Influenza", "Herpes Zoster"];
const SUBSTANCES = ["Tobacco", "Alcohol", "Marijuana", "Cocaine", "Crack", "Amphetamines", "Tattoos", "Chemical exposure", "Heavy metals", "Other"];
const INFECTIOUS = ["Tuberculosis", "HIV/AIDS", "Hepatitis", "Schistosomiasis", "COVID-19"];

interface HistoryData {
  // Identification
  isMinor: string; guardianName: string;
  patientName: string; motherName: string;
  sexAtBirth: string; profession: string; maritalStatus: string;
  healthInsurance: string; weight: string; height: string;
  // Vitals/condition
  bloodType: string;
  disabilities: string[];
  chronicConditions: string[];
  // Main complaint
  chiefComplaint: string; complaintDuration: string;
  painScale: string; betterFactors: string; worseFactors: string;
  // Antecedents
  pastSurgeries: string; currentMedications: string;
  familyHistory: string; allergies: string;
  recentTravel: string; ruralAreas: string;
  // Lifestyle
  smokingStatus: string; alcoholUse: string; exerciseFrequency: string; sleepQuality: string;
  // Review of systems
  reviewSystems: string[];
  // Gynecological
  menstrualDuration: string; menstrualCycle: string[];
  // Immunology
  immunology: string[]; vaccines: string[]; vaccineReactions: string;
  // Substances
  substances: string[];
  // Infectious
  infectious: string[]; otherInfectious: string;
  // Free
  notes: string;
}

const EMPTY: HistoryData = {
  isMinor: "", guardianName: "", patientName: "", motherName: "",
  sexAtBirth: "", profession: "", maritalStatus: "", healthInsurance: "",
  weight: "", height: "", bloodType: "", disabilities: [], chronicConditions: [],
  chiefComplaint: "", complaintDuration: "", painScale: "", betterFactors: "", worseFactors: "",
  pastSurgeries: "", currentMedications: "", familyHistory: "", allergies: "",
  recentTravel: "", ruralAreas: "", smokingStatus: "", alcoholUse: "",
  exerciseFrequency: "", sleepQuality: "", reviewSystems: [],
  menstrualDuration: "", menstrualCycle: [], immunology: [], vaccines: [],
  vaccineReactions: "", substances: [], infectious: [], otherInfectious: "", notes: "",
};

const inputClass = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40";
const textareaClass = inputClass + " resize-none";

export default function HistoryPage() {
  const [data, setData] = useState<HistoryData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [shareLoading, setShareLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => { fetchHistory(); }, []);

  async function fetchHistory() {
    try {
      const res = await fetch("/api/patient/history");
      if (res.ok) {
        const d = await res.json();
        if (d.history) setData({ ...EMPTY, ...d.history });
      }
    } finally { setLoading(false); }
  }

  function set<K extends keyof HistoryData>(key: K, value: HistoryData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function toggleArray(key: keyof HistoryData, value: string) {
    setData((prev) => {
      const arr = (prev[key] as string[]) || [];
      return { ...prev, [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] };
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!data.isMinor) {
      setError("Please answer the first question (is this form for a minor?).");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/patient/history", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Could not save. Please try again.");
    } finally { setSaving(false); }
  }

  async function handleShare() {
    setShareLoading(true);
    try {
      const res = await fetch("/api/patient/history/share", { method: "POST" });
      const d = await res.json();
      if (d.url) setShareUrl(d.url);
    } finally { setShareLoading(false); }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-emerald-500" size={28} /></div>;
  }

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
      <h2 className="font-semibold text-slate-800 text-base">{title}</h2>
      {children}
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Medical History</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Please fill in a new questionnaire before each consultation. It will be attached to your records
          and shared with your doctor. Leave blank if you don&apos;t know — only the first question is required.
        </p>
      </div>

      {saved && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <CheckCircle2 className="text-emerald-500" size={20} />
          <p className="text-emerald-700 text-sm font-medium">Medical history saved to your records.</p>
        </div>
      )}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4"><p className="text-rose-700 text-sm">{error}</p></div>
      )}

      <form onSubmit={handleSave} className="space-y-6">

        <Section title="Identification">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Is this form for a minor? *</label>
            <div className="flex gap-2">
              {["No", "Yes"].map((v) => (
                <button key={v} type="button" onClick={() => set("isMinor", v)}
                  className={`text-sm px-4 py-2 rounded-xl border transition ${data.isMinor === v ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-slate-200 text-slate-600"}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          {data.isMinor === "Yes" && (
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Name of the responsible guardian</label>
              <input className={inputClass} value={data.guardianName} onChange={(e) => set("guardianName", e.target.value)} />
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Patient name</label>
              <input className={inputClass} value={data.patientName} onChange={(e) => set("patientName", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Mother&apos;s name</label>
              <input className={inputClass} value={data.motherName} onChange={(e) => set("motherName", e.target.value)} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Sex at birth</label>
              <select className={inputClass + " bg-white"} value={data.sexAtBirth} onChange={(e) => set("sexAtBirth", e.target.value)}>
                <option value="">Select...</option>
                {SEX.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Marital status</label>
              <select className={inputClass + " bg-white"} value={data.maritalStatus} onChange={(e) => set("maritalStatus", e.target.value)}>
                <option value="">Select...</option>
                {MARITAL.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Profession</label>
              <input className={inputClass} value={data.profession} onChange={(e) => set("profession", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Health insurance (if any)</label>
              <input className={inputClass} value={data.healthInsurance} onChange={(e) => set("healthInsurance", e.target.value)} />
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Weight (kg)</label>
              <input type="number" className={inputClass} value={data.weight} onChange={(e) => set("weight", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Height (cm)</label>
              <input type="number" className={inputClass} value={data.height} onChange={(e) => set("height", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Blood type</label>
              <select className={inputClass + " bg-white"} value={data.bloodType} onChange={(e) => set("bloodType", e.target.value)}>
                <option value="">Select...</option>
                {BLOOD_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>
          <ChipGroup label="Do you have any disability?" options={DISABILITIES}
            selected={data.disabilities} onToggle={(v) => toggleArray("disabilities", v)} />
        </Section>

        <Section title="Reason for consultation">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Describe the reason for the consultation</label>
            <textarea rows={3} className={textareaClass} value={data.chiefComplaint} onChange={(e) => set("chiefComplaint", e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">How long ago did symptoms start?</label>
              <input className={inputClass} value={data.complaintDuration} onChange={(e) => set("complaintDuration", e.target.value)} placeholder="e.g. 2 weeks" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Pain intensity (0–10)</label>
              <input type="number" min="0" max="10" className={inputClass} value={data.painScale} onChange={(e) => set("painScale", e.target.value)} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">What makes it better?</label>
              <input className={inputClass} value={data.betterFactors} onChange={(e) => set("betterFactors", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">What makes it worse?</label>
              <input className={inputClass} value={data.worseFactors} onChange={(e) => set("worseFactors", e.target.value)} />
            </div>
          </div>
        </Section>

        <Section title="Medical background">
          <ChipGroup label="Do you have any chronic disease?" options={CHRONIC}
            selected={data.chronicConditions} onToggle={(v) => toggleArray("chronicConditions", v)} />
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Past surgeries or hospitalizations (reason)</label>
            <textarea rows={2} className={textareaClass} value={data.pastSurgeries} onChange={(e) => set("pastSurgeries", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">
              Current medications <span className="text-slate-400 font-normal">(name, dose, how many times per day)</span>
            </label>
            <textarea rows={3} className={textareaClass} value={data.currentMedications} onChange={(e) => set("currentMedications", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Most common diseases in your family</label>
            <textarea rows={2} className={textareaClass} value={data.familyHistory} onChange={(e) => set("familyHistory", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Allergies (specify)</label>
            <textarea rows={2} className={textareaClass} value={data.allergies} onChange={(e) => set("allergies", e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Recent travels (destinations)</label>
              <input className={inputClass} value={data.recentTravel} onChange={(e) => set("recentTravel", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Do you live in / visit rural areas?</label>
              <input className={inputClass} value={data.ruralAreas} onChange={(e) => set("ruralAreas", e.target.value)} />
            </div>
          </div>
        </Section>

        <Section title="Lifestyle & habits">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Smoking</label>
              <select className={inputClass + " bg-white"} value={data.smokingStatus} onChange={(e) => set("smokingStatus", e.target.value)}>
                <option value="">Select...</option>
                <option>Never</option><option>Former smoker</option><option>Current smoker</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Alcohol use</label>
              <select className={inputClass + " bg-white"} value={data.alcoholUse} onChange={(e) => set("alcoholUse", e.target.value)}>
                <option value="">Select...</option>
                <option>Never</option><option>Occasionally</option><option>Weekly</option><option>Daily</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Physical exercise</label>
              <select className={inputClass + " bg-white"} value={data.exerciseFrequency} onChange={(e) => set("exerciseFrequency", e.target.value)}>
                <option value="">Select...</option>
                <option>None</option><option>1–2x per week</option><option>3–4x per week</option><option>5+ per week</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Sleep quality</label>
              <select className={inputClass + " bg-white"} value={data.sleepQuality} onChange={(e) => set("sleepQuality", e.target.value)}>
                <option value="">Select...</option>
                <option>Good</option><option>Fair</option><option>Poor</option>
              </select>
            </div>
          </div>
        </Section>

        <Section title="Review of systems">
          <p className="text-xs text-slate-400 -mt-2">Select any symptoms you currently have or had recently.</p>
          {REVIEW_SYSTEMS.map((sys) => (
            <ChipGroup key={sys.group} label={sys.group} options={sys.items}
              selected={data.reviewSystems} onToggle={(v) => toggleArray("reviewSystems", v)} />
          ))}
        </Section>

        <Section title="Gynecological (if applicable)">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Menstrual flow duration (days)</label>
            <input type="number" className={inputClass} value={data.menstrualDuration} onChange={(e) => set("menstrualDuration", e.target.value)} />
          </div>
          <ChipGroup label="Menstrual cycle" options={["Altered flow", "Vaginal discharge", "Hot flashes", "Absence of flow", "Menopause", "Contraceptive use", "IUD use", "Pregnancies", "Abortions"]}
            selected={data.menstrualCycle} onToggle={(v) => toggleArray("menstrualCycle", v)} />
        </Section>

        <Section title="Immunology & vaccines">
          <ChipGroup label="Immune system" options={["Recurrent infections", "Frequent antibiotic use", "Immunodeficiency"]}
            selected={data.immunology} onToggle={(v) => toggleArray("immunology", v)} />
          <ChipGroup label="Which vaccines have you received?" options={VACCINES}
            selected={data.vaccines} onToggle={(v) => toggleArray("vaccines", v)} />
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Any adverse reaction to a vaccine?</label>
            <input className={inputClass} value={data.vaccineReactions} onChange={(e) => set("vaccineReactions", e.target.value)} />
          </div>
        </Section>

        <Section title="Substances & exposures">
          <ChipGroup label="Do you use any of these?" options={SUBSTANCES}
            selected={data.substances} onToggle={(v) => toggleArray("substances", v)} />
        </Section>

        <Section title="Infectious diseases">
          <ChipGroup label="Do you have any of these?" options={INFECTIOUS}
            selected={data.infectious} onToggle={(v) => toggleArray("infectious", v)} />
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Any infectious disease not listed above? Specify.</label>
            <input className={inputClass} value={data.otherInfectious} onChange={(e) => set("otherInfectious", e.target.value)} />
          </div>
        </Section>

        <Section title="Additional notes">
          <textarea rows={3} className={textareaClass} value={data.notes} onChange={(e) => set("notes", e.target.value)}
            placeholder="Anything else you'd like your doctor to know..." />
        </Section>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3 sticky bottom-4 bg-white/80 backdrop-blur rounded-2xl border border-slate-100 shadow-lg p-3">
          <button type="submit" disabled={saving}
            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl transition flex items-center gap-2">
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            {saving ? "Saving..." : "Save history"}
          </button>
          <button type="button" onClick={handleShare} disabled={shareLoading}
            className="bg-white border border-slate-200 hover:border-emerald-300 text-slate-700 font-semibold px-5 py-3 rounded-xl transition flex items-center gap-2">
            {shareLoading ? <Loader2 className="animate-spin" size={16} /> : <Share2 size={16} />}
            Share with doctor
          </button>
          <a href="/api/patient/history/pdf" target="_blank" rel="noopener noreferrer"
            className="bg-white border border-slate-200 hover:border-emerald-300 text-slate-700 font-semibold px-5 py-3 rounded-xl transition flex items-center gap-2">
            <Download size={16} /> Export PDF
          </a>
        </div>

        {shareUrl && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800 font-medium mb-2">Secure link (valid for 7 days):</p>
            <div className="flex items-center gap-2">
              <input readOnly value={shareUrl} className="flex-1 bg-white border border-blue-200 rounded-lg px-3 py-2 text-xs text-slate-600" />
              <button type="button" onClick={() => navigator.clipboard.writeText(shareUrl)}
                className="bg-blue-500 text-white rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-1">
                <Copy size={13} /> Copy
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
