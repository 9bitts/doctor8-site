"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, RefreshCw, Search, User } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { fetchChartById, readChartDeepLink } from "@/lib/video-chart-nav";
import NoPatientChartsEmptyState from "@/components/professional/NoPatientChartsEmptyState";
import AnthropometryModule from "./AnthropometryModule";
import MealPlanModule from "./MealPlanModule";
import IntakeFormsModule from "./IntakeFormsModule";
import FoodDiaryReviewModule from "./FoodDiaryReviewModule";
import NutritionAnamneseTabs from "./NutritionAnamneseTabs";

export type NutritionChart = { id: string; firstName: string; lastName: string };

export type NutritionModuleId = "anthropometry" | "mealPlans" | "intake" | "foodDiary" | "anamnesis";

const LIST_PREVIEW_LIMIT = 10;

export default function NutritionChartWorkspace({
  titleKey,
  descKey,
  module,
}: {
  titleKey: string;
  descKey: string;
  module: NutritionModuleId;
}) {
  const { t } = useI18n();
  const [charts, setCharts] = useState<NutritionChart[]>([]);
  const [selected, setSelected] = useState<NutritionChart | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadCharts = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/professional/records");
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      const list: NutritionChart[] = data.records || [];
      setCharts(list);

      const { patientRecordId } = readChartDeepLink();
      if (patientRecordId) {
        const chart =
          list.find((c) => c.id === patientRecordId) ||
          (await fetchChartById(patientRecordId));
        if (chart) setSelected(chart);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCharts();
  }, [loadCharts]);

  const trimmedQuery = query.trim();
  const filtered = trimmedQuery
    ? charts.filter((c) =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(trimmedQuery.toLowerCase()),
      )
    : charts.slice(0, LIST_PREVIEW_LIMIT);

  const showListCounter = !trimmedQuery && charts.length > LIST_PREVIEW_LIMIT;

  function renderModule(chart: NutritionChart) {
    switch (module) {
      case "anthropometry":
        return <AnthropometryModule chart={chart} />;
      case "mealPlans":
        return <MealPlanModule chart={chart} />;
      case "intake":
        return <IntakeFormsModule chart={chart} />;
      case "anamnesis":
        return <NutritionAnamneseTabs chart={chart} />;
      case "foodDiary":
        return <FoodDiaryReviewModule chart={chart} />;
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <Link
        href="/nutricionista"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-amber-700 transition"
      >
        <ArrowLeft size={14} />
        {t("nutri.backToDashboard")}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t(titleKey)}</h1>
        <p className="text-slate-600 mt-2 leading-relaxed">{t(descKey)}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <label className="text-sm font-medium text-slate-700">{t("nutri.selectPatient")}</label>
        {selected ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
              <User size={16} className="text-amber-600" />
              {selected.firstName} {selected.lastName}
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-xs text-amber-700 hover:underline"
            >
              {t("nutri.changePatient")}
            </button>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("nutri.searchPatient")}
                className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2.5 text-sm"
              />
            </div>
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="animate-spin text-amber-500" size={22} />
              </div>
            ) : error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-center space-y-3">
                <p className="text-sm text-red-700">{t("nutri.charts.loadError")}</p>
                <button
                  type="button"
                  onClick={() => void loadCharts()}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-red-700 hover:text-red-900"
                >
                  <RefreshCw size={14} />
                  {t("nutri.charts.retry")}
                </button>
              </div>
            ) : charts.length === 0 ? (
              <NoPatientChartsEmptyState variant="amber" compact />
            ) : filtered.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">{t("pat.searchEmpty")}</p>
            ) : (
              <>
                {showListCounter && (
                  <p className="text-xs text-slate-500">
                    {t("nutri.charts.showing")
                      .replace("{shown}", String(LIST_PREVIEW_LIMIT))
                      .replace("{total}", String(charts.length))}
                  </p>
                )}
                <ul className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {filtered.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(c)}
                        className="w-full text-left px-2 py-2.5 text-sm hover:bg-amber-50 rounded-lg transition"
                      >
                        {c.firstName} {c.lastName}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>

      {selected && renderModule(selected)}
    </div>
  );
}
