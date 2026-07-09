"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Loader2, Plus, Save } from "lucide-react";
import type { NutritionChart } from "./NutritionChartWorkspace";
import { useVoiceFormPrefill, VoicePrefillBanner } from "@/components/voice-assistant/useVoiceFormPrefill";
import type { NutritionAnamnesisPrefill } from "@/lib/voice-assistant/types";

type RecallItem = { meal: string; time: string; foods: string; portion: string };

export default function FoodAnamnesisModule({ chart }: { chart: NutritionChart }) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<{ id: string; data: Record<string, unknown>; updatedAt: string }[]>([]);
  const [form, setForm] = useState({
    mealsPerDay: "",
    waterLiters: "",
    wakeTime: "",
    sleepTime: "",
    physicalActivity: "",
    dietaryRestrictions: "",
    allergies: "",
    medications: "",
    weightGoal: "",
    cookingHabits: "",
    weekendHabits: "",
    chiefComplaint: "",
    clinicalHistory: "",
    familyHistory: "",
    bowelHabits: "",
    alcoholUse: "",
    notes: "",
  });
  const [recall, setRecall] = useState<RecallItem[]>([
    { meal: "", time: "", foods: "", portion: "" },
  ]);

  const { voicePrefillActive } = useVoiceFormPrefill({
    formType: "nutrition_anamnesis",
    chartId: chart.id,
    onApply: (data) => {
      const d = data as NutritionAnamnesisPrefill;
      setForm((prev) => ({
        ...prev,
        ...(d.chiefComplaint ? { chiefComplaint: d.chiefComplaint } : {}),
        ...(d.clinicalHistory ? { clinicalHistory: d.clinicalHistory } : {}),
        ...(d.familyHistory ? { familyHistory: d.familyHistory } : {}),
        ...(d.allergies ? { allergies: d.allergies } : {}),
        ...(d.medications ? { medications: d.medications } : {}),
        ...(d.dietaryRestrictions ? { dietaryRestrictions: d.dietaryRestrictions } : {}),
        ...(d.physicalActivity ? { physicalActivity: d.physicalActivity } : {}),
        ...(d.weightGoal ? { weightGoal: d.weightGoal } : {}),
        ...(d.bowelHabits ? { bowelHabits: d.bowelHabits } : {}),
        ...(d.alcoholUse ? { alcoholUse: d.alcoholUse } : {}),
        ...(d.notes ? { notes: d.notes } : {}),
      }));
    },
  });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/nutritionist/charts/${chart.id}/anamnesis`);
      const data = await res.json();
      setHistory(data.entries || []);
    } catch {
      setHistory([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [chart.id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        ...Object.fromEntries(
          Object.entries(form).filter(([, v]) => v !== "").map(([k, v]) => {
            if (k === "mealsPerDay") return [k, parseInt(v, 10)];
            if (k === "waterLiters") return [k, parseFloat(v)];
            return [k, v];
          }),
        ),
        recall24h: recall.filter((r) => r.foods.trim()),
      };
      await fetch(`/api/nutritionist/charts/${chart.id}/anamnesis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await load();
    } finally {
      setSaving(false);
    }
  }

  const field = (key: keyof typeof form, labelKey: string, multiline = false) => (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-slate-600">{t(labelKey)}</span>
      {multiline ? (
        <textarea
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          rows={2}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      ) : (
        <input
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      )}
    </label>
  );

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-amber-500" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <VoicePrefillBanner active={voicePrefillActive} />
      <form onSubmit={handleSave} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <h3 className="font-semibold text-slate-900">{t("nutri.anam.fullTitle")}</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {field("mealsPerDay", "nutri.intake.mealsPerDay")}
          {field("waterLiters", "nutri.intake.waterLiters")}
          {field("wakeTime", "nutri.intake.wakeTime")}
          {field("sleepTime", "nutri.intake.sleepTime")}
          {field("physicalActivity", "nutri.intake.physicalActivity")}
          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-600">{t("nutri.intake.weightGoal")}</span>
            <select
              value={form.weightGoal}
              onChange={(e) => setForm((f) => ({ ...f, weightGoal: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">—</option>
              <option value="lose">{t("nutri.intake.goal.lose")}</option>
              <option value="maintain">{t("nutri.intake.goal.maintain")}</option>
              <option value="gain">{t("nutri.intake.goal.gain")}</option>
            </select>
          </label>
        </div>
        {field("dietaryRestrictions", "nutri.intake.dietaryRestrictions", true)}
        {field("allergies", "nutri.intake.allergies", true)}
        {field("medications", "nutri.intake.medications", true)}
        {field("cookingHabits", "nutri.intake.cookingHabits", true)}
        {field("weekendHabits", "nutri.intake.weekendHabits", true)}
        {field("bowelHabits", "nutri.anam.bowelHabits", true)}
        {field("alcoholUse", "nutri.anam.alcoholUse")}
        {field("chiefComplaint", "nutri.intake.chiefComplaint", true)}
        {field("clinicalHistory", "nutri.anam.clinicalHistory", true)}
        {field("familyHistory", "nutri.anam.familyHistory", true)}

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-slate-800">{t("nutri.anam.recall24h")}</h4>
          {recall.map((r, i) => (
            <div key={i} className="grid sm:grid-cols-4 gap-2">
              <input
                placeholder={t("nutri.anam.recallMeal")}
                value={r.meal}
                onChange={(e) =>
                  setRecall((prev) => prev.map((x, j) => (j === i ? { ...x, meal: e.target.value } : x)))
                }
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              />
              <input
                placeholder={t("nutri.anam.recallTime")}
                value={r.time}
                onChange={(e) =>
                  setRecall((prev) => prev.map((x, j) => (j === i ? { ...x, time: e.target.value } : x)))
                }
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              />
              <input
                placeholder={t("nutri.anam.recallFoods")}
                value={r.foods}
                onChange={(e) =>
                  setRecall((prev) => prev.map((x, j) => (j === i ? { ...x, foods: e.target.value } : x)))
                }
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm sm:col-span-2"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setRecall((p) => [...p, { meal: "", time: "", foods: "", portion: "" }])}
            className="text-xs text-amber-700 hover:underline flex items-center gap-1"
          >
            <Plus size={12} /> {t("nutri.anam.addRecall")}
          </button>
        </div>

        {field("notes", "nutri.anthro.notes", true)}
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-amber-600 text-white px-4 py-2.5 text-sm font-medium flex items-center gap-2 disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? t("nutri.saving") : t("nutri.save")}
        </button>
      </form>

      {history.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="font-semibold text-slate-900 mb-3">{t("nutri.anam.history")}</h3>
          <ul className="space-y-2 text-sm">
            {history.map((h) => (
              <li key={h.id} className="border-b border-slate-100 pb-2">
                <span className="text-slate-500">{new Date(h.updatedAt).toLocaleString()}</span>
                {typeof h.data.chiefComplaint === "string" && h.data.chiefComplaint && (
                  <p className="text-slate-800 mt-1">{h.data.chiefComplaint}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
