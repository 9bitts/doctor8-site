"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { GitCompare, Loader2, Save, Trash2 } from "lucide-react";
import type { PharmacistChart } from "./PharmacistChartWorkspace";
import type { MedicationItem } from "@/lib/pharmacy/types";
import { useVoiceFormPrefill, VoicePrefillBanner } from "@/components/voice-assistant/useVoiceFormPrefill";
import type { ReconciliationPrefill } from "@/lib/voice-assistant/types";

type Discrepancy = {
  medication: string;
  type: "OMISSION" | "COMMISSION" | "DOSE" | "FREQUENCY" | "OTHER";
  note?: string;
};

type Reconciliation = {
  id: string;
  sourceContext: string;
  medicationsBefore: MedicationItem[];
  medicationsAfter: MedicationItem[];
  discrepancies: Discrepancy[];
  notes: string | null;
  reconciledAt: string;
};

const emptyMed = (): MedicationItem => ({ name: "", dosage: "", frequency: "" });

const emptyDiscrepancy = (): Discrepancy => ({ medication: "", type: "OTHER" });

export default function ReconciliationModule({ chart }: { chart: PharmacistChart }) {
  const { t } = useI18n();
  const [records, setRecords] = useState<Reconciliation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sourceContext, setSourceContext] = useState("");
  const [medicationsBefore, setMedicationsBefore] = useState<MedicationItem[]>([emptyMed()]);
  const [medicationsAfter, setMedicationsAfter] = useState<MedicationItem[]>([emptyMed()]);
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([]);
  const [notes, setNotes] = useState("");

  const { voicePrefillActive } = useVoiceFormPrefill({
    formType: "reconciliation",
    chartId: chart.id,
    onApply: (data) => {
      const d = data as ReconciliationPrefill;
      if (d.sourceContext) setSourceContext(d.sourceContext);
      if (d.notes) setNotes(d.notes);
      if (d.medicationsBefore?.length) {
        setMedicationsBefore(d.medicationsBefore.map((m) => ({
          name: m.name || "",
          dosage: m.dosage || "",
          frequency: "",
        })));
      }
      if (d.medicationsAfter?.length) {
        setMedicationsAfter(d.medicationsAfter.map((m) => ({
          name: m.name || "",
          dosage: m.dosage || "",
          frequency: "",
        })));
      }
    },
  });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/pharmacist/charts/${chart.id}/reconciliations`);
      const data = await res.json();
      setRecords(data.reconciliations || []);
    } catch {
      setRecords([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [chart.id]);

  function updateMedList(
    list: MedicationItem[],
    setList: (v: MedicationItem[]) => void,
    idx: number,
    patch: Partial<MedicationItem>,
  ) {
    setList(list.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
  }

  async function save() {
    if (!sourceContext.trim()) return;
    const before = medicationsBefore.filter((m) => m.name.trim());
    const after = medicationsAfter.filter((m) => m.name.trim());
    if (before.length === 0 && after.length === 0) return;
    setSaving(true);
    try {
      await fetch(`/api/pharmacist/charts/${chart.id}/reconciliations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceContext,
          medicationsBefore: before,
          medicationsAfter: after,
          discrepancies: discrepancies.filter((d) => d.medication.trim()),
          notes: notes || undefined,
        }),
      });
      setSourceContext("");
      setMedicationsBefore([emptyMed()]);
      setMedicationsAfter([emptyMed()]);
      setDiscrepancies([]);
      setNotes("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  function renderMedList(
    label: string,
    list: MedicationItem[],
    setList: (v: MedicationItem[]) => void,
  ) {
    return (
      <div>
        <p className="text-sm font-medium text-slate-700 mb-2">{label}</p>
        {list.map((med, idx) => (
          <div key={idx} className="flex gap-2 mb-2">
            <input
              value={med.name}
              onChange={(e) => updateMedList(list, setList, idx, { name: e.target.value })}
              placeholder={t("pharma.medReview.name")}
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              value={med.dosage || ""}
              onChange={(e) => updateMedList(list, setList, idx, { dosage: e.target.value })}
              placeholder={t("pharma.medReview.dosage")}
              className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            {list.length > 1 && (
              <button type="button" onClick={() => setList(list.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-red-600">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={() => setList([...list, emptyMed()])} className="text-sm text-teal-700 hover:text-teal-800">
          + {t("pharma.medReview.addMed")}
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-teal-500" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <VoicePrefillBanner active={voicePrefillActive} />
      <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-5 space-y-4">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <GitCompare size={16} className="text-teal-600" />
          {t("pharma.reconciliation.new")}
        </h3>
        <p className="text-sm text-slate-600">{t("pharma.reconciliation.newDesc")}</p>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t("pharma.reconciliation.source")}</label>
          <input
            value={sourceContext}
            onChange={(e) => setSourceContext(e.target.value)}
            placeholder={t("pharma.reconciliation.sourceHint")}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {renderMedList(t("pharma.reconciliation.before"), medicationsBefore, setMedicationsBefore)}
          {renderMedList(t("pharma.reconciliation.after"), medicationsAfter, setMedicationsAfter)}
        </div>

        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">{t("pharma.reconciliation.discrepancies")}</p>
          {discrepancies.map((d, idx) => (
            <div key={idx} className="flex flex-wrap gap-2 mb-2">
              <input
                value={d.medication}
                onChange={(e) => setDiscrepancies((p) => p.map((x, i) => (i === idx ? { ...x, medication: e.target.value } : x)))}
                placeholder={t("pharma.medReview.name")}
                className="flex-1 min-w-[120px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <select
                value={d.type}
                onChange={(e) => setDiscrepancies((p) => p.map((x, i) => (i === idx ? { ...x, type: e.target.value as Discrepancy["type"] } : x)))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                {(["OMISSION", "COMMISSION", "DOSE", "FREQUENCY", "OTHER"] as const).map((type) => (
                  <option key={type} value={type}>{t(`pharma.reconciliation.type.${type}`)}</option>
                ))}
              </select>
              <button type="button" onClick={() => setDiscrepancies((p) => p.filter((_, i) => i !== idx))} className="text-red-600 text-xs">
                {t("pharma.remove")}
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setDiscrepancies((p) => [...p, emptyDiscrepancy()])} className="text-sm text-teal-700">
            + {t("pharma.reconciliation.addDiscrepancy")}
          </button>
        </div>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder={t("pharma.reconciliation.notes")}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-50"
        >
          <Save size={14} />
          {saving ? t("pharma.saving") : t("pharma.reconciliation.save")}
        </button>
      </div>

      <div>
        <h3 className="font-semibold text-slate-900 mb-3">{t("pharma.reconciliation.history")}</h3>
        {records.length === 0 ? (
          <p className="text-sm text-slate-500">{t("pharma.reconciliation.noHistory")}</p>
        ) : (
          <ul className="space-y-3">
            {records.map((r) => (
              <li key={r.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm space-y-2">
                <div className="flex justify-between gap-2">
                  <span className="font-medium text-slate-800">{r.sourceContext}</span>
                  <span className="text-xs text-slate-500">{new Date(r.reconciledAt).toLocaleString()}</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="font-semibold text-slate-600 mb-1">{t("pharma.reconciliation.before")}</p>
                    {(r.medicationsBefore as MedicationItem[]).map((m, i) => (
                      <p key={i}>{m.name}{m.dosage ? ` — ${m.dosage}` : ""}</p>
                    ))}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-600 mb-1">{t("pharma.reconciliation.after")}</p>
                    {(r.medicationsAfter as MedicationItem[]).map((m, i) => (
                      <p key={i}>{m.name}{m.dosage ? ` — ${m.dosage}` : ""}</p>
                    ))}
                  </div>
                </div>
                {r.notes && <p className="text-slate-600">{r.notes}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
