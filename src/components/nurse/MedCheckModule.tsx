"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { CheckCircle2, Loader2, AlertTriangle, XCircle } from "lucide-react";
import type { NurseChart } from "./NurseChartWorkspace";

type PendingItem = {
  sourceType: "MEDICAL_PRESCRIPTION" | "NURSING_MEDICATION_PRESCRIPTION";
  prescriptionId: string;
  medicationName: string;
  snapshot: Record<string, unknown>;
  prescriber: string | null;
  alreadyChecked: boolean;
};

type MedCheck = {
  id: string;
  medicationName: string;
  result: string;
  checkedAt: string;
  nurseName: string;
  divergenceReason: string | null;
};

const RIGHT_KEYS = ["patient", "medication", "dose", "route", "time", "documentation"] as const;

export default function MedCheckModule({ chart }: { chart: NurseChart }) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [checks, setChecks] = useState<MedCheck[]>([]);
  const [selected, setSelected] = useState<PendingItem | null>(null);
  const [sixRights, setSixRights] = useState<Record<string, boolean>>({
    patient: false, medication: false, dose: false, route: false, time: false, documentation: false,
  });
  const [result, setResult] = useState<"APPROVED" | "DIVERGENCE" | "NOT_ADMINISTERED">("APPROVED");
  const [divergenceReason, setDivergenceReason] = useState("");
  const [notes, setNotes] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/nurse/charts/${chart.id}/med-checks`);
      const data = await res.json();
      const items: PendingItem[] = [
        ...(data.medical || []).filter((m: PendingItem) => !m.alreadyChecked),
        ...(data.nursing || []).filter((n: PendingItem) => !n.alreadyChecked),
      ];
      setPending(items);
      setChecks(data.checks || []);
    } catch {
      setPending([]);
      setChecks([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [chart.id]);

  function toggleRight(key: string) {
    setSixRights((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function submitCheck() {
    if (!selected) return;
    setSaving(true);
    try {
      await fetch(`/api/nurse/charts/${chart.id}/med-checks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType: selected.sourceType,
          medicalPrescriptionId: selected.sourceType === "MEDICAL_PRESCRIPTION" ? selected.prescriptionId : undefined,
          nursingMedPrescriptionId: selected.sourceType === "NURSING_MEDICATION_PRESCRIPTION" ? selected.prescriptionId : undefined,
          medicationName: selected.medicationName,
          medicationSnapshot: selected.snapshot,
          sixRights,
          result,
          divergenceReason: result === "DIVERGENCE" ? divergenceReason : undefined,
          notes: notes || undefined,
        }),
      });
      setSelected(null);
      setResult("APPROVED");
      setDivergenceReason("");
      setNotes("");
      setSixRights({ patient: false, medication: false, dose: false, route: false, time: false, documentation: false });
      await load();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-rose-500" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5">
        <h3 className="font-semibold text-slate-900 mb-1">{t("nurse.medCheck.title")}</h3>
        <p className="text-sm text-slate-600 mb-4">{t("nurse.medCheck.desc")}</p>

        {pending.length === 0 ? (
          <p className="text-sm text-slate-500">{t("nurse.medCheck.noPending")}</p>
        ) : (
          <ul className="space-y-2">
            {pending.map((item) => (
              <li key={`${item.sourceType}-${item.prescriptionId}-${item.medicationName}`}>
                <button
                  type="button"
                  onClick={() => setSelected(item)}
                  className={`w-full text-left rounded-xl border px-4 py-3 text-sm transition ${
                    selected?.prescriptionId === item.prescriptionId && selected.medicationName === item.medicationName
                      ? "border-rose-400 bg-white ring-2 ring-rose-200"
                      : "border-slate-200 bg-white hover:border-rose-200"
                  }`}
                >
                  <p className="font-medium text-slate-900">{item.medicationName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {item.sourceType === "MEDICAL_PRESCRIPTION" ? t("nurse.medCheck.sourceMedical") : t("nurse.medCheck.sourceNursing")}
                    {item.prescriber ? ` · ${item.prescriber}` : ""}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <h4 className="font-semibold text-slate-900">{t("nurse.medCheck.perform")}: {selected.medicationName}</h4>
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">{t("nurse.medCheck.sixRights")}</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {RIGHT_KEYS.map((key) => (
                <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={!!sixRights[key]} onChange={() => toggleRight(key)} />
                  {t(`nurse.medCheck.right.${key}`)}
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">{t("nurse.medCheck.result")}</p>
            <div className="flex flex-wrap gap-2">
              {(["APPROVED", "DIVERGENCE", "NOT_ADMINISTERED"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setResult(r)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold border ${
                    result === r
                      ? r === "APPROVED"
                        ? "bg-emerald-100 border-emerald-400 text-emerald-800"
                        : r === "DIVERGENCE"
                          ? "bg-amber-100 border-amber-400 text-amber-800"
                          : "bg-red-100 border-red-400 text-red-800"
                      : "border-slate-200 text-slate-600"
                  }`}
                >
                  {t(`nurse.medCheck.result.${r}`)}
                </button>
              ))}
            </div>
          </div>
          {result === "DIVERGENCE" && (
            <textarea
              value={divergenceReason}
              onChange={(e) => setDivergenceReason(e.target.value)}
              rows={2}
              placeholder={t("nurse.medCheck.divergenceHint")}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          )}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder={t("nurse.medCheck.notesHint")}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={submitCheck}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {saving ? t("nurse.saving") : t("nurse.medCheck.submit")}
          </button>
        </div>
      )}

      <div>
        <h3 className="font-semibold text-slate-900 mb-3">{t("nurse.medCheck.history")}</h3>
        {checks.length === 0 ? (
          <p className="text-sm text-slate-500">{t("nurse.medCheck.noHistory")}</p>
        ) : (
          <ul className="space-y-2">
            {checks.map((c) => (
              <li key={c.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm flex items-start gap-3">
                {c.result === "APPROVED" ? (
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                ) : c.result === "DIVERGENCE" ? (
                  <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-medium text-slate-900">{c.medicationName}</p>
                  <p className="text-xs text-slate-500">
                    {t(`nurse.medCheck.result.${c.result}`)} · {c.nurseName} · {new Date(c.checkedAt).toLocaleString()}
                  </p>
                  {c.divergenceReason && (
                    <p className="text-xs text-amber-700 mt-1">{c.divergenceReason}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
