"use client";

// src/app/(dashboard)/professional/prescriptions/page.tsx
// Professional creates and manages digital prescriptions

import { useState, useEffect } from "react";
import { Plus, Trash2, FileText, Download, Loader2, X, CheckCircle2, Search } from "lucide-react";

interface MedItem {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface Prescription {
  id: string;
  createdAt: string;
  validUntil?: string;
  document?: {
    patient?: { firstName: string; lastName: string };
  };
  medications: MedItem[];
}

const emptyMed = (): MedItem => ({
  name: "", dosage: "", frequency: "", duration: "", instructions: "",
});

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [instructions, setInstructions] = useState("");
  const [validDays, setValidDays] = useState(30);
  const [medications, setMedications] = useState<MedItem[]>([emptyMed()]);
  const [search, setSearch] = useState("");

  useEffect(() => { fetchPrescriptions(); }, []);

  async function fetchPrescriptions() {
    try {
      const res = await fetch("/api/professional/prescriptions");
      const d = await res.json();
      setPrescriptions(d.prescriptions || []);
    } finally { setLoading(false); }
  }

  function addMedication() {
    setMedications((prev) => [...prev, emptyMed()]);
  }

  function removeMedication(index: number) {
    setMedications((prev) => prev.filter((_, i) => i !== index));
  }

  function updateMedication(index: number, field: keyof MedItem, value: string) {
    setMedications((prev) => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!patientId || medications.some((m) => !m.name)) return;
    setSaving(true);
    try {
      const res = await fetch("/api/professional/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientUserId: patientId, medications, instructions, validDays }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => { setSaved(false); setShowForm(false); resetForm(); fetchPrescriptions(); }, 1500);
      }
    } finally { setSaving(false); }
  }

  function resetForm() {
    setPatientId(""); setInstructions(""); setValidDays(30);
    setMedications([emptyMed()]);
  }

  const filtered = prescriptions.filter((p) => {
    const name = p.document?.patient
      ? `${p.document.patient.firstName} ${p.document.patient.lastName}`.toLowerCase()
      : "";
    return name.includes(search.toLowerCase());
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Prescriptions</h1>
          <p className="text-slate-500 text-sm mt-1">Create and manage digital prescriptions for your patients</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition"
        >
          <Plus size={16} /> New prescription
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by patient name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-slate-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <FileText size={40} className="text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No prescriptions yet</p>
          <button onClick={() => setShowForm(true)} className="mt-4 text-emerald-600 text-sm font-semibold hover:underline">
            Create first prescription →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => {
            const meds = p.medications as MedItem[];
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-semibold text-slate-800">
                      {p.document?.patient
                        ? `${p.document.patient.firstName} ${p.document.patient.lastName}`
                        : "Patient"
                      }
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Issued: {new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      {p.validUntil && ` · Valid until: ${new Date(p.validUntil).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {meds.slice(0, 3).map((m, i) => (
                        <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                          {m.name} {m.dosage}
                        </span>
                      ))}
                      {meds.length > 3 && (
                        <span className="text-xs text-slate-400">+{meds.length - 3} more</span>
                      )}
                    </div>
                  </div>
                  <a
                    href={`/api/professional/prescriptions/${p.id}/pdf`}
                    target="_blank"
                    className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold transition shrink-0"
                  >
                    <Download size={14} /> Download PDF
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create prescription modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">

            <div className="sticky top-0 bg-white flex items-center justify-between p-5 border-b border-slate-200 z-10">
              <h2 className="font-bold text-slate-900 text-lg">New Prescription</h2>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-5">

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Patient User ID</label>
                <input
                  type="text"
                  required
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  placeholder="Patient's user ID"
                  className="inp"
                />
                <p className="text-xs text-slate-400 mt-1">You can find this in the patient's profile page</p>
              </div>

              {/* Medications */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-slate-700">Medications</label>
                  <button type="button" onClick={addMedication} className="text-xs text-emerald-600 font-semibold hover:text-emerald-700 flex items-center gap-1">
                    <Plus size={13} /> Add medication
                  </button>
                </div>
                <div className="space-y-4">
                  {medications.map((med, index) => (
                    <div key={index} className="bg-slate-50 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Medication {index + 1}</span>
                        {medications.length > 1 && (
                          <button type="button" onClick={() => removeMedication(index)} className="text-red-400 hover:text-red-600">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-slate-600 block mb-1">Name *</label>
                          <input required type="text" value={med.name} onChange={(e) => updateMedication(index, "name", e.target.value)} placeholder="e.g. Amoxicillin" className="inp-sm" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-600 block mb-1">Dosage *</label>
                          <input required type="text" value={med.dosage} onChange={(e) => updateMedication(index, "dosage", e.target.value)} placeholder="e.g. 500mg" className="inp-sm" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-600 block mb-1">Frequency *</label>
                          <select required value={med.frequency} onChange={(e) => updateMedication(index, "frequency", e.target.value)} className="inp-sm">
                            <option value="">Select...</option>
                            <option>Once daily</option>
                            <option>Twice daily</option>
                            <option>Three times daily</option>
                            <option>Every 8 hours</option>
                            <option>Every 12 hours</option>
                            <option>As needed</option>
                            <option>Weekly</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-600 block mb-1">Duration</label>
                          <input type="text" value={med.duration} onChange={(e) => updateMedication(index, "duration", e.target.value)} placeholder="e.g. 7 days" className="inp-sm" />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600 block mb-1">Special instructions</label>
                        <input type="text" value={med.instructions} onChange={(e) => updateMedication(index, "instructions", e.target.value)} placeholder="e.g. Take with food" className="inp-sm" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">General instructions</label>
                <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3} placeholder="Any additional instructions for the patient..." className="inp resize-none" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Valid for (days)</label>
                <select value={validDays} onChange={(e) => setValidDays(Number(e.target.value))} className="inp">
                  <option value={7}>7 days</option>
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                  <option value={90}>90 days</option>
                  <option value={180}>6 months</option>
                  <option value={365}>1 year</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <CheckCircle2 size={14} /> : null}
                  {saved ? "Saved!" : saving ? "Saving..." : "Create prescription"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .inp { width: 100%; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 10px 14px; font-size: 14px; color: #1e293b; outline: none; background: white; }
        .inp:focus { border-color: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,.1); }
        .inp-sm { width: 100%; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; font-size: 13px; color: #1e293b; outline: none; background: white; }
        .inp-sm:focus { border-color: #10b981; }
      `}</style>
    </div>
  );
}
