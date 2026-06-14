"use client";

// src/app/(dashboard)/professional/prescriptions/page.tsx
// ETAPA 2 — Memed-style prescription screen.
// - Patient: searched among the professional's charts (PatientRecord). If not found,
//   the UI tells the doctor to create the chart first.
// - Medication: searched in the DrugCatalog (Etapa 1 API). Click to add as a card.
//   Each card has editable dosage / frequency / duration / instructions.
// - Saving uses the prescription API with patientRecordId (works with/without account).
// i18n via useI18n().

import { useState, useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";
import {
  Plus, Trash2, FileText, Download, Loader2, X, CheckCircle2, Search,
  User, Pill, AlertCircle, ChevronRight,
} from "lucide-react";

// ── Types ──
interface Chart {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  hasAccount: boolean;
}

interface Drug {
  id: string;
  name: string;
  activeIngredient: string;
  presentation: string;
  manufacturer: string | null;
  country: string;
  category: string | null;
  controlled: boolean;
  prescriptionType: string | null;
}

interface MedItem {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  // extra display-only info (not sent as clinical fields)
  presentation?: string;
  controlled?: boolean;
}

interface Prescription {
  id: string;
  createdAt: string;
  validUntil?: string;
  document?: { patient?: { firstName: string; lastName: string } | null };
  medications: MedItem[];
}

export default function PrescriptionsPage() {
  const { t, lang } = useI18n();
  const locale = localeOf(lang);

  // List of existing prescriptions
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal + form
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState("");

  // Patient selection
  const [charts, setCharts] = useState<Chart[]>([]);
  const [patientQuery, setPatientQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Chart | null>(null);

  // Drug search
  const [drugQuery, setDrugQuery] = useState("");
  const [drugResults, setDrugResults] = useState<Drug[]>([]);
  const [drugSearching, setDrugSearching] = useState(false);
  const [drugCountry, setDrugCountry] = useState("");
  const drugDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Prescription items
  const [medications, setMedications] = useState<MedItem[]>([]);
  const [instructions, setInstructions] = useState("");
  const [validDays, setValidDays] = useState(30);

  useEffect(() => { fetchPrescriptions(); }, []);

  async function fetchPrescriptions() {
    try {
      const res = await fetch("/api/professional/prescriptions");
      const d = await res.json();
      setPrescriptions(d.prescriptions || []);
    } finally { setLoading(false); }
  }

  async function openForm() {
    setShowForm(true);
    resetForm();
    // Load the professional's charts for patient search
    try {
      const res = await fetch("/api/professional/records");
      const d = await res.json();
      setCharts(d.records || []);
    } catch { /* ignore */ }
  }

  function resetForm() {
    setSelectedPatient(null);
    setPatientQuery("");
    setDrugQuery("");
    setDrugResults([]);
    setDrugCountry("");
    setMedications([]);
    setInstructions("");
    setValidDays(30);
    setFormError("");
  }

  // ── Patient search (client-side filter over loaded charts) ──
  const filteredCharts = patientQuery.trim().length === 0
    ? charts.slice(0, 8)
    : charts.filter((c) =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(patientQuery.toLowerCase())
      );

  // ── Drug search (server-side, debounced) ──
  useEffect(() => {
    if (drugDebounce.current) clearTimeout(drugDebounce.current);
    const q = drugQuery.trim();
    if (q.length < 2) {
      setDrugResults([]);
      setDrugSearching(false);
      return;
    }
    setDrugSearching(true);
    drugDebounce.current = setTimeout(async () => {
      try {
        const url = `/api/professional/drugs/search?q=${encodeURIComponent(q)}${drugCountry ? `&country=${drugCountry}` : ""}`;
        const res = await fetch(url);
        const d = await res.json();
        setDrugResults(d.drugs || []);
      } catch {
        setDrugResults([]);
      } finally {
        setDrugSearching(false);
      }
    }, 300);
    return () => { if (drugDebounce.current) clearTimeout(drugDebounce.current); };
  }, [drugQuery, drugCountry]);

  function addDrug(drug: Drug) {
    setMedications((prev) => [
      ...prev,
      {
        name: `${drug.name}${drug.activeIngredient ? ` (${drug.activeIngredient})` : ""}`,
        dosage: "",
        frequency: "",
        duration: "",
        instructions: "",
        presentation: drug.presentation,
        controlled: drug.controlled,
      },
    ]);
    setDrugQuery("");
    setDrugResults([]);
  }

  function addManual() {
    const q = drugQuery.trim();
    setMedications((prev) => [
      ...prev,
      { name: q || "", dosage: "", frequency: "", duration: "", instructions: "" },
    ]);
    setDrugQuery("");
    setDrugResults([]);
  }

  function removeMedication(index: number) {
    setMedications((prev) => prev.filter((_, i) => i !== index));
  }

  function updateMedication(index: number, field: keyof MedItem, value: string) {
    setMedications((prev) => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
  }

  async function handleSubmit() {
    setFormError("");
    if (!selectedPatient) { setFormError(t("rx2.needPatient")); return; }
    if (medications.length === 0 || medications.some((m) => !m.name || !m.dosage || !m.frequency)) {
      setFormError(t("rx2.needMeds"));
      return;
    }
    setSaving(true);
    try {
      // send only the clinical fields the API expects
      const cleanMeds = medications.map((m) => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        instructions: m.instructions,
      }));
      const res = await fetch("/api/professional/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientRecordId: selectedPatient.id,
          medications: cleanMeds,
          instructions,
          validDays,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => {
          setSaved(false);
          setShowForm(false);
          resetForm();
          fetchPrescriptions();
        }, 1300);
      } else {
        const d = await res.json().catch(() => ({}));
        setFormError(typeof d.error === "string" ? d.error : t("rx2.needMeds"));
      }
    } finally { setSaving(false); }
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
          <h1 className="text-2xl font-bold text-slate-900">{t("rx.title")}</h1>
          <p className="text-slate-500 text-sm mt-1">{t("rx.subtitle")}</p>
        </div>
        <button
          onClick={openForm}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition"
        >
          <Plus size={16} /> {t("rx.new")}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder={t("rx.search")}
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
          <p className="text-slate-500">{t("rx.empty")}</p>
          <button onClick={openForm} className="mt-4 text-emerald-600 text-sm font-semibold hover:underline">
            {t("rx.createFirst")} →
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
                        : t("rx.patient")
                      }
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {t("rx.issued")} {new Date(p.createdAt).toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" })}
                      {p.validUntil && ` · ${t("rx.validUntil")} ${new Date(p.validUntil).toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" })}`}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {meds.slice(0, 3).map((m, i) => (
                        <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                          {m.name} {m.dosage}
                        </span>
                      ))}
                      {meds.length > 3 && (
                        <span className="text-xs text-slate-400">+{meds.length - 3} {t("rx.more")}</span>
                      )}
                    </div>
                  </div>
                  <a
                    href={`/api/professional/prescriptions/${p.id}/pdf`}
                    target="_blank"
                    className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold transition shrink-0"
                  >
                    <Download size={14} /> {t("rx.downloadPDF")}
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
              <h2 className="font-bold text-slate-900 text-lg">{t("rx.modalTitle")}</h2>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-6">

              {/* ── PATIENT ── */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">{t("rx2.selectPatient")}</label>

                {selectedPatient ? (
                  <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center font-bold text-emerald-600 text-sm shrink-0">
                      {selectedPatient.firstName[0]}{selectedPatient.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm">
                        {selectedPatient.firstName} {selectedPatient.lastName}
                      </p>
                      <p className="text-xs mt-0.5">
                        {selectedPatient.hasAccount ? (
                          <span className="text-emerald-600 inline-flex items-center gap-1">
                            <CheckCircle2 size={12} /> {t("rx2.hasAccountBadge")}
                          </span>
                        ) : (
                          <span className="text-amber-600 inline-flex items-center gap-1">
                            <AlertCircle size={12} /> {t("rx2.noAccountBadge")}
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => { setSelectedPatient(null); setPatientQuery(""); }}
                      className="text-xs text-slate-500 hover:text-slate-700 font-medium shrink-0"
                    >
                      {t("rx2.changePatient")}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={patientQuery}
                        onChange={(e) => setPatientQuery(e.target.value)}
                        placeholder={t("rx2.searchPatient")}
                        className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                      />
                    </div>

                    <div className="mt-2 border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100">
                      {filteredCharts.length === 0 ? (
                        <div className="p-4 text-center">
                          <p className="text-sm text-slate-500">{t("rx2.noPatientFound")}</p>
                          <p className="text-xs text-slate-400 mt-1">{t("rx2.noPatientHint")}</p>
                          <a
                            href="/professional/patients"
                            className="mt-3 inline-flex items-center gap-1.5 text-emerald-600 text-sm font-semibold hover:underline"
                          >
                            <Plus size={14} /> {t("rx2.createPatient")}
                          </a>
                        </div>
                      ) : (
                        filteredCharts.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => { setSelectedPatient(c); }}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition text-left"
                          >
                            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs shrink-0">
                              {c.firstName[0]}{c.lastName[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-800 text-sm">{c.firstName} {c.lastName}</p>
                              <p className="text-xs text-slate-400">
                                {c.hasAccount ? t("rx2.hasAccountBadge") : t("rx2.noAccountBadge")}
                              </p>
                            </div>
                            <ChevronRight size={16} className="text-slate-300 shrink-0" />
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* ── DRUG SEARCH ── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-slate-700">{t("rx2.addItem")}</label>
                  <select
                    value={drugCountry}
                    onChange={(e) => setDrugCountry(e.target.value)}
                    className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-600 focus:outline-none"
                  >
                    <option value="">{t("rx2.countryAll")}</option>
                    <option value="BR">🇧🇷 BR</option>
                    <option value="US">🇺🇸 US</option>
                  </select>
                </div>
                <div className="relative">
                  <Pill size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={drugQuery}
                    onChange={(e) => setDrugQuery(e.target.value)}
                    placeholder={t("rx2.searchDrug")}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                  {drugSearching && (
                    <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
                  )}
                </div>

                {/* Drug results dropdown */}
                {drugQuery.trim().length >= 2 && (
                  <div className="mt-2 border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto">
                    {drugResults.length === 0 && !drugSearching ? (
                      <div className="p-4 text-center">
                        <p className="text-sm text-slate-500">{t("rx2.noDrugsFound")}</p>
                        <button
                          onClick={addManual}
                          className="mt-2 inline-flex items-center gap-1.5 text-emerald-600 text-sm font-semibold hover:underline"
                        >
                          <Plus size={14} /> {t("rx2.addManual")}
                        </button>
                      </div>
                    ) : (
                      drugResults.map((drug) => (
                        <button
                          key={drug.id}
                          onClick={() => addDrug(drug)}
                          className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition text-left"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-800 text-sm flex items-center gap-2">
                              {drug.name}
                              {drug.controlled && (
                                <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-semibold">
                                  {t("rx2.controlled")}
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-slate-500">{drug.activeIngredient}</p>
                            <p className="text-xs text-slate-400">{drug.presentation}{drug.manufacturer ? ` · ${drug.manufacturer}` : ""}</p>
                          </div>
                          <Plus size={16} className="text-emerald-500 shrink-0 mt-1" />
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* ── SELECTED MEDS (cards) ── */}
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-2">{t("rx2.selectedMeds")}</label>
                {medications.length === 0 ? (
                  <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-sm text-slate-400">{t("rx2.noMeds")}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {medications.map((med, index) => (
                      <div key={index} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 text-sm flex items-center gap-2 flex-wrap">
                              {med.name}
                              {med.controlled && (
                                <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-semibold">
                                  {t("rx2.controlled")}
                                </span>
                              )}
                            </p>
                            {med.presentation && (
                              <p className="text-xs text-slate-400 mt-0.5">{med.presentation}</p>
                            )}
                          </div>
                          <button onClick={() => removeMedication(index)} className="text-red-400 hover:text-red-600 shrink-0">
                            <Trash2 size={15} />
                          </button>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium text-slate-600 block mb-1">{t("rx2.dosageLabel")} *</label>
                            <input type="text" value={med.dosage} onChange={(e) => updateMedication(index, "dosage", e.target.value)} placeholder="500mg" className="inp-sm" />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-slate-600 block mb-1">{t("rx2.frequencyLabel")} *</label>
                            <select value={med.frequency} onChange={(e) => updateMedication(index, "frequency", e.target.value)} className="inp-sm">
                              <option value="">{t("med.freqSelect")}</option>
                              <option value="Once daily">{t("med.freqOnce")}</option>
                              <option value="Twice daily">{t("med.freqTwice")}</option>
                              <option value="Three times daily">{t("med.freqThree")}</option>
                              <option value="Every 8 hours">{t("med.freq8h")}</option>
                              <option value="Every 12 hours">{t("med.freq12h")}</option>
                              <option value="As needed">{t("med.freqAsNeeded")}</option>
                              <option value="Weekly">{t("med.freqWeekly")}</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-slate-600 block mb-1">{t("rx2.durationLabel")}</label>
                            <input type="text" value={med.duration} onChange={(e) => updateMedication(index, "duration", e.target.value)} placeholder={t("rx.medDurationPlaceholder")} className="inp-sm" />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-slate-600 block mb-1">{t("rx2.instructionsLabel")}</label>
                            <input type="text" value={med.instructions} onChange={(e) => updateMedication(index, "instructions", e.target.value)} placeholder={t("rx.medInstructionsPlaceholder")} className="inp-sm" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── GENERAL INSTRUCTIONS + VALIDITY ── */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t("rx2.generalInstructions")}</label>
                <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2} placeholder={t("rx.generalInstructionsPlaceholder")} className="inp resize-none" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t("rx2.validFor")}</label>
                <select value={validDays} onChange={(e) => setValidDays(Number(e.target.value))} className="inp">
                  <option value={7}>{t("rx.days7")}</option>
                  <option value={30}>{t("rx.days30")}</option>
                  <option value={60}>{t("rx.days60")}</option>
                  <option value={90}>{t("rx.days90")}</option>
                  <option value={180}>{t("rx.days180")}</option>
                  <option value={365}>{t("rx.days365")}</option>
                </select>
              </div>

              {formError && (
                <p className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{formError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition">
                  {t("rx2.cancel")}
                </button>
                <button type="button" onClick={handleSubmit} disabled={saving} className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <CheckCircle2 size={14} /> : null}
                  {saved ? t("rx2.saved") : saving ? t("rx2.saving") : t("rx2.save")}
                </button>
              </div>
            </div>
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
