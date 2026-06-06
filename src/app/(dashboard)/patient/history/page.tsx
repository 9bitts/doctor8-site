"use client";

// src/app/(dashboard)/patient/history/page.tsx
// Medical history — fillable form with share and PDF export

import { useState, useEffect } from "react";
import { Save, Share2, Download, Loader2, CheckCircle2 } from "lucide-react";

interface HistoryData {
  bloodType: string;
  allergies: string;
  chronicConditions: string;
  pastSurgeries: string;
  familyHistory: string;
  currentSymptoms: string;
  smokingStatus: string;
  alcoholUse: string;
  exerciseFrequency: string;
  notes: string;
}

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"];

export default function HistoryPage() {
  const [data, setData] = useState<HistoryData>({
    bloodType: "", allergies: "", chronicConditions: "", pastSurgeries: "",
    familyHistory: "", currentSymptoms: "", smokingStatus: "", alcoholUse: "",
    exerciseFrequency: "", notes: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => { fetchHistory(); }, []);

  async function fetchHistory() {
    try {
      const res = await fetch("/api/patient/history");
      if (res.ok) {
        const d = await res.json();
        if (d.history) setData(d.history);
      }
    } finally { setLoading(false); }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/patient/history", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  }

  async function handleShare() {
    setShareLoading(true);
    try {
      const res = await fetch("/api/patient/history/share", { method: "POST" });
      const d = await res.json();
      if (d.url) {
        setShareUrl(d.url);
        await navigator.clipboard.writeText(d.url);
      }
    } finally { setShareLoading(false); }
  }

  const set = (field: keyof HistoryData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setData({ ...data, [field]: e.target.value });

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 size={28} className="animate-spin text-slate-400" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Medical History</h1>
          <p className="text-slate-500 text-sm mt-1">Keep your health information up to date. Doctors can see this during consultations.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleShare}
            disabled={shareLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition"
          >
            {shareLoading ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
            Share
          </button>
          <a
            href="/api/patient/history/pdf"
            target="_blank"
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition"
          >
            <Download size={14} />
            Export PDF
          </a>
        </div>
      </div>

      {/* Share URL banner */}
      {shareUrl && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-800">Link copied to clipboard!</p>
            <p className="text-xs text-emerald-700 truncate mt-0.5">{shareUrl}</p>
            <p className="text-xs text-emerald-600 mt-1">This link expires in 7 days.</p>
          </div>
          <button onClick={() => setShareUrl("")} className="text-emerald-600 text-xs shrink-0">Dismiss</button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">

        {/* Basic info */}
        <Card title="Basic Information">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Blood type">
              <select value={data.bloodType} onChange={set("bloodType")} className="inp">
                <option value="">Unknown</option>
                {BLOOD_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Smoking status">
              <select value={data.smokingStatus} onChange={set("smokingStatus")} className="inp">
                <option value="">Select...</option>
                <option>Never smoked</option>
                <option>Former smoker</option>
                <option>Current smoker</option>
              </select>
            </Field>
            <Field label="Alcohol use">
              <select value={data.alcoholUse} onChange={set("alcoholUse")} className="inp">
                <option value="">Select...</option>
                <option>None</option>
                <option>Occasional</option>
                <option>Moderate</option>
                <option>Heavy</option>
              </select>
            </Field>
            <Field label="Exercise frequency">
              <select value={data.exerciseFrequency} onChange={set("exerciseFrequency")} className="inp">
                <option value="">Select...</option>
                <option>Sedentary</option>
                <option>1-2x per week</option>
                <option>3-4x per week</option>
                <option>5+ times per week</option>
              </select>
            </Field>
          </div>
        </Card>

        {/* Medical conditions */}
        <Card title="Medical Conditions">
          <div className="space-y-4">
            <Field label="Allergies (medications, food, environmental)">
              <textarea
                value={data.allergies}
                onChange={set("allergies")}
                rows={3}
                placeholder="e.g. Penicillin — severe reaction, Peanuts — anaphylaxis"
                className="inp resize-none"
              />
            </Field>
            <Field label="Chronic conditions">
              <textarea
                value={data.chronicConditions}
                onChange={set("chronicConditions")}
                rows={3}
                placeholder="e.g. Type 2 Diabetes, Hypertension, Asthma..."
                className="inp resize-none"
              />
            </Field>
            <Field label="Past surgeries and hospitalizations">
              <textarea
                value={data.pastSurgeries}
                onChange={set("pastSurgeries")}
                rows={3}
                placeholder="e.g. Appendectomy (2018), Knee surgery (2021)..."
                className="inp resize-none"
              />
            </Field>
          </div>
        </Card>

        {/* Family history */}
        <Card title="Family History">
          <Field label="Known hereditary conditions in your family">
            <textarea
              value={data.familyHistory}
              onChange={set("familyHistory")}
              rows={3}
              placeholder="e.g. Father — Heart disease, Mother — Breast cancer, Diabetes on both sides..."
              className="inp resize-none"
            />
          </Field>
        </Card>

        {/* Current symptoms */}
        <Card title="Current Symptoms">
          <Field label="Any symptoms you are currently experiencing">
            <textarea
              value={data.currentSymptoms}
              onChange={set("currentSymptoms")}
              rows={3}
              placeholder="Describe any symptoms you have right now..."
              className="inp resize-none"
            />
          </Field>
        </Card>

        {/* Notes */}
        <Card title="Additional Notes">
          <Field label="Anything else your doctor should know">
            <textarea
              value={data.notes}
              onChange={set("notes")}
              rows={3}
              placeholder="Any other relevant health information..."
              className="inp resize-none"
            />
          </Field>
        </Card>

        {/* Save button */}
        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3.5 rounded-xl transition disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
          {saving ? "Saving..." : saved ? "Saved!" : "Save medical history"}
        </button>
      </form>

      <style>{`.inp { width: 100%; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 10px 14px; font-size: 14px; color: #1e293b; outline: none; transition: border-color .15s; background: white; } .inp:focus { border-color: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,.1); }`}</style>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
        <h2 className="font-semibold text-slate-800 text-sm">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
