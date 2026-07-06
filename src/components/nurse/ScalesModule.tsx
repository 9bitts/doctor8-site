"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Loader2, Plus } from "lucide-react";
import {
  NURSING_SCALES,
  calcBradenScore,
  calcGlasgowScore,
  calcMorseScore,
  bradenRiskLevel,
  morseRiskLevel,
  glasgowSeverity,
} from "@/lib/nursing/scales";
import type { NursingScaleType } from "@prisma/client";
import type { NurseChart } from "./NurseChartWorkspace";

type ScaleEntry = {
  id: string;
  scaleType: NursingScaleType;
  score: number;
  recordedAt: string;
};

export default function ScalesModule({ chart }: { chart: NurseChart }) {
  const { t } = useI18n();
  const [entries, setEntries] = useState<ScaleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scaleType, setScaleType] = useState<NursingScaleType>("BRADEN");
  const [painValue, setPainValue] = useState(0);
  const [braden, setBraden] = useState({ sensory: 3, moisture: 3, activity: 3, mobility: 3, nutrition: 3, friction: 2 });
  const [morse, setMorse] = useState({ historyOfFalling: 0, secondaryDiagnosis: 0, ambulatoryAid: 0, ivTherapy: 0, gait: 0, mentalStatus: 0 });
  const [glasgow, setGlasgow] = useState({ eye: 4, verbal: 5, motor: 6 });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/nurse/charts/${chart.id}/scales`);
      const data = await res.json();
      setEntries(data.entries || []);
    } catch {
      setEntries([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [chart.id]);

  async function applyScale() {
    setSaving(true);
    let details: Record<string, unknown> = {};
    if (scaleType === "BRADEN") details = braden;
    else if (scaleType === "MORSE") details = morse;
    else if (scaleType === "PAIN") details = { value: painValue };
    else details = glasgow;

    try {
      await fetch(`/api/nurse/charts/${chart.id}/scales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scaleType, details }),
      });
      await load();
    } finally {
      setSaving(false);
    }
  }

  function riskLabel(type: NursingScaleType, score: number): string | null {
    if (type === "BRADEN") return t(`nurse.scale.risk.${bradenRiskLevel(score)}`);
    if (type === "MORSE") return t(`nurse.scale.risk.${morseRiskLevel(score)}`);
    if (type === "GLASGOW") return t(`nurse.scale.risk.${glasgowSeverity(score)}`);
    return null;
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-rose-500" size={24} />
      </div>
    );
  }

  const previewScore =
    scaleType === "BRADEN" ? calcBradenScore(braden)
    : scaleType === "MORSE" ? calcMorseScore(morse)
    : scaleType === "PAIN" ? painValue
    : calcGlasgowScore(glasgow);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 space-y-4">
        <h3 className="font-semibold text-slate-900">{t("nurse.scale.apply")}</h3>
        <select
          value={scaleType}
          onChange={(e) => setScaleType(e.target.value as NursingScaleType)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        >
          {NURSING_SCALES.map((s) => (
            <option key={s.type} value={s.type}>{t(s.labelKey)}</option>
          ))}
        </select>

        {scaleType === "PAIN" && (
          <div>
            <label className="text-sm text-slate-600">{t("nurse.scale.painValue")}: {painValue}</label>
            <input type="range" min={0} max={10} value={painValue} onChange={(e) => setPainValue(Number(e.target.value))} className="w-full" />
          </div>
        )}

        {scaleType === "BRADEN" && (
          <div className="grid sm:grid-cols-2 gap-3">
            {(Object.keys(braden) as (keyof typeof braden)[]).map((key) => (
              <div key={key}>
                <label className="text-xs text-slate-500">{t(`nurse.scale.braden.${key}`)}</label>
                <input
                  type="number"
                  min={1}
                  max={4}
                  value={braden[key]}
                  onChange={(e) => setBraden((b) => ({ ...b, [key]: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                />
              </div>
            ))}
          </div>
        )}

        {scaleType === "MORSE" && (
          <div className="grid sm:grid-cols-2 gap-3">
            {(Object.keys(morse) as (keyof typeof morse)[]).map((key) => (
              <div key={key}>
                <label className="text-xs text-slate-500">{t(`nurse.scale.morse.${key}`)}</label>
                <input
                  type="number"
                  min={0}
                  max={25}
                  value={morse[key]}
                  onChange={(e) => setMorse((m) => ({ ...m, [key]: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                />
              </div>
            ))}
          </div>
        )}

        {scaleType === "GLASGOW" && (
          <div className="grid sm:grid-cols-3 gap-3">
            {(Object.keys(glasgow) as (keyof typeof glasgow)[]).map((key) => (
              <div key={key}>
                <label className="text-xs text-slate-500">{t(`nurse.scale.glasgow.${key}`)}</label>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={glasgow[key]}
                  onChange={(e) => setGlasgow((g) => ({ ...g, [key]: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                />
              </div>
            ))}
          </div>
        )}

        <p className="text-sm text-slate-700">
          {t("nurse.scale.score")}: <strong>{previewScore}</strong>
          {riskLabel(scaleType, previewScore) && ` — ${riskLabel(scaleType, previewScore)}`}
        </p>

        <button
          type="button"
          onClick={applyScale}
          disabled={saving}
          className="rounded-xl bg-rose-600 text-white px-4 py-2 text-sm font-medium hover:bg-rose-700 disabled:opacity-50 flex items-center gap-2"
        >
          <Plus size={16} />
          {saving ? t("nurse.saving") : t("nurse.scale.record")}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 font-semibold text-slate-900">
          {t("nurse.scale.history")}
        </div>
        {entries.length === 0 ? (
          <p className="text-sm text-slate-500 p-6 text-center">{t("nurse.scale.empty")}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {entries.map((e) => (
              <li key={e.id} className="px-4 py-3 flex justify-between text-sm">
                <span className="font-medium text-slate-800">{t(`nurse.scale.${e.scaleType.toLowerCase()}`)}</span>
                <span className="text-slate-600">
                  {e.score} — {new Date(e.recordedAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
