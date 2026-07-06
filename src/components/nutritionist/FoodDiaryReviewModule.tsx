"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { BookOpen, Loader2 } from "lucide-react";
import type { NutritionChart } from "./NutritionChartWorkspace";

type DiaryEntry = {
  id: string;
  mealType: string;
  description: string;
  hydrationMl: number | null;
  recordedAt: string;
};

const MEAL_KEYS: Record<string, string> = {
  BREAKFAST: "nutri.mealType.breakfast",
  MORNING_SNACK: "nutri.mealType.morningSnack",
  LUNCH: "nutri.mealType.lunch",
  AFTERNOON_SNACK: "nutri.mealType.afternoonSnack",
  DINNER: "nutri.mealType.dinner",
  SUPPER: "nutri.mealType.supper",
  OTHER: "nutri.mealType.other",
};

export default function FoodDiaryReviewModule({ chart }: { chart: NutritionChart }) {
  const { t, lang } = useI18n();
  const locale = lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US";
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/nutritionist/charts/${chart.id}/food-diary`);
        const data = await res.json();
        setEntries(data.entries || []);
      } catch {
        setEntries([]);
      }
      setLoading(false);
    })();
  }, [chart.id]);

  const hydrationTotal = entries.reduce((s, e) => s + (e.hydrationMl ?? 0), 0);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-amber-500" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <BookOpen size={16} className="text-amber-600" />
          {entries.length} {t("nutri.diary.entries")}
        </div>
        <div className="text-sm font-medium text-slate-800">
          {t("nutri.diary.hydrationTotal")}: {hydrationTotal} ml
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-8 rounded-2xl border border-slate-200 bg-white">
          {t("nutri.diary.empty")}
        </p>
      ) : (
        <ul className="space-y-3">
          {entries.map((e) => (
            <li key={e.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                  {t(MEAL_KEYS[e.mealType] ?? "nutri.mealType.other")}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(e.recordedAt).toLocaleString(locale)}
                </span>
              </div>
              <p className="text-sm text-slate-800 whitespace-pre-wrap">{e.description}</p>
              {e.hydrationMl != null && e.hydrationMl > 0 && (
                <p className="text-xs text-slate-500 mt-2">
                  {t("nutri.patient.hydration")}: {e.hydrationMl} ml
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
