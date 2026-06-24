"use client";

import { useState } from "react";
import {
  Search, User, ChevronRight, ArrowLeft, FileText, Loader2,
} from "lucide-react";
import type { Chart } from "./types";
import type { SavedEmission } from "./EmissionPostSaveFlow";

const DOC_TYPES = [
  { value: "CERTIFICATE", labelKey: "rx.docTypeCertificate" },
  { value: "REFERRAL", labelKey: "rx.docTypeReferral" },
  { value: "CLINICAL_NOTE", labelKey: "rx.docTypeReport" },
  { value: "OTHER", labelKey: "rx.docTypeOther" },
] as const;

interface DocumentCreateViewProps {
  t: (k: string) => string;
  charts: Chart[];
  reuseHint?: boolean;
  initialPatient: Chart | null;
  initialTitle: string;
  initialBody: string;
  initialType: string;
  onBack: () => void;
  onSaved: (emission: SavedEmission) => void;
}

export function DocumentCreateView({
  t, charts, reuseHint, initialPatient, initialTitle, initialBody, initialType,
  onBack, onSaved,
}: DocumentCreateViewProps) {
  const [patientQuery, setPatientQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Chart | null>(initialPatient);
  const [docType, setDocType] = useState(initialType || "CERTIFICATE");
  const [title, setTitle] = useState(initialTitle || t("rx.docDefaultTitle"));
  const [body, setBody] = useState(initialBody);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const filteredCharts = patientQuery.trim()
    ? charts.filter((c) => `${c.firstName} ${c.lastName}`.toLowerCase().includes(patientQuery.toLowerCase()))
    : charts.slice(0, 8);

  async function handleSave() {
    setError("");
    if (!selectedPatient) { setError(t("rx2.needPatient")); return; }
    if (!body.trim()) { setError(t("rx.needDocumentBody")); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/professional/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientRecordId: selectedPatient.id,
          type: docType,
          title,
          content: body,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onSaved({
          kind: "document",
          id: data.id,
          patient: selectedPatient,
          label: title,
        });
      } else {
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
        <h1 className="text-2xl font-bold text-slate-900">{t("rx.documentFormTitle")}</h1>
        <p className="text-slate-500 text-sm mt-1">{t("rx.documentFormSubtitle")}</p>
      </div>

      {reuseHint && (
        <div className="bg-brand-50 border border-brand-200 rounded-2xl p-4 text-sm text-brand-700">
          {t("rx.reuseHint")}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5 space-y-4">
        <label className="text-sm font-semibold text-slate-800">{t("rx2.selectPatient")}</label>
        {selectedPatient ? (
          <div className="flex items-center gap-3 bg-brand-50 border border-brand-100 rounded-xl p-3">
            <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center font-bold text-brand-500 text-sm">
              {selectedPatient.firstName[0]}{selectedPatient.lastName[0]}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">{selectedPatient.firstName} {selectedPatient.lastName}</p>
            </div>
            <button onClick={() => setSelectedPatient(null)} className="text-xs text-brand-500 font-semibold">
              {t("rx2.changePatient")}
            </button>
          </div>
        ) : (
          <>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={patientQuery} onChange={(e) => setPatientQuery(e.target.value)}
                placeholder={t("rx2.searchPatient")} className="rx-inp pl-9" />
            </div>
            {patientQuery.trim() && (
              <div className="border rounded-xl divide-y max-h-48 overflow-y-auto">
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
      </div>

      <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5 space-y-4">
        <label className="text-sm font-semibold text-slate-800">{t("rx.documentType")}</label>
        <div className="grid grid-cols-2 gap-2">
          {DOC_TYPES.map((dt) => (
            <button key={dt.value} type="button" onClick={() => setDocType(dt.value)}
              className={`p-3 rounded-xl border-2 text-left text-sm font-semibold transition ${
                docType === dt.value ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600 hover:border-slate-300"
              }`}>
              {t(dt.labelKey)}
            </button>
          ))}
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">{t("rx.documentTitleLabel")}</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="rx-inp" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">{t("rx.documentBody")}</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10}
            placeholder={t("rx.documentBodyPlaceholder")} className="rx-inp resize-y min-h-[200px]" />
        </div>
      </div>

      {error && <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-4 py-3">{error}</p>}

      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t p-4 z-20">
        <div className="max-w-3xl mx-auto flex gap-3">
          <button onClick={onBack} className="flex-1 py-3.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm">
            {t("rx2.cancel")}
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-[2] py-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            {saving ? t("rx2.saving") : t("rx.generateDocument")}
          </button>
        </div>
      </div>
    </div>
  );
}
