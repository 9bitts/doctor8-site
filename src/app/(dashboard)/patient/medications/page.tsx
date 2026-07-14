"use client";

// src/app/(dashboard)/patient/medications/page.tsx
// CLINICAL (free text) vs PURCHASE (catalog search + CMED price) flows.

import { useState, useEffect } from "react";
import { useT } from "@/lib/i18n/I18nProvider";
import { Pill, Plus, Trash2, Tag, Stethoscope, X, Loader2, Share2, Download, Pencil, AlertCircle, RefreshCw } from "lucide-react";
import ShareModal from "@/components/ShareModal";
import { useToast } from "@/components/ui/toast";
import PharmacyMarketplacePanel from "@/components/patient/PharmacyMarketplacePanel";

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
  drugCatalogId?: string | null;
  referencePriceCents?: number | null;
}

function formatBrl(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export default function MedicationsPage() {
  const t = useT();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<Flow>("CLINICAL");
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    dosage: "",
    frequency: "",
    prescribedBy: "",
    notes: "",
  });

  useEffect(() => { fetchMedications(); }, []);

  async function fetchMedications() {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch("/api/patient/medications");
      if (!res.ok) { setLoadError(true); return; }
      const data = await res.json();
      setMedications(data.medications || []);
    } catch { setLoadError(true); }
    finally { setLoading(false); }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingId ? `/api/patient/medications/${editingId}` : "/api/patient/medications";
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, flow: "CLINICAL" }),
      });
      if (res.ok) {
        closeForm();
        fetchMedications();
        toast.success(t("med.saveOk"));
      } else {
        toast.error(t("med.saveError"));
      }
    } catch {
      toast.error(t("med.saveError"));
    } finally { setSaving(false); }
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm({ name: "", dosage: "", frequency: "", prescribedBy: "", notes: "" });
  }

  function openEdit(med: Medication) {
    if (med.flow === "PURCHASE") return;
    setEditingId(med.id);
    setForm({
      name: med.name,
      dosage: med.dosage || "",
      frequency: med.frequency || "",
      prescribedBy: med.prescribedBy || "",
      notes: med.notes || "",
    });
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    if (!confirm(t("med.removeConfirm"))) return;
    try {
      const res = await fetch(`/api/patient/medications/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error(t("med.deleteError"));
        return;
      }
      fetchMedications();
      toast.success(t("med.deleteOk"));
    } catch {
      toast.error(t("med.deleteError"));
    }
  }

  async function handleExportPDF() {
    window.open("/api/patient/medications/pdf", "_blank");
  }

  const clinicalMeds = medications.filter((m) => m.flow === "CLINICAL");
  const purchaseMeds = medications.filter((m) => m.flow === "PURCHASE");
  const displayed = activeTab === "CLINICAL" ? clinicalMeds : purchaseMeds;

  function openAddForm() {
    setEditingId(null);
    setForm({ name: "", dosage: "", frequency: "", prescribedBy: "", notes: "" });
    setShowForm(true);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("med.title")}</h1>
          <p className="text-slate-500 text-sm mt-1">{t("med.subtitle")}</p>
        </div>
        {activeTab === "CLINICAL" && (
          <button
            onClick={openAddForm}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition"
          >
            <Plus size={16} /> {t("med.add")}
          </button>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">{t("med.twoLists")}</p>
        <ul className="space-y-1 text-xs">
          <li className="flex items-center gap-2">
            <Stethoscope size={12} className="text-emerald-600 shrink-0" />
            <strong>{t("med.clinicalLabel")}</strong> — {t("med.clinicalDesc")}
          </li>
          <li className="flex items-center gap-2">
            <Tag size={12} className="text-blue-600 shrink-0" />
            <strong>{t("med.purchaseLabel")}</strong> — {t("med.purchaseDesc")}
          </li>
        </ul>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="flex border-b border-slate-200">
          <TabBtn
            active={activeTab === "CLINICAL"}
            onClick={() => setActiveTab("CLINICAL")}
            icon={<Stethoscope size={15} />}
            label={`${t("med.clinicalTab")} (${clinicalMeds.length})`}
            color="emerald"
          />
          <TabBtn
            active={activeTab === "PURCHASE"}
            onClick={() => setActiveTab("PURCHASE")}
            icon={<Tag size={15} />}
            label={`${t("med.purchaseTab")} (${purchaseMeds.length})`}
            color="blue"
          />
        </div>

        {activeTab === "PURCHASE" && (
          <PharmacyMarketplacePanel onSaved={fetchMedications} />
        )}

        {activeTab === "CLINICAL" && clinicalMeds.length > 0 && (
          <div className="flex items-center gap-2 px-5 py-3 bg-slate-50 border-b border-slate-200">
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg transition"
            >
              <Share2 size={12} />
              {t("med.shareWithDoctor")}
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-200 hover:bg-slate-300 px-3 py-1.5 rounded-lg transition"
            >
              <Download size={12} />
              {t("med.exportPDF")}
            </button>
          </div>
        )}

        <div className="p-5">
          {activeTab === "PURCHASE" && purchaseMeds.length > 0 && (
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              {t("pharmacy.savedList")}
            </p>
          )}

          {loadError ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <AlertCircle size={24} className="text-amber-500" />
              <p className="text-sm text-slate-600">{t("common.loadError")}</p>
              <button type="button" onClick={fetchMedications} className="text-sm font-semibold text-emerald-600 flex items-center gap-1">
                <RefreshCw size={14} /> {t("common.retry")}
              </button>
            </div>
          ) : loading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={24} className="animate-spin text-slate-400" />
            </div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">{activeTab === "CLINICAL" ? "💊" : "💰"}</div>
              <p className="text-slate-500 text-sm mb-4">
                {activeTab === "CLINICAL" ? t("med.emptyClinical") : t("med.emptyPurchase")}
              </p>
              {activeTab === "CLINICAL" && (
                <button
                  onClick={openAddForm}
                  className="text-emerald-600 text-sm font-semibold hover:underline"
                >
                  + {t("med.addMed")}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {displayed.map((med) => (
                <MedCard
                  key={med.id}
                  medication={med}
                  onEdit={() => openEdit(med)}
                  onDelete={() => handleDelete(med.id)}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h2 className="font-bold text-slate-900">{editingId ? t("med.editMed") : t("med.modalTitle")}</h2>
              <button onClick={closeForm} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAdd} className="p-5 space-y-4">
              <Field label={t("med.nameLabel")} required>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t("med.namePlaceholder")}
                  className="input-base"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label={t("med.dosage")}>
                  <input
                    type="text"
                    value={form.dosage}
                    onChange={(e) => setForm({ ...form, dosage: e.target.value })}
                    placeholder="500mg"
                    className="input-base"
                  />
                </Field>
                <Field label={t("med.frequency")}>
                  <select
                    value={form.frequency}
                    onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                    className="input-base"
                  >
                    <option value="">{t("med.freqSelect")}</option>
                    <option value="Once daily">{t("med.freqOnce")}</option>
                    <option value="Twice daily">{t("med.freqTwice")}</option>
                    <option value="Three times daily">{t("med.freqThree")}</option>
                    <option value="Every 8 hours">{t("med.freq8h")}</option>
                    <option value="Every 12 hours">{t("med.freq12h")}</option>
                    <option value="As needed">{t("med.freqAsNeeded")}</option>
                    <option value="Weekly">{t("med.freqWeekly")}</option>
                    <option value="Continuous use">{t("med.freqContinuous")}</option>
                  </select>
                </Field>
              </div>

              <Field label={t("med.prescribedBy")}>
                <input
                  type="text"
                  value={form.prescribedBy}
                  onChange={(e) => setForm({ ...form, prescribedBy: e.target.value })}
                  placeholder={t("med.prescribedByPlaceholder")}
                  className="input-base"
                />
              </Field>

              <Field label={t("med.notes")}>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder={t("med.notesPlaceholder")}
                  rows={2}
                  className="input-base resize-none"
                />
              </Field>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {saving ? t("docs.modal.saving") : editingId ? t("med.updateMed") : t("med.saveMed")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

function MedCard({ medication, onEdit, onDelete, t }: {
  medication: Medication;
  onEdit: () => void;
  onDelete: () => void;
  t: (k: string) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const isPurchase = medication.flow === "PURCHASE";

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 transition">
      <div className="flex items-center gap-4 p-4">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 cursor-pointer ${
            isPurchase ? "bg-blue-100" : "bg-emerald-100"
          }`}
          onClick={() => setExpanded(!expanded)}
        >
          {isPurchase
            ? <Tag size={18} className="text-blue-600" />
            : <Pill size={18} className="text-emerald-600" />
          }
        </div>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <p className="font-semibold text-slate-800 text-sm">{medication.name}</p>
          <p className="text-xs text-slate-500">
            {[medication.dosage, medication.frequency].filter(Boolean).join(" · ") || t("med.noDetails")}
          </p>
          {isPurchase && medication.referencePriceCents != null && medication.referencePriceCents > 0 && (
            <p className="text-sm font-bold text-emerald-700 mt-1">
              {formatBrl(medication.referencePriceCents)}
              <span className="text-[10px] font-normal text-slate-400 ml-1.5">
                {t("pharmacy.referenceShort")}
              </span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {!isPurchase && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
              title={t("med.edit")}
            >
              <Pencil size={15} />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
            title={t("med.remove")}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 pt-0 bg-slate-50 border-t border-slate-100">
          {isPurchase && medication.referencePriceCents != null && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-2 mt-2">
              {t("pharmacy.referencePriceNote")}
            </p>
          )}
          {medication.prescribedBy && (
            <p className="text-xs text-slate-600 mt-2"><strong>{t("med.prescribedByLabel")}</strong> {medication.prescribedBy}</p>
          )}
          {medication.notes && (
            <p className="text-xs text-slate-600 mt-1"><strong>{t("med.notesLabel")}</strong> {medication.notes}</p>
          )}
        </div>
      )}
    </div>
  );
}
