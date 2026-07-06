"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Loader2, Save } from "lucide-react";
import { NURSING_DIAGNOSES } from "@/lib/nursing/diagnoses";
import type { SaeData } from "@/lib/nursing/sae-types";
import type { NurseChart } from "./NurseChartWorkspace";

const STEPS = ["history", "assessment", "diagnoses", "plan", "implementation"] as const;

const emptySae = (): SaeData => ({
  history: {},
  assessment: {},
  diagnoses: [],
  plan: { interventions: [] },
  implementation: {},
});

export default function SaeModule({ chart }: { chart: NurseChart }) {
  const { t } = useI18n();
  const [step, setStep] = useState<(typeof STEPS)[number]>("history");
  const [data, setData] = useState<SaeData>(emptySae());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/nurse/charts/${chart.id}/assessments`);
        const json = await res.json();
        const latest = json.assessments?.[0];
        if (latest?.data) setData(latest.data as SaeData);
      } catch {
        /* ignore */
      }
      setLoading(false);
    })();
  }, [chart.id]);

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/nurse/charts/${chart.id}/assessments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      if (!res.ok) {
        setError(t("nurse.error"));
        return;
      }
    } catch {
      setError(t("nurse.error"));
    } finally {
      setSaving(false);
    }
  }

  function toggleDiagnosis(id: string) {
    setData((prev) => {
      const exists = prev.diagnoses.find((d) => d.id === id);
      if (exists) {
        return { ...prev, diagnoses: prev.diagnoses.filter((d) => d.id !== id) };
      }
      const dx = NURSING_DIAGNOSES.find((d) => d.id === id);
      if (!dx) return prev;
      return {
        ...prev,
        diagnoses: [...prev.diagnoses, { id: dx.id, code: dx.code, label: t(dx.labelKey) }],
      };
    });
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
      <div className="flex flex-wrap gap-2">
        {STEPS.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => setStep(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium border ${
              step === s
                ? "bg-rose-600 text-white border-rose-600"
                : "bg-white text-slate-600 border-slate-200"
            }`}
          >
            {i + 1}. {t(`nurse.sae.step.${s}`)}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        {step === "history" && (
          <>
            {(["chiefComplaint", "allergies", "medications", "pastHistory", "familyHistory", "socialHistory"] as const).map((field) => (
              <div key={field}>
                <label className="text-sm font-medium text-slate-700">{t(`nurse.sae.history.${field}`)}</label>
                <textarea
                  value={data.history[field] ?? ""}
                  onChange={(e) => setData((d) => ({ ...d, history: { ...d.history, [field]: e.target.value } }))}
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            ))}
          </>
        )}

        {step === "assessment" && (
          <>
            {(["generalAppearance", "vitalSigns", "skin", "respiratory", "cardiovascular", "neurological", "gastrointestinal", "notes"] as const).map((field) => (
              <div key={field}>
                <label className="text-sm font-medium text-slate-700">{t(`nurse.sae.assessment.${field}`)}</label>
                <textarea
                  value={data.assessment[field] ?? ""}
                  onChange={(e) => setData((d) => ({ ...d, assessment: { ...d.assessment, [field]: e.target.value } }))}
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            ))}
          </>
        )}

        {step === "diagnoses" && (
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {NURSING_DIAGNOSES.map((dx) => {
              const checked = data.diagnoses.some((d) => d.id === dx.id);
              return (
                <li key={dx.id}>
                  <label className="flex items-start gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleDiagnosis(dx.id)}
                      className="mt-1"
                    />
                    <span>
                      <span className="text-slate-400 text-xs">{dx.code}</span>{" "}
                      {t(dx.labelKey)}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        {step === "plan" && (
          <>
            <div>
              <label className="text-sm font-medium text-slate-700">{t("nurse.sae.plan.goals")}</label>
              <textarea
                value={data.plan.goals ?? ""}
                onChange={(e) => setData((d) => ({ ...d, plan: { ...d.plan, goals: e.target.value } }))}
                rows={3}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">{t("nurse.sae.plan.interventions")}</label>
              <textarea
                value={(data.plan.interventions ?? []).join("\n")}
                onChange={(e) => setData((d) => ({
                  ...d,
                  plan: { ...d.plan, interventions: e.target.value.split("\n").filter(Boolean) },
                }))}
                rows={4}
                placeholder={t("nurse.sae.plan.interventionsHint")}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </>
        )}

        {step === "implementation" && (
          <>
            {(["actions", "evaluation", "notes"] as const).map((field) => (
              <div key={field}>
                <label className="text-sm font-medium text-slate-700">{t(`nurse.sae.implementation.${field}`)}</label>
                <textarea
                  value={data.implementation[field] ?? ""}
                  onChange={(e) => setData((d) => ({ ...d, implementation: { ...d.implementation, [field]: e.target.value } }))}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            ))}
          </>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="rounded-xl bg-rose-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-rose-700 disabled:opacity-50 flex items-center gap-2"
      >
        <Save size={16} />
        {saving ? t("nurse.saving") : t("nurse.save")}
      </button>
    </div>
  );
}
