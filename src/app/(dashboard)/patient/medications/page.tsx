"use client";

// src/app/(dashboard)/patient/medications/page.tsx
// THE FIX: medications are now clearly separated into two flows:
// CLINICAL → goes to medical history, shared with doctors
// PURCHASE → goes to collective purchase list, NOT shared

import { useState, useEffect } from "react";
import { Pill, Plus, Eye, EyeOff, Trash2, ShoppingCart, Stethoscope, X, Loader2, Share2, Download } from "lucide-react";
import ShareModal from "@/components/ShareModal";

type Flow = "CLINICAL" | "PURCHASE";

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  prescribedBy?: string;
  notes?: string;
  flow: Flow;
  active: boolean;
  startDate?: string;
}

export default function MedicationsPage() {
  const [activeTab, setActiveTab] = useState<Flow>("CLINICAL");
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    dosage: "",
    frequency: "",
    prescribedBy: "",
    notes: "",
    flow: "CLINICAL" as Flow,
  });

  useEffect(() => { fetchMedications(); }, []);

  async function fetchMedications() {
    setLoading(true);
    try {
      const res = await fetch("/api/patient/medications");
      const data = await res.json();
      setMedications(data.medications || []);
    } catch { /* handle error */ }
    finally { setLoading(false); }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/patient/medications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, flow: activeTab }),
      });
      if (res.ok) {
        setShowForm(false);
        setForm({ name: "", dosage: "", frequency: "", prescribedBy: "", notes: "", flow: "CLINICAL" });
        fetchMedications();
      }
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this medication?")) return;
    await fetch(`/api/patient/medications/${id}`, { method: "DELETE" });
    fetchMedications();
  }

  async function handleShare() {
    setShareLoading(true);
    try {
      const res = await fetch("/api/patient/medications/share", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        await navigator.clipboard.writeText(data.url);
        alert("Share link copied to clipboard! Link expires in 7 days.");
      }
    } finally { setShareLoading(false); }
  }

  async function handleExportPDF() {
    window.open("/api/patient/medications/pdf", "_blank");
  }

  const clinicalMeds = medications.filter((m) => m.flow === "CLINICAL");
  const purchaseMeds = medications.filter((m) => m.flow === "PURCHASE");
  const displayed = activeTab === "CLINICAL" ? clinicalMeds : purchaseMeds;

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Medications</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your medications and purchase list</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition"
        >
          <Plus size={16} /> Add
        </button>
      </div>

      {/* THE FIX EXPLAINED — info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">Two separate lists:</p>
        <ul className="space-y-1 text-xs">
          <li className="flex items-center gap-2">
            <Stethoscope size={12} className="text-emerald-600 shrink-0" />
            <strong>Clinical medications</strong> — visible to your doctors during consultations
          </li>
          <li className="flex items-center gap-2">
            <ShoppingCart size={12} className="text-blue-600 shrink-0" />
            <strong>Purchase list</strong> — medications you want to buy (not shared with doctors)
          </li>
        </ul>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="flex border-b border-slate-200">
          <TabBtn
            active={activeTab === "CLINICAL"}
            onClick={() => setActiveTab("CLINICAL")}
            icon={<Stethoscope size={15} />}
            label={`Clinical medications (${clinicalMeds.length})`}
            color="emerald"
          />
          <TabBtn
            active={activeTab === "PURCHASE"}
            onClick={() => setActiveTab("PURCHASE")}
            icon={<ShoppingCart size={15} />}
            label={`Purchase list (${purchaseMeds.length})`}
            color="blue"
          />
        </div>

        {/* Tab actions */}
        {activeTab === "CLINICAL" && clinicalMeds.length > 0 && (
          <div className="flex items-center gap-2 px-5 py-3 bg-slate-50 border-b border-slate-200">
            <button
              onClick={() => setShowShareModal(true)}
              disabled={shareLoading}
              className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg transition"
            >
              {shareLoading ? <Loader2 size={12} className="animate-spin" /> : <Share2 size={12} />}
              Share with doctor
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-200 hover:bg-slate-300 px-3 py-1.5 rounded-lg transition"
            >
              <Download size={12} />
              Export PDF
            </button>
          </div>
        )}

        {/* List */}
        <div className="p-5">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={24} className="animate-spin text-slate-400" />
            </div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-3">{activeTab === "CLINICAL" ? "💊" : "🛒"}</div>
              <p className="text-slate-500 text-sm mb-4">
                {activeTab === "CLINICAL"
                  ? "No clinical medications added yet"
                  : "Your purchase list is empty"}
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="text-emerald-600 text-sm font-semibold hover:underline"
              >
                + Add medication
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {displayed.map((med) => (
                <MedCard
                  key={med.id}
                  medication={med}
                  onDelete={() => handleDelete(med.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add medication modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">

            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h2 className="font-bold text-slate-900">Add medication</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAdd} className="p-5 space-y-4">

              {/* Flow selector — critical for the fix */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  What is this medication for?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, flow: "CLINICAL" })}
                    className={`p-3 rounded-xl border-2 text-left transition ${
                      form.flow === "CLINICAL"
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <Stethoscope size={18} className={form.flow === "CLINICAL" ? "text-emerald-600" : "text-slate-400"} />
                    <p className="text-sm font-semibold mt-1 text-slate-800">I&apos;m taking it</p>
                    <p className="text-xs text-slate-500">Shared with doctors</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, flow: "PURCHASE" })}
                    className={`p-3 rounded-xl border-2 text-left transition ${
                      form.flow === "PURCHASE"
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <ShoppingCart size={18} className={form.flow === "PURCHASE" ? "text-blue-600" : "text-slate-400"} />
                    <p className="text-sm font-semibold mt-1 text-slate-800">I want to buy</p>
                    <p className="text-xs text-slate-500">Purchase list only</p>
                  </button>
                </div>
              </div>

              <Field label="Medication name *" required>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Metformin"
                  className="input-base"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Dosage">
                  <input
                    type="text"
                    value={form.dosage}
                    onChange={(e) => setForm({ ...form, dosage: e.target.value })}
                    placeholder="e.g. 500mg"
                    className="input-base"
                  />
                </Field>
                <Field label="Frequency">
                  <select
                    value={form.frequency}
                    onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                    className="input-base"
                  >
                    <option value="">Select...</option>
                    <option>Once daily</option>
                    <option>Twice daily</option>
                    <option>Three times daily</option>
                    <option>Every 8 hours</option>
                    <option>Every 12 hours</option>
                    <option>As needed</option>
                    <option>Weekly</option>
                  </select>
                </Field>
              </div>

              {form.flow === "CLINICAL" && (
                <Field label="Prescribed by">
                  <input
                    type="text"
                    value={form.prescribedBy}
                    onChange={(e) => setForm({ ...form, prescribedBy: e.target.value })}
                    placeholder="Doctor's name"
                    className="input-base"
                  />
                </Field>
              )}

              <Field label="Notes">
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Any additional notes..."
                  rows={2}
                  className="input-base resize-none"
                />
              </Field>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {saving ? "Saving..." : "Save medication"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tailwind inline styles for input */}
{showShareModal && (
        <ShareModal type="medications" onClose={() => setShowShareModal(false)} />
      )}     
 <style>{`.input-base { width: 100%; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 10px 14px; font-size: 14px; color: #1e293b; outline: none; transition: border-color .15s; } .input-base:focus { border-color: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,.1); }`}</style>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label, color }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string; color: string;
}) {
  const colors = {
    emerald: active ? "border-b-2 border-emerald-500 text-emerald-700 bg-emerald-50" : "text-slate-500 hover:text-slate-700",
    blue: active ? "border-b-2 border-blue-500 text-blue-700 bg-blue-50" : "text-slate-500 hover:text-slate-700",
  };
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold transition ${colors[color as keyof typeof colors]}`}
    >
      {icon} {label}
    </button>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

function MedCard({ medication, onDelete }: { medication: Medication; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 transition">
      <div
        className="flex items-center gap-4 p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          medication.flow === "CLINICAL" ? "bg-emerald-100" : "bg-blue-100"
        }`}>
          {medication.flow === "CLINICAL"
            ? <Pill size={18} className="text-emerald-600" />
            : <ShoppingCart size={18} className="text-blue-600" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 text-sm">{medication.name}</p>
          <p className="text-xs text-slate-500">
            {[medication.dosage, medication.frequency].filter(Boolean).join(" · ") || "No details"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            medication.flow === "CLINICAL"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-blue-100 text-blue-700"
          }`}>
            {medication.flow === "CLINICAL" ? "Clinical" : "Purchase"}
          </span>
          {expanded ? <EyeOff size={14} className="text-slate-400" /> : <Eye size={14} className="text-slate-400" />}
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 pt-0 bg-slate-50 border-t border-slate-100">
          {medication.prescribedBy && (
            <p className="text-xs text-slate-600 mt-2"><strong>Prescribed by:</strong> {medication.prescribedBy}</p>
          )}
          {medication.notes && (
            <p className="text-xs text-slate-600 mt-1"><strong>Notes:</strong> {medication.notes}</p>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="mt-3 flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-medium transition"
          >
            <Trash2 size={12} /> Remove medication
          </button>
        </div>
      )}
    </div>
  );
}
