"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { BookOpen, Loader2, TrendingUp } from "lucide-react";
import type { AdherenceReport } from "@/lib/nutrition/adherence";
import type { NutritionChart } from "./NutritionChartWorkspace";

type DiaryEntry = {
  id: string;
  mealType: string;
  description: string;
  hydrationMl: number | null;
  photoKey: string | null;
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

function DiaryPhoto({ chartId, entryId }: { chartId: string; entryId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    fetch(`/api/nutritionist/charts/${chartId}/food-diary/${entryId}/photo`)
      .then((r) => r.json())
      .then((d) => setUrl(d.url || null))
      .catch(() => setUrl(null));
  }, [chartId, entryId]);
  if (!url) return null;
  return (
    <img src={url} alt="" className="mt-2 rounded-lg max-h-40 object-cover border border-slate-100" />
  );
}

export default function FoodDiaryReviewModule({ chart }: { chart: NutritionChart }) {
  const { t, lang } = useI18n();
  const locale = lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US";
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [adherence, setAdherence] = useState<AdherenceReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [diaryRes, adhRes] = await Promise.all([
          fetch(`/api/nutritionist/charts/${chart.id}/food-diary`),
          fetch(`/api/nutritionist/charts/${chart.id}/adherence`),
        ]);
        const diary = await diaryRes.json();
        const adh = await adhRes.json();
        setEntries(diary.entries || []);
        setAdherence(adh.report ?? null);
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
      {adherence && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 grid sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-slate-500 text-xs flex items-center gap-1">
              <TrendingUp size={12} /> {t("nutri.adherence.score")}
            </p>
            <p className="text-2xl font-bold text-amber-700">{adherence.score}%</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">{t("nutri.adherence.daysLogged")}</p>
            <p className="font-semibold">{adherence.daysLogged}/{adherence.periodDays}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">{t("nutri.adherence.mealsLogged")}</p>
            <p className="font-semibold">{adherence.mealsLogged}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">{t("nutri.adherence.hydrationAvg")}</p>
            <p className="font-semibold">{adherence.hydrationMlAvg} ml</p>
          </div>
        </div>
      )}

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
              {e.photoKey && <DiaryPhoto chartId={chart.id} entryId={e.id} />}
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
