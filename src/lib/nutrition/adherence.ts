import type { MealPlanMeal } from "./meal-plan-types";

export type DiaryEntryLite = {
  mealType: string;
  recordedAt: string;
  hydrationMl: number | null;
};

export type AdherenceReport = {
  score: number;
  daysLogged: number;
  periodDays: number;
  expectedMealsPerDay: number;
  mealsLogged: number;
  hydrationMlAvg: number;
  lastEntryAt: string | null;
};

export function computeAdherence(
  activePlanMeals: MealPlanMeal[] | null,
  entries: DiaryEntryLite[],
  periodDays = 7,
): AdherenceReport {
  const cutoff = Date.now() - periodDays * 24 * 60 * 60 * 1000;
  const recent = entries.filter((e) => new Date(e.recordedAt).getTime() >= cutoff);

  const daysSet = new Set(
    recent.map((e) => new Date(e.recordedAt).toISOString().slice(0, 10)),
  );
  const daysLogged = daysSet.size;
  const expectedMealsPerDay = activePlanMeals?.length ?? 3;
  const targetMeals = expectedMealsPerDay * periodDays;
  const mealsLogged = recent.length;

  const hydrationEntries = recent.filter((e) => e.hydrationMl != null && e.hydrationMl > 0);
  const hydrationMlAvg =
    hydrationEntries.length > 0
      ? Math.round(
          hydrationEntries.reduce((s, e) => s + (e.hydrationMl ?? 0), 0) /
            hydrationEntries.length,
        )
      : 0;

  const dayScore = (daysLogged / periodDays) * 50;
  const mealScore = targetMeals > 0 ? Math.min(50, (mealsLogged / targetMeals) * 50) : 0;
  const score = Math.round(Math.min(100, dayScore + mealScore));

  const lastEntryAt =
    recent.length > 0
      ? recent.reduce((a, b) =>
          new Date(a.recordedAt) > new Date(b.recordedAt) ? a : b,
        ).recordedAt
      : null;

  return {
    score,
    daysLogged,
    periodDays,
    expectedMealsPerDay,
    mealsLogged,
    hydrationMlAvg,
    lastEntryAt,
  };
}
