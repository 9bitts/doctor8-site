"use client";

import { useState } from "react";
import {
  Search, User, ChevronRight, Plus, Trash2, Loader2, FlaskConical, ArrowLeft, FileText,
} from "lucide-react";
import type { Chart } from "./types";

interface ExamCreateViewProps {
  t: (k: string) => string;
  locale: string;
  charts: Chart[];
  reuseHint?: boolean;
  initialPatient: Chart | null;
  initialItems: string[];
  initialNotes: string;
  initialCid: string;
  initialTitle: string;
  onBack: () => void;
  onSaved: () => void;
}

export function ExamCreateView({
  t, charts, reuseHint, initialPatient, initialItems, initialNotes, initialCid, initialTitle,
  onBack, onSaved,
}: ExamCreateViewProps) {
  const [patientQuery, setPatientQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Chart | null>(initialPatient);
  const [title, setTitle] = useState(initialTitle || t("rx.examDefaultTitle"));
  const [examQuery, setExamQuery] = useState("");
  const [items, setItems] = useState<string[]>(initialItems.length ? initialItems : []);
  const [notes, setNotes] = useState(initialNotes);
  const [cid, setCid] = useState(initialCid);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const filteredCharts = patientQuery.trim()
    ? charts.filter((c) => `${c.firstName} ${c.lastName}`.toLowerCase().includes(patientQuery.toLowerCase()))
    : charts.slice(0, 8);

  function addExamManual() {
    const name = examQuery.trim();
    if (!name) {
      setItems((prev) => [...prev, ""]);
      return;
    }
    setItems((prev) => [...prev, name]);
    setExamQuery("");
  }

  async function handleSave() {
    setError("");
    if (!selectedPatient) { setError(t("rx2.needPatient")); return; }
    const cleanItems = items.map((i) => i.trim()).filter(Boolean);
    if (cleanItems.length === 0) { setError(t("rx.needExamItems")); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/professional/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientRecordId: selectedPatient.id,
          type: "EXAM_REQUEST",
          title,
          examItems: cleanItems,
          notes,
          cid,
        }),
      });
      if (res.ok) onSaved();
      else {
        const d = await res.json().catch(() => ({}));
        setError(typeof d.error === "string" ? d.error : t("rx.saveError"));
      }
    } finally { setSaving(false); }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-24">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-brand-500 font-medium">
        <ArrowLeft size={16} /> {t("rx.backToList")}
      </button>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("rx.examFormTitle")}</h1>
        <p className="text-slate-500 text-sm mt-1">{t("rx.examFormSubtitle")}</p>
      </div>

      {reuseHint && (
        <div className="bg-brand-50 border border-brand-200 rounded-2xl p-4 text-sm text-brand-700">
          {t("rx.reuseHint")}
        </div>
      )}

      {/* Patient */}
      <Card title={t("rx2.selectPatient")}>
        {selectedPatient ? (
          <PatientChip patient={selectedPatient} t={t} onClear={() => setSelectedPatient(null)} />
        ) : (
          <>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={patientQuery} onChange={(e) => setPatientQuery(e.target.value)}
                placeholder={t("rx2.searchPatient")} className="rx-inp pl-9" />
            </div>
            {patientQuery.trim() && (
              <div className="mt-2 border rounded-xl divide-y max-h-48 overflow-y-auto">
                {filteredCharts.map((c) => (
                  <button key={c.id} onClick={() => setSelectedPatient(c)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-brand-50 text-left">
                    <span className="font-medium text-sm">{c.firstName} {c.lastName}</span>
                    <ChevronRight size={14} className="ml-auto text-slate-300" />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </Card>

      {/* Exams */}
      <Card title={t("rx2.addItem")}>
        <input value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder={t("rx.examDefaultTitle")} className="rx-inp mb-3" />
        <div className="relative">
          <FlaskConical size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400" />
          <input value={examQuery} onChange={(e) => setExamQuery(e.target.value)}
            placeholder={t("rx.searchExam")} className="rx-inp pl-10"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addExamManual())} />
        </div>
        <button type="button" onClick={addExamManual}
          className="w-full mt-3 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-brand-200 bg-brand-50/50 hover:bg-brand-50 text-brand-600 font-semibold text-sm transition">
          <Plus size={16} /> {t("rx.addExamManual")}
        </button>
        <p className="text-xs text-slate-400 text-center mt-1">{t("rx.manualAlways")}</p>
      </Card>

      <Card title={t("rx.examItems")}>
        {items.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">{t("rx.noExamItems")}</p>
        ) : (
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex gap-2 items-center">
                <span className="text-xs text-brand-500 font-bold w-5">{i + 1}.</span>
                <input value={item} onChange={(e) => {
                  const next = [...items];
                  next[i] = e.target.value;
                  setItems(next);
                }} className="rx-inp-sm flex-1" placeholder={t("rx.examItemPlaceholder")} />
                <button onClick={() => setItems(items.filter((_, j) => j !== i))} className="text-red-400 p-1">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-3 mt-4">
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">{t("rx.cidLabel")}</label>
            <input value={cid} onChange={(e) => setCid(e.target.value)} className="rx-inp-sm" placeholder="E11" />
          </div>
          <div className="sm:col-span-1">
            <label className="text-xs font-medium text-slate-600 block mb-1">{t("rx.examNotes")}</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className="rx-inp-sm" placeholder={t("rx.examNotesPlaceholder")} />
          </div>
        </div>
      </Card>

      {error && <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-4 py-3">{error}</p>}

      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t p-4 z-20">
        <div className="max-w-3xl mx-auto flex gap-3">
          <button onClick={onBack} className="flex-1 py-3.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm">
            {t("rx2.cancel")}
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-[2] py-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            {saving ? t("rx2.saving") : t("rx.generateExam")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5 space-y-3">
      <label className="text-sm font-semibold text-slate-800">{title}</label>
      {children}
    </div>
  );
}

function PatientChip({ patient, t, onClear }: { patient: Chart; t: (k: string) => string; onClear: () => void }) {
  return (
    <div className="flex items-center gap-3 bg-brand-50 border border-brand-100 rounded-xl p-3">
      <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center font-bold text-brand-500 text-sm">
        {patient.firstName[0]}{patient.lastName[0]}
      </div>
      <div className="flex-1">
        <p className="font-semibold text-sm">{patient.firstName} {patient.lastName}</p>
        <p className="text-xs text-slate-500">{patient.hasAccount ? t("rx2.hasAccountBadge") : t("rx2.noAccountBadge")}</p>
      </div>
      <button onClick={onClear} className="text-xs text-brand-500 font-semibold">{t("rx2.changePatient")}</button>
    </div>
  );
}
