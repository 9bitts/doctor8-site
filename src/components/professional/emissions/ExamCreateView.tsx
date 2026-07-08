"use client";

import { useState, useMemo } from "react";
import {
  User, ChevronRight, Trash2, Loader2, ArrowLeft, FileText,
} from "lucide-react";
import type { Chart } from "./types";
import type { SavedEmission } from "./EmissionPostSaveFlow";
import ExamSearchInput, { formatExamItem, parseExamItemLine } from "@/components/ExamSearchInput";
import CidSearchInput, { type CidSelection } from "@/components/CidSearchInput";
import { filterPatientCharts } from "@/lib/patient-chart-search";
import { PatientNoAccountPanel } from "./PatientNoAccountPanel";
import NoPatientChartsEmptyState from "@/components/professional/NoPatientChartsEmptyState";
import { keepFocusOnPointerDown } from "@/lib/combobox-interaction";

interface ExamCreateViewProps {
  t: (k: string) => string;
  locale: string;
  charts: Chart[];
  chartsLoading?: boolean;
  reuseHint?: boolean;
  initialPatient: Chart | null;
  lockPatient?: boolean;
  initialItems: string[];
  initialNotes: string;
  initialCid: string;
  initialTitle: string;
  onBack: () => void;
  onSaved: (emission: SavedEmission) => void;
}

export function ExamCreateView({
  t, charts, chartsLoading = false, reuseHint, initialPatient, lockPatient = false, initialItems, initialNotes, initialCid, initialTitle,
  onBack, onSaved,
}: ExamCreateViewProps) {
  const [patientQuery, setPatientQuery] = useState("");
  const [patientPickerOpen, setPatientPickerOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Chart | null>(initialPatient);
  const [title, setTitle] = useState(initialTitle || t("rx.examDefaultTitle"));
  const [items, setItems] = useState<string[]>(
    initialItems.length ? initialItems : []
  );
  const [notes, setNotes] = useState(initialNotes);
  const [cid, setCid] = useState<CidSelection | null>(
    initialCid ? { code: initialCid, description: "" } : null
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [examSearchOpen, setExamSearchOpen] = useState(false);
  const [cidSearchOpen, setCidSearchOpen] = useState(false);

  const filteredCharts = useMemo(
    () => filterPatientCharts(charts, patientQuery),
    [charts, patientQuery],
  );

  function addExam(exam: { code?: string; name: string }) {
    const line = formatExamItem(exam);
    if (!line.trim()) return;
    setItems((prev) => [...prev, line]);
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
          cid: cid?.code || "",
          cidLabel: cid?.description || "",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onSaved({
          kind: "exam",
          id: data.id,
          patient: selectedPatient,
          label: title,
        });
      } else {
        const d = await res.json().catch(() => ({}));
        const errMsg = typeof d.error === "string"
          ? d.error
          : d.error?.formErrors?.[0] || t("rx.saveError");
        setError(errMsg);
      }
    } catch {
      setError(t("rx.saveError"));
    } finally {
      setSaving(false);
    }
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

      <Card title={t("rx2.selectPatient")} elevated={patientPickerOpen}>
        {selectedPatient ? (
          <div className="space-y-3">
            <PatientChip patient={selectedPatient} t={t} onClear={lockPatient ? undefined : () => setSelectedPatient(null)} />
            <PatientNoAccountPanel patient={selectedPatient} />
          </div>
        ) : lockPatient ? (
          <p className="text-sm text-slate-500">{t("rx2.noPatientFound")}</p>
        ) : charts.length === 0 ? (
          <NoPatientChartsEmptyState variant="brand" compact />
        ) : (
          <>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={patientQuery} onChange={(e) => setPatientQuery(e.target.value)}
                onFocus={() => setPatientPickerOpen(true)}
                onBlur={() => setTimeout(() => setPatientPickerOpen(false), 150)}
                placeholder={t("rx2.searchPatient")} className="rx-inp rx-inp-pl-9" />
            </div>
            {patientPickerOpen && (
              <div className="mt-2 border rounded-xl divide-y max-h-48 overflow-y-auto bg-white shadow-sm">
                {chartsLoading ? (
                  <div className="p-4 flex items-center justify-center gap-2 text-sm text-slate-500">
                    <Loader2 size={16} className="animate-spin" /> {t("common.loading")}
                  </div>
                ) : filteredCharts.length === 0 ? (
                  <p className="p-4 text-center text-sm text-slate-500">{t("pat.searchEmpty")}</p>
                ) : filteredCharts.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onMouseDown={keepFocusOnPointerDown}
                    onClick={() => { setSelectedPatient(c); setPatientPickerOpen(false); setPatientQuery(""); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-brand-50 text-left"
                  >
                    <span className="font-medium text-sm">{c.firstName} {c.lastName}</span>
                    <span className="text-xs text-slate-400 ml-auto mr-1">
                      {c.hasAccount ? t("rx2.hasAccountBadge") : t("rx2.noAccountBadge")}
                    </span>
                    <ChevronRight size={14} className="text-slate-300 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </Card>

      <Card title={t("rx2.addItem")} elevated={examSearchOpen}>
        <input value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder={t("rx.examDefaultTitle")} className="rx-inp mb-3" />
        <ExamSearchInput
          placeholder={t("rx.searchExam")}
          manualLabel={t("rx.addExamManual")}
          manualHint={t("rx.manualExamHint")}
          noResults={t("rx.examNoResults")}
          onAdd={addExam}
          onOpenChange={setExamSearchOpen}
        />
      </Card>

      <Card title={t("rx.examItems")} elevated={cidSearchOpen}>
        {items.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">{t("rx.noExamItems")}</p>
        ) : (
          <div className="space-y-2">
            {items.map((item, i) => {
              const parsed = parseExamItemLine(item);
              return (
                <div key={i} className="flex gap-2 items-start">
                  <span className="text-xs text-brand-500 font-bold w-5 pt-2.5">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    {parsed.code && (
                      <p className="text-[10px] font-semibold text-brand-600 mb-0.5">{parsed.code}</p>
                    )}
                    <input
                      value={parsed.name}
                      onChange={(e) => {
                        const next = [...items];
                        next[i] = formatExamItem({ code: parsed.code, name: e.target.value });
                        setItems(next);
                      }}
                      className="rx-inp-sm w-full"
                      placeholder={t("rx.examItemPlaceholder")}
                    />
                  </div>
                  <button onClick={() => setItems(items.filter((_, j) => j !== i))} className="text-red-400 p-1 pt-2">
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-3 mt-4">
          <div className="sm:col-span-2">
            <CidSearchInput value={cid} onChange={setCid} onOpenChange={setCidSearchOpen} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-slate-600 block mb-1">{t("rx.examNotes")}</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className="rx-inp-sm" placeholder={t("rx.examNotesPlaceholder")} />
          </div>
        </div>
      </Card>

      {error && <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-4 py-3">{error}</p>}

      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] z-30">
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

function Card({ title, children, elevated }: { title: string; children: React.ReactNode; elevated?: boolean }) {
  return (
    <div className={`bg-white rounded-2xl border border-brand-100 shadow-sm p-5 space-y-3 ${elevated ? "relative z-50" : ""}`}>
      <label className="text-sm font-semibold text-slate-800">{title}</label>
      {children}
    </div>
  );
}

function PatientChip({ patient, t, onClear }: { patient: Chart; t: (k: string) => string; onClear?: () => void }) {
  return (
    <div className="flex items-center gap-3 bg-brand-50 border border-brand-100 rounded-xl p-3">
      <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center font-bold text-brand-500 text-sm">
        {patient.firstName[0]}{patient.lastName[0]}
      </div>
      <div className="flex-1">
        <p className="font-semibold text-sm">{patient.firstName} {patient.lastName}</p>
        <p className="text-xs text-slate-500">{patient.hasAccount ? t("rx2.hasAccountBadge") : t("rx2.noAccountBadge")}</p>
      </div>
      {onClear && (
        <button onClick={onClear} className="text-xs text-brand-500 font-semibold">{t("rx2.changePatient")}</button>
      )}
    </div>
  );
}
