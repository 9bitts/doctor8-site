"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { TacoFood } from "@/lib/nutrition/taco-foods";
import { macrosForPortion } from "@/lib/nutrition/taco-foods";
import type { MealPlanItem, MealPlanMeal } from "@/lib/nutrition/meal-plan-types";
import { sumMealPlanMacros } from "@/lib/nutrition/meal-plan-types";
import type { NutritionChart } from "./NutritionChartWorkspace";

type SavedPlan = {
  id: string;
  title: string;
  dailyKcalTarget: number | null;
  meals: MealPlanMeal[];
  createdAt: string;
};

const DEFAULT_MEALS = ["Café da manhã", "Almoço", "Jantar"];

export default function MealPlanModule({ chart }: { chart: NutritionChart }) {
  const { t } = useI18n();
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [dailyKcalTarget, setDailyKcalTarget] = useState("");
  const [meals, setMeals] = useState<MealPlanMeal[]>(
    DEFAULT_MEALS.map((name) => ({ name, items: [] })),
  );
  const [foodQuery, setFoodQuery] = useState("");
  const [foods, setFoods] = useState<TacoFood[]>([]);
  const [activeMealIdx, setActiveMealIdx] = useState(0);
  const [portionG, setPortionG] = useState("100");

  async function loadPlans() {
    setLoading(true);
    try {
      const res = await fetch(`/api/nutritionist/charts/${chart.id}/meal-plans`);
      const data = await res.json();
      setPlans(data.plans || []);
    } catch {
      setPlans([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadPlans();
  }, [chart.id]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/nutritionist/foods?q=${encodeURIComponent(foodQuery)}`);
        const data = await res.json();
        setFoods(data.foods || []);
      } catch {
        setFoods([]);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [foodQuery]);

  function addFood(food: TacoFood) {
    const g = parseFloat(portionG) || 100;
    const macros = macrosForPortion(food, g);
    const item: MealPlanItem = {
      foodId: food.id,
      foodName: food.name,
      portionG: g,
      ...macros,
    };
    setMeals((prev) =>
      prev.map((m, i) => (i === activeMealIdx ? { ...m, items: [...m.items, item] } : m)),
    );
    setFoodQuery("");
  }

  function removeItem(mealIdx: number, itemIdx: number) {
    setMeals((prev) =>
      prev.map((m, i) =>
        i === mealIdx ? { ...m, items: m.items.filter((_, j) => j !== itemIdx) } : m,
      ),
    );
  }

  const totals = sumMealPlanMacros(meals);

  async function handleSave() {
    setError("");
    if (!title.trim()) {
      setError(t("nutri.meal.needTitle"));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/nutritionist/charts/${chart.id}/meal-plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          dailyKcalTarget: dailyKcalTarget ? parseFloat(dailyKcalTarget) : undefined,
          meals,
        }),
      });
      if (!res.ok) {
        setError(t("nutri.error"));
        return;
      }
      setTitle("");
      setDailyKcalTarget("");
      setMeals(DEFAULT_MEALS.map((name) => ({ name, items: [] })));
      await loadPlans();
    } catch {
      setError(t("nutri.error"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-amber-500" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <h3 className="font-semibold text-slate-900">{t("nutri.meal.newPlan")}</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-600">{t("nutri.meal.title")}</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-600">{t("nutri.meal.targetKcal")}</span>
            <input
              type="number"
              value={dailyKcalTarget}
              onChange={(e) => setDailyKcalTarget(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          {meals.map((m, i) => (
            <button
              key={m.name}
              type="button"
              onClick={() => setActiveMealIdx(i)}
              className={`rounded-full px-3 py-1 text-xs font-medium border ${
                activeMealIdx === i
                  ? "bg-amber-600 text-white border-amber-600"
                  : "bg-white text-slate-600 border-slate-200"
              }`}
            >
              {m.name} ({m.items.length})
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2">
          <p className="text-xs font-medium text-slate-600">{t("nutri.meal.addFood")}</p>
          <div className="flex gap-2">
            <input
              value={foodQuery}
              onChange={(e) => setFoodQuery(e.target.value)}
              placeholder={t("nutri.meal.searchFood")}
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
            />
            <input
              type="number"
              value={portionG}
              onChange={(e) => setPortionG(e.target.value)}
              className="w-20 rounded-lg border border-slate-200 px-2 py-2 text-sm bg-white"
              title={t("nutri.meal.portionG")}
            />
          </div>
          {foods.length > 0 && (
            <ul className="max-h-36 overflow-y-auto divide-y divide-slate-100 bg-white rounded-lg border border-slate-200">
              {foods.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => addFood(f)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50"
                  >
                    {f.name}
                    <span className="text-slate-400 ml-2">{f.kcal} kcal/100g</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <ul className="space-y-2">
          {meals[activeMealIdx]?.items.map((item, idx) => (
            <li
              key={`${item.foodId}-${idx}`}
              className="flex items-center justify-between text-sm rounded-lg border border-slate-100 px-3 py-2"
            >
              <span>
                {item.foodName} — {item.portionG}g ({item.kcal} kcal)
              </span>
              <button type="button" onClick={() => removeItem(activeMealIdx, idx)} className="text-slate-400 hover:text-red-500">
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>

        <p className="text-sm text-slate-600">
          {t("nutri.meal.totals")}: {Math.round(totals.kcal)} kcal · P {totals.proteinG.toFixed(1)}g · C{" "}
          {totals.carbsG.toFixed(1)}g · G {totals.fatG.toFixed(1)}g
        </p>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl bg-amber-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2"
        >
          <Plus size={16} />
          {saving ? t("nutri.saving") : t("nutri.meal.savePlan")}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 font-semibold text-slate-900">
          {t("nutri.meal.plans")}
        </div>
        {plans.length === 0 ? (
          <p className="text-sm text-slate-500 p-6 text-center">{t("nutri.meal.noPlans")}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {plans.map((p) => {
              const planTotals = sumMealPlanMacros(p.meals as MealPlanMeal[]);
              return (
                <li key={p.id} className="px-4 py-3 text-sm">
                  <div className="font-medium text-slate-800">{p.title}</div>
                  <div className="text-slate-500 mt-1">
                    {new Date(p.createdAt).toLocaleDateString()} · {Math.round(planTotals.kcal)} kcal
                    {p.dailyKcalTarget ? ` / meta ${p.dailyKcalTarget}` : ""}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
