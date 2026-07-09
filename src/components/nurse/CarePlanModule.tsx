"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Loader2, Plus, Save } from "lucide-react";
import { NURSING_DIAGNOSES } from "@/lib/nursing/diagnoses";
import type { CarePlanIntervention } from "@/lib/nursing/care-plan-types";
import type { NurseChart } from "./NurseChartWorkspace";
import { useVoiceFormPrefill, VoicePrefillBanner } from "@/components/voice-assistant/useVoiceFormPrefill";
import type { CarePlanPrefill } from "@/lib/voice-assistant/types";

type CarePlan = {
  id: string;
  title: string;
  diagnoses: { id: string; code?: string; label?: string }[];
  interventions: CarePlanIntervention[];
  isActive: boolean;
  createdAt: string;
};

export default function CarePlanModule({ chart }: { chart: NurseChart }) {
  const { t } = useI18n();
  const [plans, setPlans] = useState<CarePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedDx, setSelectedDx] = useState<string[]>([]);
  const [interventionText, setInterventionText] = useState("");
  const [notes, setNotes] = useState("");

  const { voicePrefillActive } = useVoiceFormPrefill({
    formType: "care_plan",
    chartId: chart.id,
    onApply: (data) => {
      const d = data as CarePlanPrefill;
      if (d.title) setTitle(d.title);
      if (d.interventionText) setInterventionText(d.interventionText);
      if (d.notes) setNotes(d.notes);
      if (d.diagnosisLabels?.length) {
        const ids = d.diagnosisLabels
          .map((label) => {
            const match = NURSING_DIAGNOSES.find((dx) =>
              label.toLowerCase().includes(dx.code.toLowerCase()) ||
              label.toLowerCase().includes(t(dx.labelKey).toLowerCase()),
            );
            return match?.id;
          })
          .filter(Boolean) as string[];
        if (ids.length) setSelectedDx(ids);
      }
    },
  });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/nurse/charts/${chart.id}/care-plans`);
      const data = await res.json();
      setPlans(data.plans || []);
    } catch {
      setPlans([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [chart.id]);

  function toggleDx(id: string) {
    setSelectedDx((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function createPlan() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const diagnoses = selectedDx.map((id) => {
        const dx = NURSING_DIAGNOSES.find((d) => d.id === id);
        return { id, code: dx?.code, label: dx ? t(dx.labelKey) : undefined };
      });
      const interventions: CarePlanIntervention[] = interventionText
        .split("\n")
        .filter(Boolean)
        .map((desc, i) => ({ id: `int-${i}`, description: desc }));

      await fetch(`/api/nurse/charts/${chart.id}/care-plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, diagnoses, interventions, notes: notes || undefined }),
      });
      setTitle("");
      setSelectedDx([]);
      setInterventionText("");
      setNotes("");
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
      <VoicePrefillBanner active={voicePrefillActive} />
      <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 space-y-4">
        <h3 className="font-semibold text-slate-900">{t("nurse.carePlan.new")}</h3>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("nurse.carePlan.title")}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">{t("nurse.carePlan.diagnoses")}</p>
          <ul className="max-h-40 overflow-y-auto space-y-1">
            {NURSING_DIAGNOSES.map((dx) => (
              <li key={dx.id}>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={selectedDx.includes(dx.id)} onChange={() => toggleDx(dx.id)} />
                  {t(dx.labelKey)}
                </label>
              </li>
            ))}
          </ul>
        </div>
        <textarea
          value={interventionText}
          onChange={(e) => setInterventionText(e.target.value)}
          rows={4}
          placeholder={t("nurse.carePlan.interventionsHint")}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder={t("nurse.carePlan.notes")}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={createPlan}
          disabled={saving || !title.trim()}
          className="rounded-xl bg-rose-600 text-white px-4 py-2 text-sm font-medium hover:bg-rose-700 disabled:opacity-50 flex items-center gap-2"
        >
          <Save size={16} />
          {saving ? t("nurse.saving") : t("nurse.carePlan.save")}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 font-semibold text-slate-900">
          {t("nurse.carePlan.history")}
        </div>
        {plans.length === 0 ? (
          <p className="text-sm text-slate-500 p-6 text-center">{t("nurse.carePlan.empty")}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {plans.map((p) => (
              <li key={p.id} className="px-4 py-3 space-y-1">
                <p className="font-medium text-slate-800">{p.title}</p>
                <p className="text-xs text-slate-500">{new Date(p.createdAt).toLocaleString()}</p>
                {p.diagnoses.length > 0 && (
                  <p className="text-sm text-slate-600">
                    {p.diagnoses.map((d) => d.label || d.id).join(", ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
