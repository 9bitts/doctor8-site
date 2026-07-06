"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { BookOpen, ClipboardList, FileText, Loader2, Plus, TrendingUp } from "lucide-react";
import { NUTRITION_INTAKE_QUESTIONS } from "@/lib/nutrition/intake-questions";
import type { MealPlanMeal } from "@/lib/nutrition/meal-plan-types";
import { sumMealPlanMacros } from "@/lib/nutrition/meal-plan-types";

type Chart = {
  id: string;
  professional: { firstName: string; lastName: string };
};

type DiaryEntry = {
  id: string;
  mealType: string;
  description: string;
  hydrationMl: number | null;
  photoKey: string | null;
  recordedAt: string;
};

type MealPlan = {
  id: string;
  title: string;
  notes: string | null;
  dailyKcalTarget: number | null;
  meals: MealPlanMeal[];
};

type AnthroEntry = {
  recordedAt: string;
  weightKg: number | null;
  bmi: number | null;
};

const MEAL_TYPES = [
  "BREAKFAST", "MORNING_SNACK", "LUNCH", "AFTERNOON_SNACK", "DINNER", "SUPPER", "OTHER",
] as const;

const MEAL_KEYS: Record<string, string> = {
  BREAKFAST: "nutri.mealType.breakfast",
  MORNING_SNACK: "nutri.mealType.morningSnack",
  LUNCH: "nutri.mealType.lunch",
  AFTERNOON_SNACK: "nutri.mealType.afternoonSnack",
  DINNER: "nutri.mealType.dinner",
  SUPPER: "nutri.mealType.supper",
  OTHER: "nutri.mealType.other",
};

function PatientDiaryPhoto({ entryId }: { entryId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    fetch(`/api/patient/nutrition/diary/${entryId}/photo`)
      .then((r) => r.json())
      .then((d) => setUrl(d.url || null))
      .catch(() => setUrl(null));
  }, [entryId]);
  if (!url) return null;
  return <img src={url} alt="" className="mt-2 rounded-lg max-h-48 object-cover" />;
}

export default function PatientNutritionClient() {
  const { t, lang } = useI18n();
  const locale = lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US";
  const [tab, setTab] = useState<"diary" | "plans" | "evolution">("diary");
  const [charts, setCharts] = useState<Chart[]>([]);
  const [chartId, setChartId] = useState("");
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [anthro, setAnthro] = useState<AnthroEntry[]>([]);
  const [pending, setPending] = useState<{ id: string; chartId: string; professionalName: string }[]>([]);
  const [activeIntake, setActiveIntake] = useState<string | null>(null);
  const [intakeAnswers, setIntakeAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mealType, setMealType] = useState<(typeof MEAL_TYPES)[number]>("BREAKFAST");
  const [description, setDescription] = useState("");
  const [hydrationMl, setHydrationMl] = useState("");
  const [photoKey, setPhotoKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function loadCharts() {
    const res = await fetch("/api/patient/nutrition/charts");
    const data = await res.json();
    const list: Chart[] = data.charts || [];
    setCharts(list);
    if (!chartId && list[0]) setChartId(list[0].id);
  }

  async function loadChartData(id: string) {
    if (!id) return;
    const [diaryRes, plansRes, anthroRes] = await Promise.all([
      fetch(`/api/patient/nutrition/diary?chartId=${encodeURIComponent(id)}`),
      fetch(`/api/patient/nutrition/meal-plans?chartId=${encodeURIComponent(id)}`),
      fetch(`/api/patient/nutrition/anthropometry?chartId=${encodeURIComponent(id)}`),
    ]);
    const [diary, plansData, anthroData] = await Promise.all([
      diaryRes.json(),
      plansRes.json(),
      anthroRes.json(),
    ]);
    setEntries(diary.entries || []);
    setPlans(plansData.plans || []);
    setAnthro(anthroData.entries || []);
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([
        loadCharts(),
        fetch("/api/patient/nutrition/intake").then((r) => r.json()).then((d) => setPending(d.forms || [])),
      ]);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (chartId) loadChartData(chartId);
  }, [chartId]);

  async function handlePhoto(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "nutrition-diary");
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const data = await res.json();
      if (data.key) setPhotoKey(data.key);
    } finally {
      setUploading(false);
    }
  }

  async function submitDiary(e: React.FormEvent) {
    e.preventDefault();
    if (!chartId || !description.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/patient/nutrition/diary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chartId,
          mealType,
          description: description.trim(),
          hydrationMl: hydrationMl ? parseInt(hydrationMl, 10) : undefined,
          photoKey: photoKey ?? undefined,
        }),
      });
      setDescription("");
      setHydrationMl("");
      setPhotoKey(null);
      await loadChartData(chartId);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-brand-500" size={28} />
      </div>
    );
  }

  if (charts.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 text-center">
        <h1 className="text-2xl font-bold text-slate-900">{t("nutri.patient.title")}</h1>
        <p className="text-slate-600 mt-3">{t("nutri.patient.noNutritionist")}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("nutri.patient.title")}</h1>
        <p className="text-slate-600 mt-2">{t("nutri.patient.subtitle")}</p>
      </div>

      <select
        value={chartId}
        onChange={(e) => setChartId(e.target.value)}
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
      >
        {charts.map((c) => (
          <option key={c.id} value={c.id}>
            {c.professional.firstName} {c.professional.lastName}
          </option>
        ))}
      </select>

      <div className="flex gap-2">
        {(["diary", "plans", "evolution"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium border ${
              tab === id ? "bg-brand-600 text-white border-brand-600" : "bg-white border-slate-200 text-slate-600"
            }`}
          >
            {id === "diary" ? t("nutri.patient.diary") : id === "plans" ? t("nutri.patient.myPlans") : t("nutri.patient.evolution")}
          </button>
        ))}
      </div>

      {pending.length > 0 && tab === "diary" && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-2">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <ClipboardList size={16} className="text-amber-600" />
            {t("nutri.patient.intakePending")}
          </h2>
          {pending.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveIntake(f.id)}
              className="w-full text-left rounded-lg bg-white border px-3 py-2 text-sm"
            >
              {t("nutri.patient.completeIntake")} — {f.professionalName}
            </button>
          ))}
        </section>
      )}

      {activeIntake && (
        <div className="rounded-xl border bg-white p-4 space-y-2 text-sm">
          {NUTRITION_INTAKE_QUESTIONS.map((q) => (
            <label key={q.id} className="block">
              <span className="font-medium">{t(q.labelKey)}</span>
              <input
                className="w-full mt-1 rounded-lg border px-2 py-1.5"
                value={intakeAnswers[q.id] ?? ""}
                onChange={(e) => setIntakeAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
              />
            </label>
          ))}
          <button
            type="button"
            onClick={async () => {
              setSaving(true);
              await fetch(`/api/patient/nutrition/intake/${activeIntake}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ responses: intakeAnswers }),
              });
              setActiveIntake(null);
              setSaving(false);
            }}
            className="rounded-lg bg-amber-600 text-white px-3 py-2"
          >
            {t("nutri.intake.submit")}
          </button>
        </div>
      )}

      {tab === "diary" && (
        <>
          <form onSubmit={submitDiary} className="rounded-2xl border bg-white p-5 space-y-3">
            <h2 className="font-semibold flex items-center gap-2">
              <Plus size={16} /> {t("nutri.patient.addMeal")}
            </h2>
            <select value={mealType} onChange={(e) => setMealType(e.target.value as typeof mealType)} className="w-full rounded-lg border px-3 py-2 text-sm">
              {MEAL_TYPES.map((mt) => (
                <option key={mt} value={mt}>{t(MEAL_KEYS[mt])}</option>
              ))}
            </select>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} required className="w-full rounded-lg border px-3 py-2 text-sm" placeholder={t("nutri.patient.mealPlaceholder")} />
            <input type="number" value={hydrationMl} onChange={(e) => setHydrationMl(e.target.value)} placeholder={t("nutri.patient.hydration")} className="w-full rounded-lg border px-3 py-2 text-sm" />
            <label className="block text-sm">
              <span className="text-slate-600">{t("nutri.patient.photo")}</span>
              <input type="file" accept="image/*" className="mt-1 text-sm" onChange={(e) => e.target.files?.[0] && handlePhoto(e.target.files[0])} />
              {uploading && <span className="text-xs text-slate-400 ml-2">{t("nutri.saving")}</span>}
              {photoKey && <span className="text-xs text-emerald-600 ml-2">OK</span>}
            </label>
            <button type="submit" disabled={saving} className="rounded-xl bg-brand-600 text-white px-4 py-2 text-sm">{saving ? t("nutri.saving") : t("nutri.save")}</button>
          </form>
          <ul className="space-y-3">
            {entries.map((e) => (
              <li key={e.id} className="rounded-xl border bg-white p-4 text-sm">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>{t(MEAL_KEYS[e.mealType] ?? "nutri.mealType.other")}</span>
                  <span>{new Date(e.recordedAt).toLocaleString(locale)}</span>
                </div>
                <p className="whitespace-pre-wrap">{e.description}</p>
                {e.photoKey && <PatientDiaryPhoto entryId={e.id} />}
              </li>
            ))}
          </ul>
        </>
      )}

      {tab === "plans" && (
        <div className="space-y-4">
          {plans.length === 0 ? (
            <p className="text-sm text-slate-500">{t("nutri.meal.noPlans")}</p>
          ) : (
            plans.map((p) => {
              const totals = sumMealPlanMacros(p.meals);
              return (
                <article key={p.id} className="rounded-2xl border bg-white p-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <FileText size={16} className="text-amber-600" />
                    {p.title}
                  </h3>
                  {p.notes && <p className="text-sm text-slate-600 mt-2">{p.notes}</p>}
                  <p className="text-xs text-slate-500 mt-2">{Math.round(totals.kcal)} kcal · P {totals.proteinG.toFixed(0)}g</p>
                  <ul className="mt-3 space-y-2 text-sm">
                    {p.meals.map((m) => (
                      <li key={m.name}>
                        <p className="font-medium text-amber-800">{m.name}</p>
                        <ul className="text-slate-600 pl-3">
                          {m.items.map((i, idx) => (
                            <li key={idx}>{i.foodName} — {i.portionG}g</li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })
          )}
        </div>
      )}

      {tab === "evolution" && (
        <div className="rounded-2xl border bg-white p-4">
          <h2 className="font-semibold flex items-center gap-2 mb-3">
            <TrendingUp size={16} /> {t("nutri.patient.evolution")}
          </h2>
          {anthro.length === 0 ? (
            <p className="text-sm text-slate-500">{t("nutri.anthro.empty")}</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {anthro.map((e, i) => (
                <li key={i} className="flex justify-between border-b border-slate-50 py-1">
                  <span>{new Date(e.recordedAt).toLocaleDateString(locale)}</span>
                  <span>{e.weightKg != null ? `${e.weightKg} kg` : "—"} · IMC {e.bmi ?? "—"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
