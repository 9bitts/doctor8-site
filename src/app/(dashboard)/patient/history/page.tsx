"use client";

// src/app/(dashboard)/patient/history/page.tsx
// Complete medical history (anamnesis). i18n via useT() for the UI.
// NOTE: long clinical option lists (symptoms, vaccines, substances) are kept in
// English for now — they can be translated in a dedicated pass later.

import { useState, useEffect } from "react";
import { useT } from "@/lib/i18n/I18nProvider";
import { Save, Share2, Download, Loader2, CheckCircle2, Copy } from "lucide-react";
import ShareModal from "@/components/ShareModal";

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

// Defined OUTSIDE the page component so inputs keep focus while typing.
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
      <h2 className="font-semibold text-slate-800 text-base">{title}</h2>
      {children}
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
  isMinor: string; guardianName: string;
  patientName: string; motherName: string;
  sexAtBirth: string; profession: string; maritalStatus: string;
  healthInsurance: string; weight: string; height: string;
  bloodType: string;
  disabilities: string[];
  chronicConditions: string[];
  chiefComplaint: string; complaintDuration: string;
  painScale: string; betterFactors: string; worseFactors: string;
  pastSurgeries: string; currentMedications: string;
  familyHistory: string; allergies: string;
  recentTravel: string; ruralAreas: string;
  smokingStatus: string; alcoholUse: string; exerciseFrequency: string; sleepQuality: string;
  reviewSystems: string[];
  menstrualDuration: string; menstrualCycle: string[];
  immunology: string[]; vaccines: string[]; vaccineReactions: string;
  substances: string[];
  infectious: string[]; otherInfectious: string;
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
  const t = useT();
  const [data, setData] = useState<HistoryData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [shareLoading, setShareLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);

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
      setError(t("hist.errFirst"));
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
      setError(t("hist.errSave"));
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

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("hist.title")}</h1>
        <p className="text-slate-500 mt-1 text-sm">{t("hist.subtitle")}</p>
      </div>

      {saved && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <CheckCircle2 className="text-emerald-500" size={20} />
          <p className="text-emerald-700 text-sm font-medium">{t("hist.saved")}</p>
        </div>
      )}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4"><p className="text-rose-700 text-sm">{error}</p></div>
      )}

      <form onSubmit={handleSave} className="space-y-6">

        <Section title={t("hist.sec.identification")}>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.isMinor")}</label>
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
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.guardianName")}</label>
              <input className={inputClass} value={data.guardianName} onChange={(e) => set("guardianName", e.target.value)} />
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.patientName")}</label>
              <input className={inputClass} value={data.patientName} onChange={(e) => set("patientName", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.motherName")}</label>
              <input className={inputClass} value={data.motherName} onChange={(e) => set("motherName", e.target.value)} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.sexAtBirth")}</label>
              <select className={inputClass + " bg-white"} value={data.sexAtBirth} onChange={(e) => set("sexAtBirth", e.target.value)}>
                <option value="">{t("hist.select")}</option>
                {SEX.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.maritalStatus")}</label>
              <select className={inputClass + " bg-white"} value={data.maritalStatus} onChange={(e) => set("maritalStatus", e.target.value)}>
                <option value="">{t("hist.select")}</option>
                {MARITAL.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.profession")}</label>
              <input className={inputClass} value={data.profession} onChange={(e) => set("profession", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.healthInsurance")}</label>
              <input className={inputClass} value={data.healthInsurance} onChange={(e) => set("healthInsurance", e.target.value)} />
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.weight")}</label>
              <input type="number" className={inputClass} value={data.weight} onChange={(e) => set("weight", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.height")}</label>
              <input type="number" className={inputClass} value={data.height} onChange={(e) => set("height", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.bloodType")}</label>
              <select className={inputClass + " bg-white"} value={data.bloodType} onChange={(e) => set("bloodType", e.target.value)}>
                <option value="">{t("hist.select")}</option>
                {BLOOD_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>
          <ChipGroup label={t("hist.disabilities")} options={DISABILITIES}
            selected={data.disabilities} onToggle={(v) => toggleArray("disabilities", v)} />
        </Section>

        <Section title={t("hist.sec.reason")}>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.chiefComplaint")}</label>
            <textarea rows={3} className={textareaClass} value={data.chiefComplaint} onChange={(e) => set("chiefComplaint", e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.complaintDuration")}</label>
              <input className={inputClass} value={data.complaintDuration} onChange={(e) => set("complaintDuration", e.target.value)} placeholder={t("hist.durationPlaceholder")} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.painScale")}</label>
              <input type="number" min="0" max="10" className={inputClass} value={data.painScale} onChange={(e) => set("painScale", e.target.value)} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.betterFactors")}</label>
              <input className={inputClass} value={data.betterFactors} onChange={(e) => set("betterFactors", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.worseFactors")}</label>
              <input className={inputClass} value={data.worseFactors} onChange={(e) => set("worseFactors", e.target.value)} />
            </div>
          </div>
        </Section>

        <Section title={t("hist.sec.background")}>
          <ChipGroup label={t("hist.chronic")} options={CHRONIC}
            selected={data.chronicConditions} onToggle={(v) => toggleArray("chronicConditions", v)} />
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.pastSurgeries")}</label>
            <textarea rows={2} className={textareaClass} value={data.pastSurgeries} onChange={(e) => set("pastSurgeries", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">
              {t("hist.currentMeds")} <span className="text-slate-400 font-normal">{t("hist.currentMedsHint")}</span>
            </label>
            <textarea rows={3} className={textareaClass} value={data.currentMedications} onChange={(e) => set("currentMedications", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.familyHistory")}</label>
            <textarea rows={2} className={textareaClass} value={data.familyHistory} onChange={(e) => set("familyHistory", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.allergies")}</label>
            <textarea rows={2} className={textareaClass} value={data.allergies} onChange={(e) => set("allergies", e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.recentTravel")}</label>
              <input className={inputClass} value={data.recentTravel} onChange={(e) => set("recentTravel", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.ruralAreas")}</label>
              <input className={inputClass} value={data.ruralAreas} onChange={(e) => set("ruralAreas", e.target.value)} />
            </div>
          </div>
        </Section>

        <Section title={t("hist.sec.lifestyle")}>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.smoking")}</label>
              <select className={inputClass + " bg-white"} value={data.smokingStatus} onChange={(e) => set("smokingStatus", e.target.value)}>
                <option value="">{t("hist.select")}</option>
                <option>Never</option><option>Former smoker</option><option>Current smoker</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.alcohol")}</label>
              <select className={inputClass + " bg-white"} value={data.alcoholUse} onChange={(e) => set("alcoholUse", e.target.value)}>
                <option value="">{t("hist.select")}</option>
                <option>Never</option><option>Occasionally</option><option>Weekly</option><option>Daily</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.exercise")}</label>
              <select className={inputClass + " bg-white"} value={data.exerciseFrequency} onChange={(e) => set("exerciseFrequency", e.target.value)}>
                <option value="">{t("hist.select")}</option>
                <option>None</option><option>1–2x per week</option><option>3–4x per week</option><option>5+ per week</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.sleep")}</label>
              <select className={inputClass + " bg-white"} value={data.sleepQuality} onChange={(e) => set("sleepQuality", e.target.value)}>
                <option value="">{t("hist.select")}</option>
                <option>Good</option><option>Fair</option><option>Poor</option>
              </select>
            </div>
          </div>
        </Section>

        <Section title={t("hist.sec.review")}>
          <p className="text-xs text-slate-400 -mt-2">{t("hist.reviewHint")}</p>
          {REVIEW_SYSTEMS.map((sys) => (
            <ChipGroup key={sys.group} label={sys.group} options={sys.items}
              selected={data.reviewSystems} onToggle={(v) => toggleArray("reviewSystems", v)} />
          ))}
        </Section>

        <Section title={t("hist.sec.gyneco")}>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.menstrualDuration")}</label>
            <input type="number" className={inputClass} value={data.menstrualDuration} onChange={(e) => set("menstrualDuration", e.target.value)} />
          </div>
          <ChipGroup label={t("hist.menstrualCycle")} options={["Altered flow", "Vaginal discharge", "Hot flashes", "Absence of flow", "Menopause", "Contraceptive use", "IUD use", "Pregnancies", "Abortions"]}
            selected={data.menstrualCycle} onToggle={(v) => toggleArray("menstrualCycle", v)} />
        </Section>

        <Section title={t("hist.sec.immuno")}>
          <ChipGroup label={t("hist.immuneSystem")} options={["Recurrent infections", "Frequent antibiotic use", "Immunodeficiency"]}
            selected={data.immunology} onToggle={(v) => toggleArray("immunology", v)} />
          <ChipGroup label={t("hist.whichVaccines")} options={VACCINES}
            selected={data.vaccines} onToggle={(v) => toggleArray("vaccines", v)} />
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.vaccineReactions")}</label>
            <input className={inputClass} value={data.vaccineReactions} onChange={(e) => set("vaccineReactions", e.target.value)} />
          </div>
        </Section>

        <Section title={t("hist.sec.substances")}>
          <ChipGroup label={t("hist.substancesQ")} options={SUBSTANCES}
            selected={data.substances} onToggle={(v) => toggleArray("substances", v)} />
        </Section>

        <Section title={t("hist.sec.infectious")}>
          <ChipGroup label={t("hist.infectiousQ")} options={INFECTIOUS}
            selected={data.infectious} onToggle={(v) => toggleArray("infectious", v)} />
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.otherInfectious")}</label>
            <input className={inputClass} value={data.otherInfectious} onChange={(e) => set("otherInfectious", e.target.value)} />
          </div>
        </Section>

        <Section title={t("hist.sec.notes")}>
          <textarea rows={3} className={textareaClass} value={data.notes} onChange={(e) => set("notes", e.target.value)}
            placeholder={t("hist.notesPlaceholder")} />
        </Section>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3 sticky bottom-4 bg-white/80 backdrop-blur rounded-2xl border border-slate-100 shadow-lg p-3">
          <button type="submit" disabled={saving}
            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl transition flex items-center gap-2">
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            {saving ? t("acct.saving") : t("hist.saveHistory")}
          </button>
          <button type="button" onClick={() => setShowShareModal(true)}
            className="bg-white border border-slate-200 hover:border-emerald-300 text-slate-700 font-semibold px-5 py-3 rounded-xl transition flex items-center gap-2">
            {shareLoading ? <Loader2 className="animate-spin" size={16} /> : <Share2 size={16} />}
            {t("hist.shareWithDoctor")}
          </button>
          <a href="/api/patient/history/pdf" target="_blank" rel="noopener noreferrer"
            className="bg-white border border-slate-200 hover:border-emerald-300 text-slate-700 font-semibold px-5 py-3 rounded-xl transition flex items-center gap-2">
            <Download size={16} /> {t("hist.exportPDF")}
          </a>
        </div>

      </form>

      {showShareModal && (
        <ShareModal type="history" onClose={() => setShowShareModal(false)} />
      )}
    </div>
  );
}
