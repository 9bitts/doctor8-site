"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { BookOpen, ClipboardList, Loader2, Plus } from "lucide-react";
import { NUTRITION_INTAKE_QUESTIONS } from "@/lib/nutrition/intake-questions";

type Chart = {
  id: string;
  professional: { firstName: string; lastName: string };
};

type DiaryEntry = {
  id: string;
  mealType: string;
  description: string;
  hydrationMl: number | null;
  recordedAt: string;
};

type PendingIntake = {
  id: string;
  chartId: string;
  sentAt: string;
  professionalName: string;
};

const MEAL_TYPES = [
  "BREAKFAST",
  "MORNING_SNACK",
  "LUNCH",
  "AFTERNOON_SNACK",
  "DINNER",
  "SUPPER",
  "OTHER",
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

export default function PatientNutritionClient() {
  const { t, lang } = useI18n();
  const locale = lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US";
  const [charts, setCharts] = useState<Chart[]>([]);
  const [chartId, setChartId] = useState("");
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [pending, setPending] = useState<PendingIntake[]>([]);
  const [activeIntake, setActiveIntake] = useState<string | null>(null);
  const [intakeAnswers, setIntakeAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mealType, setMealType] = useState<(typeof MEAL_TYPES)[number]>("BREAKFAST");
  const [description, setDescription] = useState("");
  const [hydrationMl, setHydrationMl] = useState("");

  async function loadCharts() {
    const res = await fetch("/api/patient/nutrition/charts");
    const data = await res.json();
    const list: Chart[] = data.charts || [];
    setCharts(list);
    if (!chartId && list[0]) setChartId(list[0].id);
  }

  async function loadDiary(id: string) {
    if (!id) return;
    const res = await fetch(`/api/patient/nutrition/diary?chartId=${encodeURIComponent(id)}`);
    const data = await res.json();
    setEntries(data.entries || []);
  }

  async function loadPending() {
    const res = await fetch("/api/patient/nutrition/intake");
    const data = await res.json();
    setPending(data.forms || []);
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadCharts(), loadPending()]);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (chartId) loadDiary(chartId);
  }, [chartId]);

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
        }),
      });
      setDescription("");
      setHydrationMl("");
      await loadDiary(chartId);
    } finally {
      setSaving(false);
    }
  }

  async function submitIntake(id: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/patient/nutrition/intake/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses: intakeAnswers }),
      });
      if (res.ok) {
        setActiveIntake(null);
        setIntakeAnswers({});
        await loadPending();
      }
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
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("nutri.patient.title")}</h1>
        <p className="text-slate-600 mt-2">{t("nutri.patient.subtitle")}</p>
      </div>

      {pending.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 space-y-3">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <ClipboardList size={18} className="text-amber-600" />
            {t("nutri.patient.intakePending")}
          </h2>
          {pending.map((f) =>
            activeIntake === f.id ? (
              <div key={f.id} className="rounded-xl bg-white border border-slate-200 p-4 space-y-3">
                <p className="text-sm text-slate-600">{f.professionalName}</p>
                {NUTRITION_INTAKE_QUESTIONS.map((q) => (
                  <label key={q.id} className="block space-y-1 text-sm">
                    <span className="font-medium text-slate-700">{t(q.labelKey)}</span>
                    {q.type === "select" && q.options ? (
                      <select
                        value={intakeAnswers[q.id] ?? ""}
                        onChange={(e) =>
                          setIntakeAnswers((a) => ({ ...a, [q.id]: e.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-2"
                      >
                        <option value="">—</option>
                        {q.options.map((o) => (
                          <option key={o.value} value={o.value}>
                            {t(o.labelKey)}
                          </option>
                        ))}
                      </select>
                    ) : q.type === "yesno" ? (
                      <select
                        value={intakeAnswers[q.id] ?? ""}
                        onChange={(e) =>
                          setIntakeAnswers((a) => ({ ...a, [q.id]: e.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-2"
                      >
                        <option value="">—</option>
                        <option value="yes">{t("nutri.yes")}</option>
                        <option value="no">{t("nutri.no")}</option>
                      </select>
                    ) : (
                      <input
                        type={q.type === "number" ? "number" : "text"}
                        value={intakeAnswers[q.id] ?? ""}
                        onChange={(e) =>
                          setIntakeAnswers((a) => ({ ...a, [q.id]: e.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-2"
                      />
                    )}
                  </label>
                ))}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => submitIntake(f.id)}
                    disabled={saving}
                    className="rounded-xl bg-amber-600 text-white px-4 py-2 text-sm font-medium"
                  >
                    {saving ? t("nutri.saving") : t("nutri.intake.submit")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveIntake(null)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm"
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              </div>
            ) : (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveIntake(f.id)}
                className="w-full text-left rounded-xl bg-white border border-amber-200 px-4 py-3 text-sm hover:bg-amber-50"
              >
                {t("nutri.patient.completeIntake")} — {f.professionalName}
              </button>
            ),
          )}
        </section>
      )}

      <section className="space-y-4">
        <label className="block text-sm font-medium text-slate-700">
          {t("nutri.patient.selectNutritionist")}
          <select
            value={chartId}
            onChange={(e) => setChartId(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          >
            {charts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.professional.firstName} {c.professional.lastName}
              </option>
            ))}
          </select>
        </label>

        <form onSubmit={submitDiary} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <Plus size={16} />
            {t("nutri.patient.addMeal")}
          </h2>
          <select
            value={mealType}
            onChange={(e) => setMealType(e.target.value as (typeof MEAL_TYPES)[number])}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            {MEAL_TYPES.map((mt) => (
              <option key={mt} value={mt}>
                {t(MEAL_KEYS[mt])}
              </option>
            ))}
          </select>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("nutri.patient.mealPlaceholder")}
            rows={3}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            required
          />
          <input
            type="number"
            value={hydrationMl}
            onChange={(e) => setHydrationMl(e.target.value)}
            placeholder={t("nutri.patient.hydration")}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-brand-600 text-white px-4 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {saving ? t("nutri.saving") : t("nutri.save")}
          </button>
        </form>
      </section>

      <section>
        <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-3">
          <BookOpen size={18} />
          {t("nutri.patient.diary")}
        </h2>
        {entries.length === 0 ? (
          <p className="text-sm text-slate-500">{t("nutri.diary.empty")}</p>
        ) : (
          <ul className="space-y-3">
            {entries.map((e) => (
              <li key={e.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>{t(MEAL_KEYS[e.mealType] ?? "nutri.mealType.other")}</span>
                  <span>{new Date(e.recordedAt).toLocaleString(locale)}</span>
                </div>
                <p className="text-slate-800 whitespace-pre-wrap">{e.description}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
